class CommandMode extends Mode {
    constructor(editor) {
        super(editor);
        this.name = 'command';
        this.commandLine = '';
        this.history = [];
        this.historyIndex = -1;
        this.commands = new Map();
        
        this.initializeCommands();
        this.initializeKeymap();
    }

    enter() {
        super.enter();
        this.commandLine = ':';
        this.editor.showCommandLine(':');
    }

    exit() {
        this.commandLine = '';
        this.historyIndex = -1;
        this.editor.hideCommandLine();
    }

    initializeKeymap() {
        this.bindKeys({
            'Escape': () => this.cancel(),
            'C-[': () => this.cancel(),
            'Return': () => this.execute(),
            'Backspace': () => this.deleteChar(),
            'C-w': () => this.deleteWord(),
            'C-u': () => this.clearLine(),
            'Tab': () => this.complete(),
            'Up': () => this.historyPrev(),
            'Down': () => this.historyNext(),
            'Left': () => this.moveCursor(-1),
            'Right': () => this.moveCursor(1),
            'Home': () => this.moveCursorStart(),
            'End': () => this.moveCursorEnd(),
        });
    }

    initializeCommands() {
        this.registerCommand('w', this.save, 'write');
        this.registerCommand('q', this.quit, 'quit');
        this.registerCommand('wq', this.saveAndQuit, 'write quit');
        this.registerCommand('x', this.saveAndQuit, 'exit');
        this.registerCommand('e', this.edit, 'edit');
        this.registerCommand('o', this.open, 'open');
        this.registerCommand('n', this.next, 'next');
        this.registerCommand('N', this.previous, 'previous');
        this.registerCommand('b', this.buffer, 'buffer');
        this.registerCommand('bd', this.deleteBuffer, 'buffer delete');
        this.registerCommand('sp', this.split, 'split');
        this.registerCommand('vsp', this.vsplit, 'vsplit');
        this.registerCommand('set', this.set, 'settings');
        this.registerCommand('help', this.help, 'help');
        this.registerCommand('/', this.search, 'search');
        this.registerCommand('s', this.substitute, 'substitute');
        this.registerCommand('%s', this.substituteAll, 'substitute all');
        this.registerCommand('g', this.global, 'global');
        this.registerCommand('!', this.shell, 'shell');
        this.registerCommand('r', this.read, 'read');
        this.registerCommand('source', this.source, 'source');
        this.registerCommand('map', this.map, 'map');
        this.registerCommand('unmap', this.unmap, 'unmap');
        this.registerCommand('reg', this.registers, 'registers');
        this.registerCommand('marks', this.marks, 'marks');
        this.registerCommand('jumps', this.jumps, 'jumps');
        this.registerCommand('changes', this.changes, 'changes');
        this.registerCommand('undo', this.undo, 'undo');
        this.registerCommand('redo', this.redo, 'redo');
        this.registerCommand('earlier', this.earlier, 'earlier');
        this.registerCommand('later', this.later, 'later');
        
        this.registerCommand('theme', this.setTheme, 'set theme');
        this.registerCommand('syntax', this.setSyntax, 'set syntax');
        this.registerCommand('fold', this.fold, 'fold');
        this.registerCommand('unfold', this.unfold, 'unfold');
        
        for (let i = 1; i <= 9; i++) {
            this.registerCommand(i.toString(), () => this.gotoLine(i), `goto line ${i}`);
        }
    }

    registerCommand(name, handler, description = '') {
        this.commands.set(name, { handler, description });
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

    insertChar(char) {
        this.commandLine += char;
        this.editor.updateCommandLine(this.commandLine);
    }

    deleteChar() {
        if (this.commandLine.length > 1) {
            this.commandLine = this.commandLine.slice(0, -1);
            this.editor.updateCommandLine(this.commandLine);
        } else {
            this.cancel();
        }
    }

    deleteWord() {
        const beforeCursor = this.commandLine.slice(0, -1);
        const words = beforeCursor.split(/\s+/);
        words.pop();
        this.commandLine = ':' + words.join(' ') + (words.length > 0 ? ' ' : '');
        this.editor.updateCommandLine(this.commandLine);
    }

    clearLine() {
        this.commandLine = ':';
        this.editor.updateCommandLine(this.commandLine);
    }

    cancel() {
        this.editor.setMode('normal');
    }

    execute() {
        const command = this.commandLine.substring(1).trim();
        
        if (command) {
            this.history.push(command);
            if (this.history.length > 100) {
                this.history.shift();
            }
        }
        
        this.parseAndExecute(command);
        this.editor.setMode('normal');
    }

    parseAndExecute(command) {
        const match = command.match(/^(\d+)?(,(\d+|\$))?\s*(\w+)(.*)$/);
        
        if (!match) {
            if (/^\d+$/.test(command)) {
                this.gotoLine(parseInt(command));
            } else {
                this.editor.showError(`Unknown command: ${command}`);
            }
            return;
        }
        
        const [, startLine, , endLine, cmd, args] = match;
        const range = this.parseRange(startLine, endLine);
        
        const commandEntry = this.findCommand(cmd);
        if (commandEntry) {
            try {
                commandEntry.handler.call(this, args.trim(), range);
            } catch (error) {
                this.editor.showError(`Error: ${error.message}`);
            }
        } else {
            this.editor.showError(`Unknown command: ${cmd}`);
        }
    }

    findCommand(cmd) {
        if (this.commands.has(cmd)) {
            return this.commands.get(cmd);
        }
        
        for (const [name, entry] of this.commands) {
            if (name.startsWith(cmd)) {
                return entry;
            }
        }
        
        return null;
    }

    parseRange(start, end) {
        if (!start && !end) return null;
        
        const buffer = this.editor.buffer;
        const current = this.editor.cursor.row + 1;
        
        const parseLine = (spec) => {
            if (!spec) return current;
            if (spec === '$') return buffer.getLineCount();
            if (spec === '.') return current;
            return parseInt(spec);
        };
        
        return {
            start: parseLine(start),
            end: parseLine(end || start)
        };
    }

    save() {
        this.editor.save();
        this.editor.showMessage('Written');
    }

    quit() {
        if (this.editor.buffer.dirty) {
            this.editor.showError('No write since last change');
        } else {
            this.editor.quit();
        }
    }

    saveAndQuit() {
        this.save();
        this.quit();
    }

    gotoLine(line) {
        this.editor.cursor.moveToLine(line);
        this.editor.ensureCursorVisible();
    }

    search(pattern) {
        if (!pattern) return;
        
        const regex = new RegExp(pattern, 'g');
        this.editor.search.setPattern(regex);
        this.editor.search.findNext();
    }

    substitute(args, range) {
        const match = args.match(/^\/(.+?)\/(.+?)\/([gimx]*)$/);
        if (!match) {
            this.editor.showError('Invalid substitute pattern');
            return;
        }
        
        const [, pattern, replacement, flags] = match;
        const regex = new RegExp(pattern, flags);
        
        if (range) {
            this.editor.undoManager.beginGroup();
            
            for (let row = range.start - 1; row < range.end; row++) {
                const line = this.editor.buffer.getLine(row);
                const newLine = line.replace(regex, replacement);
                
                if (line !== newLine) {
                    this.editor.buffer.replace(
                        { row, col: 0 },
                        { row, col: line.length },
                        newLine
                    );
                }
            }
            
            this.editor.undoManager.endGroup();
        }
    }

    setTheme(themeName) {
        this.editor.setTheme(themeName);
        this.editor.showMessage(`Theme set to ${themeName}`);
    }

    complete() {
        const beforeCursor = this.commandLine.substring(1);
        const words = beforeCursor.split(/\s+/);
        const partial = words[words.length - 1];
        
        const matches = [];
        for (const [name, entry] of this.commands) {
            if (name.startsWith(partial)) {
                matches.push(name);
            }
        }
        
        if (matches.length === 1) {
            words[words.length - 1] = matches[0];
            this.commandLine = ':' + words.join(' ') + ' ';
            this.editor.updateCommandLine(this.commandLine);
        } else if (matches.length > 1) {
            this.editor.showCompletions(matches);
        }
    }

    historyPrev() {
        if (this.historyIndex === -1) {
            this.historyIndex = this.history.length - 1;
        } else if (this.historyIndex > 0) {
            this.historyIndex--;
        }
        
        if (this.historyIndex >= 0) {
            this.commandLine = ':' + this.history[this.historyIndex];
            this.editor.updateCommandLine(this.commandLine);
        }
    }

    historyNext() {
        if (this.historyIndex >= 0) {
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                this.commandLine = ':' + this.history[this.historyIndex];
            } else {
                this.historyIndex = -1;
                this.commandLine = ':';
            }
            this.editor.updateCommandLine(this.commandLine);
        }
    }
}