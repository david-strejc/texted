class InsertMode extends Mode {
    constructor(editor) {
        super(editor);
        this.name = 'insert';
        this.completion = null;
        this.snippetManager = null;
        
        this.initializeKeymap();
    }

    enter() {
        super.enter();
        this.editor.setCursorStyle('line');
        this.setStatusText('-- INSERT --');
    }

    exit() {
        if (this.completion) {
            this.completion.hide();
        }
    }

    initializeKeymap() {
        this.bindKeys({
            'Escape': () => this.exitToNormal(),
            'C-[': () => this.exitToNormal(),
            
            'Backspace': () => this.deleteBackward(),
            'Delete': () => this.deleteForward(),
            'C-h': () => this.deleteBackward(),
            'C-w': () => this.deleteWordBackward(),
            'C-u': () => this.deleteToLineStart(),
            
            'Return': () => this.insertNewline(),
            'Tab': () => this.handleTab(),
            'S-Tab': () => this.handleShiftTab(),
            
            'C-n': () => this.autoComplete(),
            'C-p': () => this.autoCompletePrev(),
            'C-Space': () => this.triggerCompletion(),
            
            'C-t': () => this.indentLine(),
            'C-d': () => this.outdentLine(),
            
            'C-j': () => this.insertSnippet(),
            
            'C-z': () => this.editor.undo(),
            'C-y': () => this.editor.redo(),
            
            'Left': () => this.moveCursor('left'),
            'Right': () => this.moveCursor('right'),
            'Up': () => this.moveCursor('up'),
            'Down': () => this.moveCursor('down'),
            'Home': () => this.moveCursor('lineStart'),
            'End': () => this.moveCursor('lineEnd'),
            
            'C-a': () => this.moveCursor('lineStart'),
            'C-e': () => this.moveCursor('lineEnd'),
            'C-b': () => this.moveCursor('left'),
            'C-f': () => this.moveCursor('right'),
        });
    }

    handleKey(event) {
        if (super.handleKey(event)) {
            return true;
        }
        
        if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
            this.insertChar(event.key);
            return true;
        }
        
        return false;
    }

    exitToNormal() {
        const cursor = this.editor.cursor;
        if (cursor.col > 0) {
            cursor.moveLeft();
        }
        this.editor.setMode('normal');
    }

    insertChar(char) {
        this.editor.insertText(char);
        
        if (this.shouldAutoIndent(char)) {
            this.autoIndent();
        }
        
        if (this.shouldShowCompletion(char)) {
            this.triggerCompletion();
        }
        
        this.checkBracketPair(char);
    }

    insertNewline() {
        const cursor = this.editor.cursor;
        const line = this.editor.buffer.getLine(cursor.row);
        const beforeCursor = line.substring(0, cursor.col);
        const indent = this.calculateIndent(beforeCursor);
        
        this.editor.insertText('\n' + ' '.repeat(indent));
        
        if (this.shouldIncreaseIndent(beforeCursor)) {
            this.editor.insertText('    ');
        }
    }

    deleteBackward() {
        const cursor = this.editor.cursor;
        if (cursor.col > 0) {
            const startPos = { row: cursor.row, col: cursor.col - 1 };
            this.editor.deleteRange(startPos, cursor.getPosition());
        } else if (cursor.row > 0) {
            const prevLineLength = this.editor.buffer.getLine(cursor.row - 1).length;
            const startPos = { row: cursor.row - 1, col: prevLineLength };
            this.editor.deleteRange(startPos, cursor.getPosition());
        }
    }

    deleteForward() {
        const cursor = this.editor.cursor;
        const line = this.editor.buffer.getLine(cursor.row);
        
        if (cursor.col < line.length) {
            const endPos = { row: cursor.row, col: cursor.col + 1 };
            this.editor.deleteRange(cursor.getPosition(), endPos);
        } else if (cursor.row < this.editor.buffer.getLineCount() - 1) {
            const endPos = { row: cursor.row + 1, col: 0 };
            this.editor.deleteRange(cursor.getPosition(), endPos);
        }
    }

    deleteWordBackward() {
        const cursor = this.editor.cursor;
        const line = this.editor.buffer.getLine(cursor.row);
        let col = cursor.col;
        
        while (col > 0 && /\s/.test(line[col - 1])) col--;
        while (col > 0 && /\w/.test(line[col - 1])) col--;
        
        if (col < cursor.col) {
            const startPos = { row: cursor.row, col: col };
            this.editor.deleteRange(startPos, cursor.getPosition());
        }
    }

    deleteToLineStart() {
        const cursor = this.editor.cursor;
        const startPos = { row: cursor.row, col: 0 };
        this.editor.deleteRange(startPos, cursor.getPosition());
    }

    handleTab() {
        const cursor = this.editor.cursor;
        const line = this.editor.buffer.getLine(cursor.row);
        const beforeCursor = line.substring(0, cursor.col);
        
        if (this.snippetManager && this.snippetManager.canExpand(beforeCursor)) {
            this.snippetManager.expand();
        } else if (this.completion && this.completion.isVisible()) {
            this.completion.selectNext();
        } else {
            const tabSize = this.editor.options.tabSize || 4;
            const useSpaces = this.editor.options.insertSpaces !== false;
            const text = useSpaces ? ' '.repeat(tabSize) : '\t';
            this.editor.insertText(text);
        }
    }

    handleShiftTab() {
        if (this.completion && this.completion.isVisible()) {
            this.completion.selectPrevious();
        } else if (this.snippetManager && this.snippetManager.hasPrevTabStop()) {
            this.snippetManager.prevTabStop();
        } else {
            this.outdentLine();
        }
    }

    indentLine() {
        const cursor = this.editor.cursor;
        const savedCol = cursor.col;
        cursor.moveToLineStart();
        
        const tabSize = this.editor.options.tabSize || 4;
        const useSpaces = this.editor.options.insertSpaces !== false;
        const text = useSpaces ? ' '.repeat(tabSize) : '\t';
        
        this.editor.insertText(text);
        cursor.col = savedCol + text.length;
    }

    outdentLine() {
        const cursor = this.editor.cursor;
        const line = this.editor.buffer.getLine(cursor.row);
        const tabSize = this.editor.options.tabSize || 4;
        
        let removeCount = 0;
        if (line.startsWith('\t')) {
            removeCount = 1;
        } else {
            for (let i = 0; i < tabSize && i < line.length && line[i] === ' '; i++) {
                removeCount++;
            }
        }
        
        if (removeCount > 0) {
            const savedCol = cursor.col;
            const startPos = { row: cursor.row, col: 0 };
            const endPos = { row: cursor.row, col: removeCount };
            this.editor.deleteRange(startPos, endPos);
            cursor.col = Math.max(0, savedCol - removeCount);
        }
    }

    moveCursor(direction) {
        const cursor = this.editor.cursor;
        
        switch (direction) {
            case 'left': cursor.moveLeft(); break;
            case 'right': cursor.moveRight(); break;
            case 'up': cursor.moveUp(); break;
            case 'down': cursor.moveDown(); break;
            case 'lineStart': cursor.moveToLineStart(); break;
            case 'lineEnd': cursor.moveToLineEnd(); break;
        }
        
        this.editor.ensureCursorVisible();
    }

    calculateIndent(line) {
        let indent = 0;
        for (const char of line) {
            if (char === ' ') indent++;
            else if (char === '\t') indent += 4;
            else break;
        }
        return indent;
    }

    shouldIncreaseIndent(line) {
        return /[{(\[]$/.test(line.trim());
    }

    shouldAutoIndent(char) {
        return char === '}' || char === ']' || char === ')';
    }

    autoIndent() {
        const cursor = this.editor.cursor;
        const line = this.editor.buffer.getLine(cursor.row);
        const currentIndent = this.calculateIndent(line);
        
        let targetIndent = currentIndent;
        if (cursor.row > 0) {
            const prevLine = this.editor.buffer.getLine(cursor.row - 1);
            const prevIndent = this.calculateIndent(prevLine);
            
            if (this.shouldIncreaseIndent(prevLine)) {
                targetIndent = prevIndent + 4;
            } else {
                targetIndent = prevIndent;
            }
            
            if (line.trim().startsWith('}') || line.trim().startsWith(']') || line.trim().startsWith(')')) {
                targetIndent = Math.max(0, targetIndent - 4);
            }
        }
        
        if (targetIndent !== currentIndent) {
            const savedCol = cursor.col;
            cursor.moveToLineStart();
            
            while (cursor.col < line.length && /\s/.test(line[cursor.col])) {
                cursor.moveRight();
            }
            
            const endPos = cursor.getPosition();
            cursor.moveToLineStart();
            
            if (endPos.col > 0) {
                this.editor.deleteRange(cursor.getPosition(), endPos);
            }
            
            if (targetIndent > 0) {
                this.editor.insertText(' '.repeat(targetIndent));
            }
            
            cursor.col = savedCol - currentIndent + targetIndent;
        }
    }

    checkBracketPair(char) {
        const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
        
        if (pairs[char]) {
            const cursor = this.editor.cursor;
            const line = this.editor.buffer.getLine(cursor.row);
            const nextChar = line[cursor.col];
            
            if (!nextChar || /\s/.test(nextChar) || /[)\]}]/.test(nextChar)) {
                const savedPos = cursor.getPosition();
                this.editor.insertText(pairs[char]);
                cursor.moveToPosition(savedPos);
            }
        }
    }

    shouldShowCompletion(char) {
        return /\w/.test(char) || char === '.';
    }

    triggerCompletion() {
        if (!this.completion) {
            this.completion = new Completion(this.editor);
        }
        this.completion.show();
    }

    autoComplete() {
        if (this.completion && this.completion.isVisible()) {
            this.completion.selectNext();
        } else {
            this.triggerCompletion();
        }
    }

    autoCompletePrev() {
        if (this.completion && this.completion.isVisible()) {
            this.completion.selectPrevious();
        }
    }
}

class Completion {
    constructor(editor) {
        this.editor = editor;
        this.visible = false;
    }
    
    show() {
        this.visible = true;
    }
    
    hide() {
        this.visible = false;
    }
    
    isVisible() {
        return this.visible;
    }
    
    selectNext() {}
    selectPrevious() {}
}