class CommandPalette {
    constructor(editor) {
        this.editor = editor;
        this.element = document.getElementById('command-palette');
        this.commands = [];
        this.filteredCommands = [];
        this.selectedIndex = 0;
        
        this.build();
        this.registerDefaultCommands();
    }

    build() {
        this.element.innerHTML = `
            <input type="text" class="command-search" placeholder="Type a command..." />
            <div class="results"></div>
        `;
        
        this.searchInput = this.element.querySelector('.command-search');
        this.resultsElement = this.element.querySelector('.results');
        
        this.searchInput.addEventListener('input', () => this.filter());
        this.searchInput.addEventListener('keydown', (e) => this.handleKey(e));
    }

    registerDefaultCommands() {
        this.register({
            name: 'Save File',
            shortcut: 'Ctrl+S',
            action: () => this.editor.save()
        });
        
        this.register({
            name: 'Open File',
            shortcut: 'Ctrl+O',
            action: () => this.editor.openFile()
        });
        
        this.register({
            name: 'Find',
            shortcut: 'Ctrl+F',
            action: () => this.editor.find()
        });
        
        this.register({
            name: 'Find and Replace',
            shortcut: 'Ctrl+H',
            action: () => this.editor.findAndReplace()
        });
        
        this.register({
            name: 'Go to Line',
            shortcut: 'Ctrl+G',
            action: () => this.editor.goToLine()
        });
        
        this.register({
            name: 'Toggle Line Numbers',
            action: () => {
                this.editor.options.lineNumbers = !this.editor.options.lineNumbers;
                this.editor.renderer.invalidate();
            }
        });
        
        this.register({
            name: 'Change Theme',
            action: () => this.showThemeSelector()
        });
        
        this.register({
            name: 'Toggle Minimap',
            action: () => this.editor.minimap.toggle()
        });
        
        this.register({
            name: 'Split Editor Horizontally',
            action: () => this.editor.splitHorizontal()
        });
        
        this.register({
            name: 'Split Editor Vertically',
            action: () => this.editor.splitVertical()
        });
        
        this.register({
            name: 'Format Document',
            shortcut: 'Shift+Alt+F',
            action: () => this.editor.format()
        });
        
        this.register({
            name: 'Toggle Word Wrap',
            action: () => {
                this.editor.options.wordWrap = !this.editor.options.wordWrap;
                this.editor.renderer.invalidate();
            }
        });
        
        this.register({
            name: 'Increase Font Size',
            shortcut: 'Ctrl++',
            action: () => this.changeFontSize(1)
        });
        
        this.register({
            name: 'Decrease Font Size',
            shortcut: 'Ctrl+-',
            action: () => this.changeFontSize(-1)
        });
        
        this.register({
            name: 'Reset Font Size',
            shortcut: 'Ctrl+0',
            action: () => this.resetFontSize()
        });
    }

    register(command) {
        this.commands.push(command);
    }

    show() {
        this.element.classList.remove('hidden');
        this.searchInput.value = '';
        this.searchInput.focus();
        this.filter();
    }

    hide() {
        this.element.classList.add('hidden');
        document.getElementById('hidden-input').focus();
    }

    filter() {
        const query = this.searchInput.value.toLowerCase();
        
        if (query) {
            this.filteredCommands = this.commands.filter(cmd => 
                cmd.name.toLowerCase().includes(query)
            ).sort((a, b) => {
                const aIndex = a.name.toLowerCase().indexOf(query);
                const bIndex = b.name.toLowerCase().indexOf(query);
                return aIndex - bIndex;
            });
        } else {
            this.filteredCommands = [...this.commands];
        }
        
        this.selectedIndex = 0;
        this.render();
    }

    render() {
        this.resultsElement.innerHTML = '';
        
        this.filteredCommands.forEach((cmd, index) => {
            const item = document.createElement('div');
            item.className = 'result-item';
            if (index === this.selectedIndex) {
                item.classList.add('selected');
            }
            
            item.innerHTML = `
                <span class="command-name">${this.highlightMatch(cmd.name)}</span>
                ${cmd.shortcut ? `<span class="shortcut">${cmd.shortcut}</span>` : ''}
            `;
            
            item.addEventListener('click', () => this.execute(index));
            item.addEventListener('mouseenter', () => {
                this.selectedIndex = index;
                this.render();
            });
            
            this.resultsElement.appendChild(item);
        });
    }

    highlightMatch(text) {
        const query = this.searchInput.value;
        if (!query) return text;
        
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<strong>$1</strong>');
    }

    handleKey(event) {
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.selectNext();
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.selectPrevious();
                break;
            case 'Enter':
                event.preventDefault();
                this.execute(this.selectedIndex);
                break;
            case 'Escape':
                event.preventDefault();
                this.hide();
                break;
        }
    }

    selectNext() {
        if (this.selectedIndex < this.filteredCommands.length - 1) {
            this.selectedIndex++;
            this.render();
            this.scrollToSelected();
        }
    }

    selectPrevious() {
        if (this.selectedIndex > 0) {
            this.selectedIndex--;
            this.render();
            this.scrollToSelected();
        }
    }

    scrollToSelected() {
        const selected = this.resultsElement.children[this.selectedIndex];
        if (selected) {
            selected.scrollIntoView({ block: 'nearest' });
        }
    }

    execute(index) {
        const command = this.filteredCommands[index];
        if (command) {
            this.hide();
            command.action();
        }
    }

    changeFontSize(delta) {
        this.editor.options.fontSize = Math.max(8, Math.min(32, this.editor.options.fontSize + delta));
        this.editor.renderer.setupCanvas();
        this.editor.renderer.handleResize();
    }

    resetFontSize() {
        this.editor.options.fontSize = 14;
        this.editor.renderer.setupCanvas();
        this.editor.renderer.handleResize();
    }

    showThemeSelector() {
        const themes = ['dark', 'light', 'solarized', 'monokai'];
        this.filteredCommands = themes.map(theme => ({
            name: `Theme: ${theme}`,
            action: () => {
                this.editor.setTheme(theme);
                this.hide();
            }
        }));
        this.selectedIndex = 0;
        this.render();
    }
}