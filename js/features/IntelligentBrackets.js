class IntelligentBrackets {
    constructor(editor) {
        this.editor = editor;
        this.enabled = true;
        this.brackets = new Map([
            ['(', ')'],
            ['[', ']'],
            ['{', '}'],
            ['<', '>']
        ]);
        this.quotes = new Set(['"', "'", '`']);
        this.animationDuration = 300;
        this.highlightedPairs = new Map();
        
        this.initialize();
    }
    
    initialize() {
        this.createHighlightElements();
        this.setupEventHandlers();
    }
    
    createHighlightElements() {
        this.highlightContainer = document.createElement('div');
        this.highlightContainer.className = 'bracket-highlights';
        document.getElementById('editor-viewport').appendChild(this.highlightContainer);
        
        // Create animation styles
        const style = document.createElement('style');
        style.textContent = `
            .bracket-highlight {
                position: absolute;
                pointer-events: none;
                border: 2px solid transparent;
                border-radius: 2px;
                transition: all ${this.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .bracket-highlight.opening {
                border-color: #4fc3f7;
                background: rgba(79, 195, 247, 0.1);
                animation: bracketPulse 0.5s ease-out;
            }
            
            .bracket-highlight.closing {
                border-color: #81c784;
                background: rgba(129, 199, 132, 0.1);
                animation: bracketPulse 0.5s ease-out;
            }
            
            .bracket-highlight.unmatched {
                border-color: #e57373;
                background: rgba(229, 115, 115, 0.2);
                animation: bracketShake 0.3s ease-out;
            }
            
            .bracket-highlight.rainbow-1 { border-color: #e91e63; }
            .bracket-highlight.rainbow-2 { border-color: #9c27b0; }
            .bracket-highlight.rainbow-3 { border-color: #3f51b5; }
            .bracket-highlight.rainbow-4 { border-color: #2196f3; }
            .bracket-highlight.rainbow-5 { border-color: #00bcd4; }
            .bracket-highlight.rainbow-6 { border-color: #4caf50; }
            
            .bracket-connection {
                position: absolute;
                pointer-events: none;
                stroke-width: 2;
                fill: none;
                opacity: 0.3;
                transition: opacity 0.3s ease;
            }
            
            .bracket-connection:hover {
                opacity: 0.6;
            }
            
            @keyframes bracketPulse {
                0% {
                    transform: scale(1);
                    opacity: 0;
                }
                50% {
                    transform: scale(1.2);
                    opacity: 1;
                }
                100% {
                    transform: scale(1);
                    opacity: 1;
                }
            }
            
            @keyframes bracketShake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-3px); }
                75% { transform: translateX(3px); }
            }
        `;
        document.head.appendChild(style);
        
        // Create SVG for connection lines
        this.connectionSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.connectionSvg.style.position = 'absolute';
        this.connectionSvg.style.top = '0';
        this.connectionSvg.style.left = '0';
        this.connectionSvg.style.width = '100%';
        this.connectionSvg.style.height = '100%';
        this.connectionSvg.style.pointerEvents = 'none';
        this.highlightContainer.appendChild(this.connectionSvg);
    }
    
    setupEventHandlers() {
        // Handle cursor movement
        this.editor.cursor.on('move', () => {
            if (this.enabled) {
                this.updateBracketHighlights();
            }
        });
        
        // Handle text input
        this.editor.on('beforeInsert', (text) => {
            if (this.enabled && this.shouldAutoComplete(text)) {
                return this.handleAutoComplete(text);
            }
            return text;
        });
        
        // Handle backspace
        this.editor.on('beforeDelete', (range) => {
            if (this.enabled) {
                return this.handleDelete(range);
            }
            return range;
        });
        
        // Update on scroll
        this.editor.renderer.on('scroll', () => {
            this.updateHighlightPositions();
        });
        
        // Update on buffer change
        this.editor.buffer.on('change', () => {
            this.clearHighlights();
            this.updateBracketHighlights();
        });
    }
    
    shouldAutoComplete(text) {
        return text.length === 1 && (this.brackets.has(text) || this.quotes.has(text));
    }
    
    handleAutoComplete(text) {
        const cursor = this.editor.cursor;
        const buffer = this.editor.buffer;
        const line = buffer.getLine(cursor.row);
        const charAfter = line[cursor.col] || '';
        
        if (this.brackets.has(text)) {
            const closing = this.brackets.get(text);
            
            // Don't auto-complete if next character is alphanumeric
            if (/\w/.test(charAfter)) {
                return text;
            }
            
            // Insert both brackets and position cursor between them
            this.editor.undoManager.beginGroup();
            buffer.insert(cursor.getPosition(), text + closing);
            cursor.moveRight();
            this.editor.undoManager.endGroup();
            
            // Animate the bracket pair
            this.animateBracketInsertion(cursor.getPosition());
            
            return ''; // Prevent default insertion
        }
        
        if (this.quotes.has(text)) {
            // Check if we're closing a quote
            if (charAfter === text && this.isInsideQuote(cursor.getPosition(), text)) {
                cursor.moveRight();
                return ''; // Just move past the closing quote
            }
            
            // Auto-complete quote
            if (!/\w/.test(charAfter)) {
                this.editor.undoManager.beginGroup();
                buffer.insert(cursor.getPosition(), text + text);
                cursor.moveRight();
                this.editor.undoManager.endGroup();
                
                return ''; // Prevent default insertion
            }
        }
        
        return text;
    }
    
    handleDelete(range) {
        const cursor = this.editor.cursor;
        const buffer = this.editor.buffer;
        const pos = cursor.getPosition();
        
        if (pos.col > 0) {
            const line = buffer.getLine(pos.row);
            const charBefore = line[pos.col - 1];
            const charAfter = line[pos.col];
            
            // Check if we're between a bracket pair or quotes
            if (this.brackets.has(charBefore) && this.brackets.get(charBefore) === charAfter) {
                // Delete both brackets
                this.editor.undoManager.beginGroup();
                buffer.delete({ row: pos.row, col: pos.col - 1 }, { row: pos.row, col: pos.col + 1 });
                cursor.moveLeft();
                this.editor.undoManager.endGroup();
                
                return null; // Prevent default deletion
            }
            
            if (this.quotes.has(charBefore) && charBefore === charAfter) {
                // Delete both quotes
                this.editor.undoManager.beginGroup();
                buffer.delete({ row: pos.row, col: pos.col - 1 }, { row: pos.row, col: pos.col + 1 });
                cursor.moveLeft();
                this.editor.undoManager.endGroup();
                
                return null; // Prevent default deletion
            }
        }
        
        return range;
    }
    
    updateBracketHighlights() {
        this.clearHighlights();
        
        const cursor = this.editor.cursor;
        const buffer = this.editor.buffer;
        const pos = cursor.getPosition();
        const line = buffer.getLine(pos.row);
        
        // Check character at cursor and before cursor
        const charAtCursor = line[pos.col];
        const charBeforeCursor = pos.col > 0 ? line[pos.col - 1] : '';
        
        let bracketPos = null;
        let bracket = null;
        
        if (this.isBracket(charAtCursor)) {
            bracketPos = pos;
            bracket = charAtCursor;
        } else if (this.isBracket(charBeforeCursor)) {
            bracketPos = { row: pos.row, col: pos.col - 1 };
            bracket = charBeforeCursor;
        }
        
        if (bracketPos && bracket) {
            const matchingPos = this.findMatchingBracket(bracketPos, bracket);
            
            if (matchingPos) {
                const depth = this.getBracketDepth(bracketPos, bracket);
                this.highlightBracketPair(bracketPos, matchingPos, depth);
                this.drawConnection(bracketPos, matchingPos, depth);
            } else {
                this.highlightUnmatchedBracket(bracketPos);
            }
        }
        
        // Also highlight all visible bracket pairs with rainbow colors
        this.highlightVisibleBrackets();
    }
    
    isBracket(char) {
        return this.brackets.has(char) || [...this.brackets.values()].includes(char);
    }
    
    isOpeningBracket(char) {
        return this.brackets.has(char);
    }
    
    isClosingBracket(char) {
        return [...this.brackets.values()].includes(char);
    }
    
    getMatchingBracket(bracket) {
        if (this.brackets.has(bracket)) {
            return this.brackets.get(bracket);
        }
        
        for (const [open, close] of this.brackets) {
            if (close === bracket) {
                return open;
            }
        }
        
        return null;
    }
    
    findMatchingBracket(pos, bracket) {
        const buffer = this.editor.buffer;
        const isOpening = this.isOpeningBracket(bracket);
        const matching = this.getMatchingBracket(bracket);
        
        if (!matching) return null;
        
        let count = 1;
        let row = pos.row;
        let col = pos.col + (isOpening ? 1 : -1);
        
        while (row >= 0 && row < buffer.getLineCount()) {
            const line = buffer.getLine(row);
            
            while ((isOpening && col < line.length) || (!isOpening && col >= 0)) {
                const char = line[col];
                
                if (char === bracket) {
                    count++;
                } else if (char === matching) {
                    count--;
                    if (count === 0) {
                        return { row, col };
                    }
                }
                
                col += isOpening ? 1 : -1;
            }
            
            row += isOpening ? 1 : -1;
            if (row >= 0 && row < buffer.getLineCount()) {
                const nextLine = buffer.getLine(row);
                col = isOpening ? 0 : nextLine.length - 1;
            }
        }
        
        return null;
    }
    
    getBracketDepth(pos, bracket) {
        const buffer = this.editor.buffer;
        let depth = 0;
        
        // Count bracket depth from start of file to current position
        for (let row = 0; row <= pos.row; row++) {
            const line = buffer.getLine(row);
            const endCol = row === pos.row ? pos.col : line.length;
            
            for (let col = 0; col < endCol; col++) {
                const char = line[col];
                if (this.isOpeningBracket(char)) {
                    depth++;
                } else if (this.isClosingBracket(char)) {
                    depth--;
                }
            }
        }
        
        return Math.max(0, depth);
    }
    
    highlightBracketPair(pos1, pos2, depth) {
        const colorClass = `rainbow-${(depth % 6) + 1}`;
        
        const highlight1 = this.createHighlight(pos1, 'opening', colorClass);
        const highlight2 = this.createHighlight(pos2, 'closing', colorClass);
        
        this.highlightedPairs.set(`${pos1.row},${pos1.col}`, highlight1);
        this.highlightedPairs.set(`${pos2.row},${pos2.col}`, highlight2);
        
        // Animate highlights
        requestAnimationFrame(() => {
            highlight1.style.opacity = '1';
            highlight2.style.opacity = '1';
        });
    }
    
    highlightUnmatchedBracket(pos) {
        const highlight = this.createHighlight(pos, 'unmatched');
        this.highlightedPairs.set(`${pos.row},${pos.col}`, highlight);
    }
    
    createHighlight(pos, type, additionalClass = '') {
        const highlight = document.createElement('div');
        highlight.className = `bracket-highlight ${type} ${additionalClass}`;
        
        const renderer = this.editor.renderer;
        const x = pos.col * renderer.charWidth - renderer.viewport.scrollLeft;
        const y = pos.row * renderer.lineHeight - renderer.viewport.scrollTop;
        
        highlight.style.left = x + 'px';
        highlight.style.top = y + 'px';
        highlight.style.width = renderer.charWidth + 'px';
        highlight.style.height = renderer.lineHeight + 'px';
        highlight.style.opacity = '0';
        
        this.highlightContainer.appendChild(highlight);
        
        return highlight;
    }
    
    drawConnection(pos1, pos2, depth) {
        const renderer = this.editor.renderer;
        
        const x1 = (pos1.col + 0.5) * renderer.charWidth - renderer.viewport.scrollLeft;
        const y1 = (pos1.row + 0.5) * renderer.lineHeight - renderer.viewport.scrollTop;
        const x2 = (pos2.col + 0.5) * renderer.charWidth - renderer.viewport.scrollLeft;
        const y2 = (pos2.row + 0.5) * renderer.lineHeight - renderer.viewport.scrollTop;
        
        // Create curved path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('bracket-connection', `rainbow-${(depth % 6) + 1}`);
        
        // Calculate control points for bezier curve
        const dx = x2 - x1;
        const dy = y2 - y1;
        const cx1 = x1 + dx * 0.3;
        const cy1 = y1;
        const cx2 = x2 - dx * 0.3;
        const cy2 = y2;
        
        const d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
        path.setAttribute('d', d);
        
        this.connectionSvg.appendChild(path);
    }
    
    highlightVisibleBrackets() {
        const renderer = this.editor.renderer;
        const buffer = this.editor.buffer;
        
        const firstLine = Math.floor(renderer.viewport.scrollTop / renderer.lineHeight);
        const lastLine = Math.min(
            firstLine + renderer.viewport.visibleLines + 1,
            buffer.getLineCount()
        );
        
        const bracketStack = [];
        
        for (let row = firstLine; row < lastLine; row++) {
            const line = buffer.getLine(row);
            
            for (let col = 0; col < line.length; col++) {
                const char = line[col];
                
                if (this.isOpeningBracket(char)) {
                    bracketStack.push({ char, pos: { row, col } });
                } else if (this.isClosingBracket(char)) {
                    const matching = this.getMatchingBracket(char);
                    
                    // Find matching opening bracket in stack
                    for (let i = bracketStack.length - 1; i >= 0; i--) {
                        if (bracketStack[i].char === matching) {
                            const openPos = bracketStack[i].pos;
                            const closePos = { row, col };
                            
                            // Only highlight if not already highlighted
                            const key1 = `${openPos.row},${openPos.col}`;
                            const key2 = `${closePos.row},${closePos.col}`;
                            
                            if (!this.highlightedPairs.has(key1) && !this.highlightedPairs.has(key2)) {
                                const depth = i;
                                this.highlightBracketPair(openPos, closePos, depth);
                            }
                            
                            bracketStack.splice(i, 1);
                            break;
                        }
                    }
                }
            }
        }
    }
    
    animateBracketInsertion(pos) {
        const highlight = this.createHighlight(pos, 'opening');
        
        setTimeout(() => {
            highlight.style.transform = 'scale(1.5)';
            highlight.style.opacity = '1';
        }, 10);
        
        setTimeout(() => {
            highlight.style.transform = 'scale(1)';
        }, this.animationDuration / 2);
        
        setTimeout(() => {
            highlight.remove();
        }, this.animationDuration);
    }
    
    isInsideQuote(pos, quote) {
        const buffer = this.editor.buffer;
        const line = buffer.getLine(pos.row);
        let count = 0;
        
        for (let i = 0; i < pos.col; i++) {
            if (line[i] === quote) {
                count++;
            }
        }
        
        return count % 2 === 1;
    }
    
    updateHighlightPositions() {
        const renderer = this.editor.renderer;
        
        this.highlightedPairs.forEach((highlight, key) => {
            const [row, col] = key.split(',').map(Number);
            
            const x = col * renderer.charWidth - renderer.viewport.scrollLeft;
            const y = row * renderer.lineHeight - renderer.viewport.scrollTop;
            
            highlight.style.left = x + 'px';
            highlight.style.top = y + 'px';
        });
        
        // Update SVG dimensions
        this.connectionSvg.style.width = renderer.viewport.width + 'px';
        this.connectionSvg.style.height = renderer.viewport.height + 'px';
    }
    
    clearHighlights() {
        this.highlightedPairs.forEach(highlight => highlight.remove());
        this.highlightedPairs.clear();
        
        // Clear connection lines
        while (this.connectionSvg.firstChild) {
            this.connectionSvg.removeChild(this.connectionSvg.firstChild);
        }
    }
    
    toggle() {
        this.enabled = !this.enabled;
        
        if (this.enabled) {
            this.updateBracketHighlights();
        } else {
            this.clearHighlights();
        }
        
        this.editor.showMessage(`Intelligent brackets ${this.enabled ? 'enabled' : 'disabled'}`);
    }
}