class VisualMode extends Mode {
    constructor(editor) {
        super(editor);
        this.name = 'visual';
        this.type = 'char';
        this.selection = null;
        
        this.initializeKeymap();
    }

    enter() {
        super.enter();
        this.editor.setCursorStyle('block');
        this.selection = new Selection(
            this.editor.buffer,
            this.editor.cursor.getPosition()
        );
        this.updateStatus();
    }

    exit() {
        this.selection = null;
        this.editor.clearSelections();
    }

    setType(type) {
        this.type = type;
        this.updateStatus();
        
        if (type === 'line') {
            this.expandToLines();
        } else if (type === 'block') {
            this.startBlockSelection();
        }
    }

    initializeKeymap() {
        this.bindKeys({
            'Escape': () => this.exitToNormal(),
            'C-[': () => this.exitToNormal(),
            
            'h': () => this.extendSelection('left'),
            'j': () => this.extendSelection('down'),
            'k': () => this.extendSelection('up'),
            'l': () => this.extendSelection('right'),
            'w': () => this.extendSelection('word'),
            'b': () => this.extendSelection('wordBack'),
            'e': () => this.extendSelection('wordEnd'),
            '0': () => this.extendSelection('lineStart'),
            '^': () => this.extendSelection('firstNonWhitespace'),
            '$': () => this.extendSelection('lineEnd'),
            'g': () => this.handleG(),
            'G': () => this.extendSelection('bufferEnd'),
            
            'd': () => this.deleteSelection(),
            'x': () => this.deleteSelection(),
            'c': () => this.changeSelection(),
            's': () => this.changeSelection(),
            'y': () => this.yankSelection(),
            
            'o': () => this.swapAnchor(),
            'O': () => this.swapAnchorLine(),
            
            'v': () => this.switchToCharMode(),
            'V': () => this.switchToLineMode(),
            'C-v': () => this.switchToBlockMode(),
            
            'i': () => this.selectInner(),
            'a': () => this.selectAround(),
            
            '>': () => this.indentSelection(),
            '<': () => this.outdentSelection(),
            '=': () => this.formatSelection(),
            
            'u': () => this.lowercaseSelection(),
            'U': () => this.uppercaseSelection(),
            '~': () => this.toggleCaseSelection(),
            
            '/': () => this.searchInSelection(),
            ':': () => this.commandWithRange(),
            
            'J': () => this.joinLines(),
        });
    }

    exitToNormal() {
        this.editor.setMode('normal');
    }

    extendSelection(motion) {
        const cursor = this.editor.cursor.clone();
        
        switch (motion) {
            case 'left': cursor.moveLeft(); break;
            case 'right': cursor.moveRight(); break;
            case 'up': cursor.moveUp(); break;
            case 'down': cursor.moveDown(); break;
            case 'word': cursor.moveWordForward(); break;
            case 'wordBack': cursor.moveWordBackward(); break;
            case 'lineStart': cursor.moveToLineStart(); break;
            case 'lineEnd': cursor.moveToLineEnd(); break;
            case 'firstNonWhitespace': cursor.moveToFirstNonWhitespace(); break;
            case 'bufferStart': cursor.moveToBufferStart(); break;
            case 'bufferEnd': cursor.moveToBufferEnd(); break;
        }
        
        this.selection.setHead(cursor.getPosition());
        this.editor.cursor.moveToPosition(cursor.getPosition());
        
        if (this.type === 'line') {
            this.expandToLines();
        }
        
        this.updateSelection();
        this.editor.ensureCursorVisible();
    }

    expandToLines() {
        const start = this.selection.getStart();
        const end = this.selection.getEnd();
        
        this.selection.setAnchor({ row: start.row, col: 0 });
        this.selection.setHead({
            row: end.row,
            col: this.editor.buffer.getLine(end.row).length
        });
    }

    updateSelection() {
        this.editor.clearSelections();
        
        if (this.type === 'block') {
            this.updateBlockSelection();
        } else {
            this.editor.addSelection(this.selection);
        }
    }

    updateBlockSelection() {
        const anchor = this.selection.anchor;
        const head = this.selection.head;
        
        const startRow = Math.min(anchor.row, head.row);
        const endRow = Math.max(anchor.row, head.row);
        const startCol = Math.min(anchor.col, head.col);
        const endCol = Math.max(anchor.col, head.col);
        
        for (let row = startRow; row <= endRow; row++) {
            const line = this.editor.buffer.getLine(row);
            const lineStartCol = Math.min(startCol, line.length);
            const lineEndCol = Math.min(endCol, line.length);
            
            if (lineStartCol < lineEndCol) {
                const selection = new Selection(
                    this.editor.buffer,
                    { row, col: lineStartCol },
                    { row, col: lineEndCol }
                );
                this.editor.addSelection(selection);
            }
        }
    }

    deleteSelection() {
        const selections = this.type === 'block' ? 
            this.getBlockSelections() : [this.selection];
        
        this.editor.undoManager.beginGroup();
        
        for (const sel of selections.reverse()) {
            this.editor.deleteRange(sel.getStart(), sel.getEnd());
        }
        
        this.editor.undoManager.endGroup();
        this.exitToNormal();
    }

    changeSelection() {
        this.deleteSelection();
        this.editor.setMode('insert');
    }

    yankSelection() {
        const text = this.selection.getText();
        this.editor.setRegister('"', text, this.type === 'line' ? 'line' : 'char');
        this.exitToNormal();
    }

    swapAnchor() {
        const temp = this.selection.anchor;
        this.selection.anchor = this.selection.head;
        this.selection.head = temp;
        this.editor.cursor.moveToPosition(this.selection.head);
        this.updateSelection();
    }

    indentSelection() {
        const start = this.selection.getStart();
        const end = this.selection.getEnd();
        
        this.editor.undoManager.beginGroup();
        
        for (let row = start.row; row <= end.row; row++) {
            const cursor = new Cursor(this.editor.buffer, row, 0);
            const savedPos = cursor.getPosition();
            this.editor.insertTextAt(savedPos, '    ');
        }
        
        this.editor.undoManager.endGroup();
        this.updateSelection();
    }

    outdentSelection() {
        const start = this.selection.getStart();
        const end = this.selection.getEnd();
        
        this.editor.undoManager.beginGroup();
        
        for (let row = start.row; row <= end.row; row++) {
            const line = this.editor.buffer.getLine(row);
            let removeCount = 0;
            
            if (line.startsWith('\t')) {
                removeCount = 1;
            } else {
                for (let i = 0; i < 4 && i < line.length && line[i] === ' '; i++) {
                    removeCount++;
                }
            }
            
            if (removeCount > 0) {
                this.editor.deleteRange(
                    { row, col: 0 },
                    { row, col: removeCount }
                );
            }
        }
        
        this.editor.undoManager.endGroup();
        this.updateSelection();
    }

    uppercaseSelection() {
        this.transformSelection(text => text.toUpperCase());
    }

    lowercaseSelection() {
        this.transformSelection(text => text.toLowerCase());
    }

    toggleCaseSelection() {
        this.transformSelection(text => {
            return text.split('').map(char => {
                return char === char.toUpperCase() ?
                    char.toLowerCase() : char.toUpperCase();
            }).join('');
        });
    }

    transformSelection(transformer) {
        const start = this.selection.getStart();
        const end = this.selection.getEnd();
        const text = this.selection.getText();
        const transformed = transformer(text);
        
        this.editor.undoManager.beginGroup();
        this.editor.deleteRange(start, end);
        this.editor.insertText(transformed);
        this.editor.undoManager.endGroup();
        
        this.exitToNormal();
    }

    switchToCharMode() {
        if (this.type !== 'char') {
            this.type = 'char';
            this.updateStatus();
            this.updateSelection();
        }
    }

    switchToLineMode() {
        if (this.type !== 'line') {
            this.type = 'line';
            this.expandToLines();
            this.updateStatus();
            this.updateSelection();
        }
    }

    switchToBlockMode() {
        if (this.type !== 'block') {
            this.type = 'block';
            this.updateStatus();
            this.updateSelection();
        }
    }

    getBlockSelections() {
        const selections = [];
        const elements = this.editor.renderer.selectionElements;
        
        for (const element of elements) {
            selections.push(element.selection);
        }
        
        return selections;
    }

    updateStatus() {
        const modeName = {
            'char': '-- VISUAL --',
            'line': '-- VISUAL LINE --',
            'block': '-- VISUAL BLOCK --'
        };
        
        this.setStatusText(modeName[this.type]);
    }
}