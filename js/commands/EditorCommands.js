class EditorCommands {
    constructor(editor) {
        this.editor = editor;
        this.registerCommands();
    }
    
    registerCommands() {
        const palette = this.editor.commandPalette;
        
        // Undo/Redo commands
        palette.register({
            name: 'Undo',
            shortcut: 'Ctrl+Z',
            action: () => this.editor.undo()
        });
        
        palette.register({
            name: 'Redo',
            shortcut: 'Ctrl+Y',
            action: () => this.editor.redo()
        });
        
        palette.register({
            name: 'Undo Multiple',
            action: () => this.undoMultiple()
        });
        
        palette.register({
            name: 'Show Undo History',
            shortcut: 'Ctrl+Shift+Z',
            action: () => this.showUndoHistory()
        });
        
        // Time Travel
        palette.register({
            name: 'Time Travel',
            shortcut: 'Ctrl+T',
            action: () => {
                if (!this.editor.timeTravel) {
                    this.editor.timeTravel = new TimeTravel(this.editor);
                }
                this.editor.timeTravel.toggle();
            }
        });
        
        // Smart Paste
        palette.register({
            name: 'Smart Paste',
            shortcut: 'Ctrl+Shift+V',
            action: () => {
                if (!this.editor.smartPaste) {
                    this.editor.smartPaste = new SmartPaste(this.editor);
                }
                this.editor.smartPaste.paste();
            }
        });
        
        // Ghost Cursors
        palette.register({
            name: 'Toggle Ghost Cursors',
            shortcut: 'Ctrl+Alt+G',
            action: () => {
                if (!this.editor.ghostCursors) {
                    this.editor.ghostCursors = new GhostCursors(this.editor);
                }
                this.editor.ghostCursors.toggle();
            }
        });
        
        // Zen Mode
        palette.register({
            name: 'Toggle Zen Mode',
            shortcut: 'Ctrl+K Z',
            action: () => {
                if (!this.editor.zenMode) {
                    this.editor.zenMode = new ZenMode(this.editor);
                }
                this.editor.zenMode.toggle();
            }
        });
        
        // Intelligent Brackets
        palette.register({
            name: 'Toggle Intelligent Brackets',
            action: () => {
                if (!this.editor.intelligentBrackets) {
                    this.editor.intelligentBrackets = new IntelligentBrackets(this.editor);
                }
                this.editor.intelligentBrackets.toggle();
            }
        });
        
        // Code Lens
        palette.register({
            name: 'Toggle Code Lens',
            shortcut: 'Ctrl+Shift+L',
            action: () => {
                if (!this.editor.codeLens) {
                    this.editor.codeLens = new CodeLens(this.editor);
                }
                this.editor.codeLens.toggle();
            }
        });
        
        // Semantic Navigation
        palette.register({
            name: 'Go to Symbol',
            shortcut: 'Ctrl+Shift+O',
            action: () => {
                if (!this.editor.semanticNav) {
                    this.editor.semanticNav = new SemanticNavigation(this.editor);
                }
                this.editor.semanticNav.showSymbols();
            }
        });
        
        // Markdown Preview
        palette.register({
            name: 'Toggle Markdown Preview',
            shortcut: 'Ctrl+Shift+M',
            action: () => {
                if (!this.editor.markdownPreview) {
                    this.editor.markdownPreview = new MarkdownPreview(this.editor);
                }
                this.editor.markdownPreview.toggle();
            }
        });
        
        // Minimap Annotations
        palette.register({
            name: 'Toggle Minimap Annotations',
            action: () => {
                if (!this.editor.minimapAnnotations) {
                    this.editor.minimapAnnotations = new MinimapAnnotations(this.editor);
                }
                this.editor.minimapAnnotations.toggle();
            }
        });
        
        // Search & Replace
        palette.register({
            name: 'Advanced Search',
            shortcut: 'Ctrl+Shift+F',
            action: () => {
                if (!this.editor.search) {
                    this.editor.search = new Search(this.editor);
                }
                this.editor.search.showAdvanced();
            }
        });
        
        // Collaborative Cursors
        palette.register({
            name: 'Toggle Collaborative Mode',
            shortcut: 'Ctrl+Shift+C',
            action: () => {
                if (!this.editor.collaborativeCursors) {
                    this.editor.collaborativeCursors = new CollaborativeCursors(this.editor);
                }
                this.editor.collaborativeCursors.toggle();
            }
        });
        
        // AI Assistant
        palette.register({
            name: 'Toggle AI Assistant',
            shortcut: 'Ctrl+Shift+A',
            action: () => {
                if (!this.editor.aiAssistant) {
                    this.editor.aiAssistant = new AIAssistant(this.editor);
                }
                this.editor.aiAssistant.toggle();
            }
        });
        
        // Visual History
        palette.register({
            name: 'Toggle Visual History',
            shortcut: 'Ctrl+Shift+H',
            action: () => {
                if (!this.editor.visualHistory) {
                    this.editor.visualHistory = new VisualHistory(this.editor);
                }
                this.editor.visualHistory.toggle();
            }
        });
        
        // Multi-cursor
        palette.register({
            name: 'Toggle Multi-cursor Mode',
            shortcut: 'Ctrl+Alt+M',
            action: () => {
                if (!this.editor.multiCursor) {
                    this.editor.multiCursor = new MultiCursor(this.editor);
                }
                this.editor.multiCursor.toggle();
            }
        });
        
        // Code Folding
        palette.register({
            name: 'Toggle Code Folding',
            shortcut: 'Ctrl+Shift+[',
            action: () => {
                if (!this.editor.codeFolding) {
                    this.editor.codeFolding = new CodeFolding(this.editor);
                }
                this.editor.codeFolding.toggle();
            }
        });
        
        palette.register({
            name: 'Fold All',
            action: () => {
                if (this.editor.codeFolding && this.editor.codeFolding.active) {
                    this.editor.codeFolding.foldLevel(0);
                }
            }
        });
        
        palette.register({
            name: 'Unfold All',
            action: () => {
                if (this.editor.codeFolding && this.editor.codeFolding.active) {
                    this.editor.codeFolding.unfoldAll();
                }
            }
        });
        
        // Autocomplete
        palette.register({
            name: 'Toggle Autocomplete',
            shortcut: 'Ctrl+Space',
            action: () => {
                if (!this.editor.autocomplete) {
                    this.editor.autocomplete = new Autocomplete(this.editor);
                }
                this.editor.autocomplete.toggle();
            }
        });
        
        // Split View
        palette.register({
            name: 'Toggle Split View',
            shortcut: 'Ctrl+\\',
            action: () => {
                if (!this.editor.splitView) {
                    this.editor.splitView = new SplitView(this.editor);
                }
                this.editor.splitView.toggle();
            }
        });
        
        palette.register({
            name: 'Toggle Diff Mode',
            shortcut: 'Ctrl+Shift+D',
            action: () => {
                if (this.editor.splitView && this.editor.splitView.active) {
                    this.editor.splitView.toggleCompareMode();
                }
            }
        });
        
        palette.register({
            name: 'Open File in Split View',
            action: () => {
                if (this.editor.splitView && this.editor.splitView.active) {
                    this.editor.splitView.openFile();
                }
            }
        });
    }
    
    undoMultiple() {
        const count = parseInt(prompt('Number of changes to undo:', '5') || '0');
        if (count > 0) {
            for (let i = 0; i < count && this.editor.undoManager.canUndo(); i++) {
                this.editor.undo();
            }
        }
    }
    
    showUndoHistory() {
        const undoStack = this.editor.undoManager.undoStack;
        const redoStack = this.editor.undoManager.redoStack;
        
        let history = 'Undo History:\n\n';
        
        undoStack.forEach((group, index) => {
            const change = group.changes[0];
            const timestamp = new Date(change.timestamp).toLocaleTimeString();
            history += `${index + 1}. [${timestamp}] ${change.action}: ${change.text.length} chars\n`;
        });
        
        if (redoStack.length > 0) {
            history += '\nRedo Stack:\n';
            redoStack.forEach((group, index) => {
                const change = group.changes[0];
                history += `${index + 1}. ${change.action}: ${change.text.length} chars\n`;
            });
        }
        
        alert(history);
    }
}