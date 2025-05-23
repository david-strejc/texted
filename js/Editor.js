class Editor extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            fontSize: 14,
            fontFamily: 'Consolas, Monaco, monospace',
            tabSize: 4,
            insertSpaces: true,
            lineNumbers: true,
            highlightCurrentLine: true,
            theme: 'dark',
            ...options
        };
        
        this.buffer = new Buffer();
        this.cursor = new Cursor(this.buffer);
        this.selections = [];
        this.registers = new Map();
        this.marks = new Map();
        this.macros = new Map();
        
        this.undoManager = new UndoManager(this.buffer);
        this.search = null;
        this.syntax = null;
        this.theme = null;
        
        this.modes = new Map();
        this.mode = null;
        
        this.canvas = document.getElementById('editor-canvas');
        this.renderer = new Renderer(this, this.canvas);
        
        this.statusBar = null;
        this.commandPalette = null;
        this.minimap = null;
        
        this.lastChange = null;
        this.jumpList = [];
        this.jumpIndex = -1;
        
        this.initialize();
    }

    initialize() {
        this.setupModes();
        this.setupUI();
        this.setupEventHandlers();
        
        this.setTheme(this.options.theme);
        this.setMode('normal');
        
        this.buffer.on('change', () => {
            this.renderer.invalidate();
            this.emit('change');
        });
        
        this.renderer.render();
    }

    setupModes() {
        this.modes.set('normal', new NormalMode(this));
        this.modes.set('insert', new InsertMode(this));
        this.modes.set('visual', new VisualMode(this));
        this.modes.set('command', new CommandMode(this));
    }

    setupUI() {
        this.statusBar = new StatusBar(this);
        this.commandPalette = new CommandPalette(this);
        this.minimap = new Minimap(this);
        this.theme = new Theme(this.options.theme);
    }

    setupEventHandlers() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        const hiddenInput = document.getElementById('hidden-input');
        hiddenInput.addEventListener('input', (e) => this.handleInput(e));
        hiddenInput.addEventListener('compositionstart', () => this.composing = true);
        hiddenInput.addEventListener('compositionend', () => this.composing = false);
        
        window.addEventListener('focus', () => hiddenInput.focus());
        hiddenInput.focus();
    }

    handleKeyDown(event) {
        if (this.composing) return;
        
        // Let the mode handle the key first
        let handled = false;
        if (this.mode) {
            handled = this.mode.handleKey(event);
            if (handled) {
                this.renderer.invalidate();
            }
        }
        
        // Prevent default for most keys, but let browser handle some Ctrl combinations
        if (handled || (!event.ctrlKey && !event.altKey && !event.metaKey)) {
            event.preventDefault();
        } else if (event.ctrlKey && (event.key === 'z' || event.key === 'y')) {
            // Always prevent default for our undo/redo keys
            event.preventDefault();
        }
    }

    handleKeyUp(event) {
        
    }

    handleInput(event) {
        if (this.mode.name === 'insert' && event.data) {
            this.insertText(event.data);
        }
        event.target.value = '';
    }

    handleMouseDown(event) {
        const pos = this.getPositionFromMouse(event);
        this.cursor.moveToPosition(pos);
        
        if (event.shiftKey && this.mode.name === 'visual') {
            this.mode.selection.setHead(pos);
        } else if (this.mode.name === 'normal') {
            if (event.detail === 2) {
                this.selectWord();
            } else if (event.detail === 3) {
                this.selectLine();
            }
        }
        
        this.renderer.invalidate();
    }

    handleMouseMove(event) {
        if (event.buttons === 1) {
            const pos = this.getPositionFromMouse(event);
            
            if (this.mode.name === 'visual') {
                this.mode.selection.setHead(pos);
            } else if (this.mode.name === 'normal') {
                this.setMode('visual');
                this.mode.selection.setHead(pos);
            }
            
            this.cursor.moveToPosition(pos);
            this.renderer.invalidate();
        }
    }

    handleMouseUp(event) {
        
    }

    handleWheel(event) {
        event.preventDefault();
        
        const delta = event.deltaY;
        const direction = delta > 0 ? 'down' : 'up';
        const amount = Math.abs(delta) > 100 ? this.renderer.lineHeight * 3 : this.renderer.lineHeight;
        
        this.renderer.scroll(direction, amount);
    }

    getPositionFromMouse(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left + this.renderer.viewport.scrollLeft;
        const y = event.clientY - rect.top + this.renderer.viewport.scrollTop;
        
        const row = Math.floor(y / this.renderer.lineHeight);
        const line = this.buffer.getLine(row);
        const col = this.renderer.textMeasure.getCharIndexAtX(line, x);
        
        return {
            row: Math.max(0, Math.min(row, this.buffer.getLineCount() - 1)),
            col: col
        };
    }

    setMode(modeName) {
        if (this.mode) {
            this.mode.exit();
        }
        
        this.mode = this.modes.get(modeName);
        if (this.mode) {
            this.mode.enter();
            this.emit('modeChange', modeName);
        }
    }

    insertText(text) {
        const pos = this.cursor.getPosition();
        this.undoManager.saveCursorState(pos, null);
        
        const endPos = this.buffer.insert(pos, text);
        this.cursor.moveToPosition(endPos);
        
        this.undoManager.saveCursorState(null, endPos);
        this.lastChange = { type: 'insert', text, pos };
    }

    insertTextAt(pos, text) {
        return this.buffer.insert(pos, text);
    }

    deleteRange(start, end) {
        this.undoManager.saveCursorState(this.cursor.getPosition(), null);
        
        const deletedText = this.buffer.getText(start, end);
        this.buffer.delete(start, end);
        this.cursor.moveToPosition(start);
        
        this.undoManager.saveCursorState(null, start);
        this.lastChange = { type: 'delete', text: deletedText, start, end };
        
        return deletedText;
    }

    replaceRange(start, end, text) {
        this.undoManager.beginGroup();
        this.deleteRange(start, end);
        this.insertText(text);
        this.undoManager.endGroup();
    }

    undo() {
        console.log('Editor.undo() called');
        const cursorPos = this.undoManager.undo();
        console.log('Undo returned cursor position:', cursorPos);
        if (cursorPos) {
            this.cursor.moveToPosition(cursorPos);
        }
        this.renderer.invalidate();
    }

    redo() {
        console.log('Editor.redo() called');
        const cursorPos = this.undoManager.redo();
        console.log('Redo returned cursor position:', cursorPos);
        if (cursorPos) {
            this.cursor.moveToPosition(cursorPos);
        }
        this.renderer.invalidate();
    }

    addSelection(selection) {
        this.selections.push(selection);
    }

    clearSelections() {
        this.selections = [];
    }

    yankRange(start, end) {
        const text = this.buffer.getText(start, end);
        this.setRegister('"', text);
    }

    setRegister(name, text, type = 'char') {
        this.registers.set(name, { text, type });
        
        if (name !== '_') {
            this.registers.set('0', { text, type });
        }
    }

    getRegister(name) {
        return this.registers.get(name);
    }

    paste(register = '"', after = true) {
        const reg = this.getRegister(register);
        if (!reg) return;
        
        const cursor = this.cursor;
        let pos = cursor.getPosition();
        
        if (reg.type === 'line') {
            if (after) {
                cursor.moveToLineEnd();
                this.insertText('\n' + reg.text);
            } else {
                cursor.moveToLineStart();
                this.insertText(reg.text + '\n');
                cursor.moveUp();
            }
        } else {
            if (after && cursor.col < this.buffer.getLine(cursor.row).length) {
                cursor.moveRight();
            }
            this.insertText(reg.text);
        }
    }

    setCursorStyle(style) {
        this.emit('cursorStyleChange', style);
    }

    ensureCursorVisible() {
        this.renderer.ensureCursorVisible();
    }

    showMessage(message) {
        this.statusBar.showMessage(message);
    }

    showError(message) {
        this.statusBar.showError(message);
    }

    showCommandLine(prefix) {
        this.statusBar.showCommandLine(prefix);
    }

    hideCommandLine() {
        this.statusBar.hideCommandLine();
    }

    updateCommandLine(text) {
        this.statusBar.updateCommandLine(text);
    }

    setTheme(themeName) {
        this.theme = new Theme(themeName);
        document.body.className = `theme-${themeName}`;
        this.renderer.invalidate();
    }

    save() {
        this.buffer.save();
        this.emit('save');
    }

    quit() {
        this.emit('quit');
    }

    openFile(path) {
        
    }

    selectWord() {
        const selection = new Selection(this.buffer, this.cursor.getPosition());
        selection.expandToWord();
        this.clearSelections();
        this.addSelection(selection);
        this.setMode('visual');
    }

    selectLine() {
        const selection = new Selection(this.buffer, this.cursor.getPosition());
        selection.expandToLine();
        this.clearSelections();
        this.addSelection(selection);
        this.setMode('visual');
        this.mode.setType('line');
    }

    getStatusInfo() {
        return {
            mode: this.mode ? this.mode.name : 'normal',
            row: this.cursor.row + 1,
            col: this.cursor.col + 1,
            lines: this.buffer.getLineCount(),
            modified: this.buffer.dirty,
            statusText: this.mode ? this.mode.getStatusText() : ''
        };
    }
}