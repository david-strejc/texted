class NormalMode extends Mode {
    constructor(editor) {
        super(editor);
        this.name = 'normal';
        this.count = '';
        this.operator = null;
        this.register = '"';
        
        this.initializeKeymap();
    }

    enter() {
        super.enter();
        this.editor.setCursorStyle('block');
        this.resetState();
    }

    resetState() {
        this.count = '';
        this.operator = null;
        this.setStatusText('');
    }

    initializeKeymap() {
        this.bindKeys({
            'h': () => this.motion('left'),
            'j': () => this.motion('down'),
            'k': () => this.motion('up'),
            'l': () => this.motion('right'),
            'w': () => this.motion('word'),
            'b': () => this.motion('wordBack'),
            'e': () => this.motion('wordEnd'),
            '0': () => this.handleZero(),
            '^': () => this.motion('firstNonWhitespace'),
            '$': () => this.motion('lineEnd'),
            'g': () => this.handleG(),
            'G': () => this.motion('bufferEnd'),
            
            'i': () => this.enterInsertMode('before'),
            'I': () => this.enterInsertMode('lineStart'),
            'a': () => this.enterInsertMode('after'),
            'A': () => this.enterInsertMode('lineEnd'),
            'o': () => this.enterInsertMode('newLineBelow'),
            'O': () => this.enterInsertMode('newLineAbove'),
            's': () => this.substitute(),
            'S': () => this.substituteLine(),
            'c': () => this.setOperator('change'),
            'C': () => this.changeLine(),
            
            'd': () => this.setOperator('delete'),
            'D': () => this.deleteLine(),
            'x': () => this.deleteChar(),
            'X': () => this.deleteCharBefore(),
            
            'y': () => this.setOperator('yank'),
            'Y': () => this.yankLine(),
            'p': () => this.paste('after'),
            'P': () => this.paste('before'),
            
            'u': () => this.undo(),
            'C-r': () => this.redo(),
            
            'v': () => this.enterVisualMode('char'),
            'V': () => this.enterVisualMode('line'),
            'C-v': () => this.enterVisualMode('block'),
            
            '/': () => this.search('forward'),
            '?': () => this.search('backward'),
            'n': () => this.searchNext(),
            'N': () => this.searchPrevious(),
            '*': () => this.searchWord('forward'),
            '#': () => this.searchWord('backward'),
            
            ':': () => this.enterCommandMode(),
            
            '.': () => this.repeatLastChange(),
            'q': () => this.recordMacro(),
            '@': () => this.playMacro(),
            
            'z': () => this.handleZ(),
            'm': () => this.setMark(),
            "'": () => this.jumpToMark(),
            
            'C-d': () => this.scroll('halfDown'),
            'C-u': () => this.scroll('halfUp'),
            'C-f': () => this.scroll('pageDown'),
            'C-b': () => this.scroll('pageUp'),
            
            'Escape': () => this.resetState(),
            
            '1': () => this.appendCount('1'),
            '2': () => this.appendCount('2'),
            '3': () => this.appendCount('3'),
            '4': () => this.appendCount('4'),
            '5': () => this.appendCount('5'),
            '6': () => this.appendCount('6'),
            '7': () => this.appendCount('7'),
            '8': () => this.appendCount('8'),
            '9': () => this.appendCount('9'),
        });
    }

    motion(type) {
        const count = this.getCount();
        const cursor = this.editor.cursor;
        
        switch (type) {
            case 'left': cursor.moveLeft(count); break;
            case 'right': cursor.moveRight(count); break;
            case 'up': cursor.moveUp(count); break;
            case 'down': cursor.moveDown(count); break;
            case 'word': 
                for (let i = 0; i < count; i++) cursor.moveWordForward();
                break;
            case 'wordBack':
                for (let i = 0; i < count; i++) cursor.moveWordBackward();
                break;
            case 'lineStart': cursor.moveToLineStart(); break;
            case 'lineEnd': cursor.moveToLineEnd(); break;
            case 'firstNonWhitespace': cursor.moveToFirstNonWhitespace(); break;
            case 'bufferStart': cursor.moveToBufferStart(); break;
            case 'bufferEnd': cursor.moveToBufferEnd(); break;
        }
        
        if (this.operator) {
            this.executeOperator(cursor.getPosition());
        }
        
        this.resetState();
        this.editor.ensureCursorVisible();
    }

    handleZero() {
        if (this.count) {
            this.appendCount('0');
        } else {
            this.motion('lineStart');
        }
    }

    handleG() {
        if (this.count) {
            this.editor.cursor.moveToLine(parseInt(this.count));
            this.resetState();
        } else {
            this.setStatusText('g');
        }
    }

    handleZ() {
        this.setStatusText('z');
    }

    appendCount(digit) {
        this.count += digit;
        this.updateStatus();
    }

    getCount() {
        return parseInt(this.count) || 1;
    }

    setOperator(op) {
        this.operator = op;
        this.operatorStart = this.editor.cursor.getPosition();
        this.updateStatus();
    }

    executeOperator(endPos) {
        const start = this.operatorStart;
        const end = endPos;
        
        switch (this.operator) {
            case 'delete':
                this.editor.deleteRange(start, end);
                break;
            case 'change':
                this.editor.deleteRange(start, end);
                this.editor.setMode('insert');
                break;
            case 'yank':
                this.editor.yankRange(start, end);
                break;
        }
    }

    enterInsertMode(position) {
        const cursor = this.editor.cursor;
        
        switch (position) {
            case 'after':
                if (cursor.col < this.editor.buffer.getLine(cursor.row).length) {
                    cursor.moveRight();
                }
                break;
            case 'lineStart':
                cursor.moveToFirstNonWhitespace();
                break;
            case 'lineEnd':
                cursor.moveToLineEnd();
                break;
            case 'newLineBelow':
                cursor.moveToLineEnd();
                this.editor.insertText('\n');
                break;
            case 'newLineAbove':
                cursor.moveToLineStart();
                this.editor.insertText('\n');
                cursor.moveUp();
                break;
        }
        
        this.editor.setMode('insert');
    }

    enterVisualMode(type) {
        this.editor.setMode('visual');
        // Visual mode will handle the type in its enter() method
    }

    enterCommandMode() {
        this.editor.setMode('command');
    }

    deleteChar() {
        const count = this.getCount();
        const cursor = this.editor.cursor;
        const pos = cursor.getPosition();
        const line = this.editor.buffer.getLine(pos.row);
        
        if (pos.col < line.length) {
            const endCol = Math.min(pos.col + count, line.length);
            this.editor.deleteRange(pos, { row: pos.row, col: endCol });
        }
        
        this.resetState();
    }

    undo() {
        this.editor.undo();
        this.resetState();
    }

    redo() {
        this.editor.redo();
        this.resetState();
    }

    updateStatus() {
        let status = '';
        if (this.count) status += this.count;
        if (this.operator) status += this.operator[0];
        this.setStatusText(status);
    }

    substitute() {
        const cursor = this.editor.cursor;
        const pos = cursor.getPosition();
        const line = this.editor.buffer.getLine(pos.row);
        
        if (pos.col < line.length) {
            this.editor.buffer.delete(pos, { row: pos.row, col: pos.col + 1 });
        }
        
        this.enterInsertMode('before');
    }

    substituteLine() {
        const cursor = this.editor.cursor;
        const row = cursor.row;
        
        cursor.moveToLineStart();
        cursor.moveToFirstNonWhitespace();
        
        const startPos = cursor.getPosition();
        cursor.moveToLineEnd();
        const endPos = cursor.getPosition();
        
        if (startPos.col < endPos.col) {
            this.editor.buffer.delete(startPos, endPos);
        }
        
        this.enterInsertMode('before');
    }

    changeLine() {
        const cursor = this.editor.cursor;
        const pos = cursor.getPosition();
        
        cursor.moveToLineEnd();
        const endPos = cursor.getPosition();
        
        if (pos.col < endPos.col) {
            this.editor.buffer.delete(pos, endPos);
        }
        
        this.enterInsertMode('after');
    }

    deleteLine() {
        const cursor = this.editor.cursor;
        const pos = cursor.getPosition();
        
        cursor.moveToLineEnd();
        const endPos = cursor.getPosition();
        
        if (pos.col < endPos.col) {
            this.editor.deleteRange(pos, endPos);
        }
    }

    yankLine() {
        const cursor = this.editor.cursor;
        const row = cursor.row;
        const line = this.editor.buffer.getLine(row);
        
        this.editor.setRegister(this.register, line, 'line');
    }

    deleteChar() {
        const cursor = this.editor.cursor;
        const pos = cursor.getPosition();
        const line = this.editor.buffer.getLine(pos.row);
        
        if (pos.col < line.length) {
            this.editor.deleteRange(pos, { row: pos.row, col: pos.col + 1 });
        }
    }

    deleteCharBefore() {
        const cursor = this.editor.cursor;
        const pos = cursor.getPosition();
        
        if (pos.col > 0) {
            cursor.moveLeft();
            this.deleteChar();
        }
    }


    search(direction) {
        // TODO: Implement search
        this.editor.showMessage(`Search ${direction} not yet implemented`);
    }

    searchNext() {
        // TODO: Implement search next
        this.editor.showMessage('Search next not yet implemented');
    }

    searchPrevious() {
        // TODO: Implement search previous
        this.editor.showMessage('Search previous not yet implemented');
    }

    searchWord(direction) {
        // TODO: Implement search word
        this.editor.showMessage(`Search word ${direction} not yet implemented`);
    }

    repeatLastChange() {
        // TODO: Implement repeat last change
        this.editor.showMessage('Repeat last change not yet implemented');
    }

    recordMacro() {
        // TODO: Implement macro recording
        this.editor.showMessage('Macro recording not yet implemented');
    }

    playMacro() {
        // TODO: Implement macro playback
        this.editor.showMessage('Macro playback not yet implemented');
    }

    setMark() {
        // TODO: Implement marks
        this.editor.showMessage('Marks not yet implemented');
    }

    jumpToMark() {
        // TODO: Implement mark jumping
        this.editor.showMessage('Jump to mark not yet implemented');
    }

    scroll(type) {
        const renderer = this.editor.renderer;
        
        switch (type) {
            case 'halfDown':
                renderer.scroll('down', renderer.viewport.height / 2);
                break;
            case 'halfUp':
                renderer.scroll('up', renderer.viewport.height / 2);
                break;
            case 'pageDown':
                renderer.scroll('down', renderer.viewport.height);
                break;
            case 'pageUp':
                renderer.scroll('up', renderer.viewport.height);
                break;
        }
    }

    paste(position) {
        this.editor.paste(this.register, position === 'after');
    }
}