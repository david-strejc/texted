class MultiCursor {
    constructor(editor) {
        this.editor = editor;
        this.cursors = [];
        this.active = false;
        this.primaryCursor = null;
        
        this.setupUI();
        this.bindEvents();
    }
    
    setupUI() {
        this.cursorContainer = document.createElement('div');
        this.cursorContainer.className = 'multi-cursor-container';
        document.body.appendChild(this.cursorContainer);
    }
    
    bindEvents() {
        // Alt+Click to add cursor
        this.editor.canvas.addEventListener('mousedown', (e) => {
            if (e.altKey && this.active) {
                e.preventDefault();
                const pos = this.editor.renderer.screenToBuffer({
                    x: e.offsetX,
                    y: e.offsetY
                });
                if (pos) {
                    this.addCursor(pos);
                }
            }
        });
        
        // Ctrl+Alt+Up/Down to add cursor above/below
        document.addEventListener('keydown', (e) => {
            if (this.active && e.ctrlKey && e.altKey) {
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.addCursorAbove();
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.addCursorBelow();
                }
            }
        });
    }
    
    toggle() {
        this.active = !this.active;
        
        if (this.active) {
            this.primaryCursor = {
                row: this.editor.cursor.row,
                col: this.editor.cursor.col
            };
            this.cursors = [{ ...this.primaryCursor }];
            this.editor.showMessage('Multi-cursor mode: Alt+Click or Ctrl+Alt+↑/↓ to add cursors');
        } else {
            this.clear();
            this.editor.showMessage('Multi-cursor mode disabled');
        }
        
        this.render();
    }
    
    addCursor(pos) {
        // Prevent duplicate cursors at same position
        const exists = this.cursors.some(c => c.row === pos.row && c.col === pos.col);
        if (!exists) {
            this.cursors.push({ ...pos });
            this.render();
        }
    }
    
    addCursorAbove() {
        const lastCursor = this.cursors[this.cursors.length - 1];
        if (lastCursor.row > 0) {
            this.addCursor({
                row: lastCursor.row - 1,
                col: Math.min(lastCursor.col, this.editor.buffer.getLine(lastCursor.row - 1).length)
            });
        }
    }
    
    addCursorBelow() {
        const lastCursor = this.cursors[this.cursors.length - 1];
        if (lastCursor.row < this.editor.buffer.getLineCount() - 1) {
            this.addCursor({
                row: lastCursor.row + 1,
                col: Math.min(lastCursor.col, this.editor.buffer.getLine(lastCursor.row + 1).length)
            });
        }
    }
    
    handleInput(text) {
        if (!this.active || this.cursors.length === 0) return false;
        
        this.editor.undoManager.beginGroup();
        
        // Sort cursors by position (right to left, bottom to top) to avoid offset issues
        const sortedCursors = [...this.cursors].sort((a, b) => {
            if (a.row !== b.row) return b.row - a.row;
            return b.col - a.col;
        });
        
        // Insert text at each cursor position
        sortedCursors.forEach(cursor => {
            this.editor.buffer.insert(cursor, text);
            // Update cursor position
            cursor.col += text.length;
        });
        
        this.editor.undoManager.endGroup();
        
        // Update primary cursor
        const primary = this.cursors.find(c => 
            c.row === this.primaryCursor.row && c.col === this.primaryCursor.col
        );
        if (primary) {
            this.editor.cursor.moveToPosition(primary);
        }
        
        this.render();
        return true;
    }
    
    handleDelete() {
        if (!this.active || this.cursors.length === 0) return false;
        
        this.editor.undoManager.beginGroup();
        
        // Sort cursors by position (right to left, bottom to top)
        const sortedCursors = [...this.cursors].sort((a, b) => {
            if (a.row !== b.row) return b.row - a.row;
            return b.col - a.col;
        });
        
        sortedCursors.forEach(cursor => {
            if (cursor.col > 0) {
                this.editor.buffer.delete(
                    { row: cursor.row, col: cursor.col - 1 },
                    cursor
                );
                cursor.col--;
            } else if (cursor.row > 0) {
                // Handle deletion at start of line
                const prevLineLen = this.editor.buffer.getLine(cursor.row - 1).length;
                this.editor.buffer.delete(
                    { row: cursor.row - 1, col: prevLineLen },
                    cursor
                );
                cursor.row--;
                cursor.col = prevLineLen;
            }
        });
        
        this.editor.undoManager.endGroup();
        
        // Update primary cursor
        const primary = this.cursors.find(c => 
            c.row === this.primaryCursor.row && c.col === this.primaryCursor.col
        );
        if (primary) {
            this.editor.cursor.moveToPosition(primary);
        }
        
        this.render();
        return true;
    }
    
    clear() {
        this.cursors = [];
        this.cursorContainer.innerHTML = '';
    }
    
    render() {
        this.cursorContainer.innerHTML = '';
        
        if (!this.active) return;
        
        this.cursors.forEach((cursor, index) => {
            const screenPos = this.editor.renderer.bufferToScreen(cursor);
            if (!screenPos) return;
            
            const cursorEl = document.createElement('div');
            cursorEl.className = 'multi-cursor';
            if (index === 0) cursorEl.classList.add('primary');
            
            cursorEl.style.left = `${screenPos.x}px`;
            cursorEl.style.top = `${screenPos.y}px`;
            cursorEl.style.height = `${this.editor.renderer.lineHeight}px`;
            
            // Add cursor number
            const label = document.createElement('div');
            label.className = 'multi-cursor-label';
            label.textContent = index + 1;
            cursorEl.appendChild(label);
            
            this.cursorContainer.appendChild(cursorEl);
        });
    }
    
    updateCursorPositions() {
        if (!this.active) return;
        
        // Update all cursor positions based on text changes
        this.cursors.forEach(cursor => {
            const lineLength = this.editor.buffer.getLine(cursor.row).length;
            cursor.col = Math.min(cursor.col, lineLength);
        });
        
        this.render();
    }
}