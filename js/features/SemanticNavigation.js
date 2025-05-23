class SemanticNavigation {
    constructor(editor) {
        this.editor = editor;
        this.symbols = [];
        this.currentSymbolIndex = -1;
        this.symbolsPanel = null;
        
        this.initialize();
    }
    
    initialize() {
        this.createUI();
        this.setupEventHandlers();
        this.updateSymbols();
    }
    
    createUI() {
        // Create symbols panel
        this.symbolsPanel = document.createElement('div');
        this.symbolsPanel.id = 'symbols-panel';
        this.symbolsPanel.className = 'symbols-panel hidden';
        this.symbolsPanel.innerHTML = `
            <div class="symbols-header">
                <h3>Symbols</h3>
                <button class="close-btn">&times;</button>
            </div>
            <div class="symbols-filter">
                <input type="text" placeholder="Filter symbols..." />
            </div>
            <div class="symbols-list"></div>
        `;
        
        document.getElementById('editor-container').appendChild(this.symbolsPanel);
        
        // Event handlers for panel
        this.symbolsPanel.querySelector('.close-btn').addEventListener('click', () => {
            this.hideSymbolsPanel();
        });
        
        this.symbolsPanel.querySelector('input').addEventListener('input', (e) => {
            this.filterSymbols(e.target.value);
        });
    }
    
    setupEventHandlers() {
        // Update symbols on buffer change
        this.editor.buffer.on('change', () => {
            this.debounceUpdateSymbols();
        });
        
        // Navigation shortcuts
        this.editor.on('command', (cmd) => {
            switch (cmd) {
                case 'goToSymbol':
                    this.showSymbolsPanel();
                    break;
                case 'nextFunction':
                    this.navigateToNextSymbol('function');
                    break;
                case 'previousFunction':
                    this.navigateToPreviousSymbol('function');
                    break;
                case 'nextClass':
                    this.navigateToNextSymbol('class');
                    break;
                case 'previousClass':
                    this.navigateToPreviousSymbol('class');
                    break;
                case 'goToDefinition':
                    this.goToDefinition();
                    break;
            }
        });
    }
    
    debounceUpdateSymbols() {
        clearTimeout(this.updateTimer);
        this.updateTimer = setTimeout(() => {
            this.updateSymbols();
        }, 500);
    }
    
    updateSymbols() {
        const text = this.editor.buffer.getText();
        this.symbols = this.extractSymbols(text);
        this.updateCurrentSymbol();
    }
    
    extractSymbols(text) {
        const symbols = [];
        const lines = text.split('\n');
        
        // Extract different types of symbols
        const patterns = [
            // Functions
            {
                type: 'function',
                patterns: [
                    /function\s+(\w+)\s*\(/,
                    /(\w+)\s*:\s*function\s*\(/,
                    /(\w+)\s*=\s*function\s*\(/,
                    /(\w+)\s*=\s*\([^)]*\)\s*=>/,
                    /async\s+function\s+(\w+)\s*\(/,
                    /(\w+)\s*\([^)]*\)\s*{/
                ],
                icon: 'ƒ'
            },
            // Classes
            {
                type: 'class',
                patterns: [
                    /class\s+(\w+)/,
                    /(\w+)\s*=\s*class/
                ],
                icon: '◆'
            },
            // Variables/Constants
            {
                type: 'variable',
                patterns: [
                    /(?:const|let|var)\s+(\w+)\s*=/,
                    /(\w+)\s*:/
                ],
                icon: '▸'
            },
            // Interfaces (TypeScript)
            {
                type: 'interface',
                patterns: [
                    /interface\s+(\w+)/
                ],
                icon: '◇'
            },
            // Methods (inside classes)
            {
                type: 'method',
                patterns: [
                    /^\s+(\w+)\s*\([^)]*\)\s*{/,
                    /^\s+async\s+(\w+)\s*\([^)]*\)\s*{/,
                    /^\s+static\s+(\w+)\s*\([^)]*\)\s*{/
                ],
                icon: '→'
            }
        ];
        
        lines.forEach((line, lineIndex) => {
            patterns.forEach(({ type, patterns: typePatterns, icon }) => {
                for (const pattern of typePatterns) {
                    const match = line.match(pattern);
                    if (match) {
                        const name = match[1];
                        const indent = line.match(/^(\s*)/)[1].length;
                        
                        symbols.push({
                            name,
                            type,
                            line: lineIndex,
                            column: match.index,
                            indent,
                            icon,
                            fullLine: line.trim()
                        });
                        break;
                    }
                }
            });
        });
        
        // Sort by line number
        symbols.sort((a, b) => a.line - b.line);
        
        // Build hierarchy based on indentation
        return this.buildSymbolHierarchy(symbols);
    }
    
    buildSymbolHierarchy(symbols) {
        const hierarchy = [];
        const stack = [];
        
        symbols.forEach(symbol => {
            // Find parent based on indentation
            while (stack.length > 0 && stack[stack.length - 1].indent >= symbol.indent) {
                stack.pop();
            }
            
            if (stack.length === 0) {
                hierarchy.push(symbol);
            } else {
                const parent = stack[stack.length - 1];
                if (!parent.children) {
                    parent.children = [];
                }
                parent.children.push(symbol);
            }
            
            stack.push(symbol);
        });
        
        return hierarchy;
    }
    
    updateCurrentSymbol() {
        const cursorLine = this.editor.cursor.row;
        let currentSymbol = null;
        let currentIndex = -1;
        
        // Find the symbol containing the cursor
        const findCurrent = (symbols, parentIndex = -1) => {
            symbols.forEach((symbol, index) => {
                const symbolIndex = parentIndex === -1 ? index : `${parentIndex}.${index}`;
                
                if (symbol.line <= cursorLine) {
                    currentSymbol = symbol;
                    currentIndex = symbolIndex;
                }
                
                if (symbol.children) {
                    findCurrent(symbol.children, symbolIndex);
                }
            });
        };
        
        findCurrent(this.symbols);
        
        this.currentSymbolIndex = currentIndex;
        
        // Update status bar with current symbol
        if (currentSymbol) {
            this.editor.emit('currentSymbol', currentSymbol);
        }
    }
    
    showSymbolsPanel() {
        this.symbolsPanel.classList.remove('hidden');
        this.renderSymbols();
        
        // Focus filter input
        const filterInput = this.symbolsPanel.querySelector('input');
        filterInput.focus();
        filterInput.select();
    }
    
    hideSymbolsPanel() {
        this.symbolsPanel.classList.add('hidden');
    }
    
    renderSymbols(filter = '') {
        const listContainer = this.symbolsPanel.querySelector('.symbols-list');
        listContainer.innerHTML = '';
        
        const renderSymbol = (symbol, level = 0) => {
            if (filter && !symbol.name.toLowerCase().includes(filter.toLowerCase())) {
                return;
            }
            
            const item = document.createElement('div');
            item.className = 'symbol-item';
            item.style.paddingLeft = (level * 20 + 10) + 'px';
            
            item.innerHTML = `
                <span class="symbol-icon">${symbol.icon}</span>
                <span class="symbol-name">${symbol.name}</span>
                <span class="symbol-type">${symbol.type}</span>
                <span class="symbol-line">:${symbol.line + 1}</span>
            `;
            
            item.addEventListener('click', () => {
                this.navigateToSymbol(symbol);
                this.hideSymbolsPanel();
            });
            
            listContainer.appendChild(item);
            
            if (symbol.children) {
                symbol.children.forEach(child => renderSymbol(child, level + 1));
            }
        };
        
        this.symbols.forEach(symbol => renderSymbol(symbol));
    }
    
    filterSymbols(filter) {
        this.renderSymbols(filter);
    }
    
    navigateToSymbol(symbol) {
        this.editor.cursor.moveToPosition({ row: symbol.line, col: symbol.column });
        this.editor.ensureCursorVisible();
        this.editor.renderer.invalidate();
        
        // Flash the line for visual feedback
        this.flashLine(symbol.line);
    }
    
    navigateToNextSymbol(type = null) {
        const cursorLine = this.editor.cursor.row;
        
        const findNext = (symbols) => {
            for (const symbol of symbols) {
                if (symbol.line > cursorLine && (!type || symbol.type === type)) {
                    return symbol;
                }
                if (symbol.children) {
                    const childResult = findNext(symbol.children);
                    if (childResult) return childResult;
                }
            }
            return null;
        };
        
        const nextSymbol = findNext(this.symbols);
        if (nextSymbol) {
            this.navigateToSymbol(nextSymbol);
        } else {
            this.editor.showMessage('No more symbols found');
        }
    }
    
    navigateToPreviousSymbol(type = null) {
        const cursorLine = this.editor.cursor.row;
        let previousSymbol = null;
        
        const findPrevious = (symbols) => {
            for (const symbol of symbols) {
                if (symbol.line < cursorLine && (!type || symbol.type === type)) {
                    previousSymbol = symbol;
                }
                if (symbol.children) {
                    findPrevious(symbol.children);
                }
            }
        };
        
        findPrevious(this.symbols);
        
        if (previousSymbol) {
            this.navigateToSymbol(previousSymbol);
        } else {
            this.editor.showMessage('No previous symbols found');
        }
    }
    
    goToDefinition() {
        const cursor = this.editor.cursor;
        const line = this.editor.buffer.getLine(cursor.row);
        
        // Get word under cursor
        const word = this.getWordUnderCursor(line, cursor.col);
        if (!word) return;
        
        // Find symbol definition
        const definition = this.findDefinition(word);
        if (definition) {
            this.navigateToSymbol(definition);
        } else {
            this.editor.showMessage(`No definition found for '${word}'`);
        }
    }
    
    getWordUnderCursor(line, column) {
        // Find word boundaries
        let start = column;
        let end = column;
        
        while (start > 0 && /\w/.test(line[start - 1])) {
            start--;
        }
        
        while (end < line.length && /\w/.test(line[end])) {
            end++;
        }
        
        return line.substring(start, end);
    }
    
    findDefinition(name) {
        const find = (symbols) => {
            for (const symbol of symbols) {
                if (symbol.name === name) {
                    return symbol;
                }
                if (symbol.children) {
                    const childResult = find(symbol.children);
                    if (childResult) return childResult;
                }
            }
            return null;
        };
        
        return find(this.symbols);
    }
    
    flashLine(line) {
        const flash = document.createElement('div');
        flash.className = 'line-flash';
        
        const renderer = this.editor.renderer;
        flash.style.top = (line * renderer.lineHeight - renderer.viewport.scrollTop) + 'px';
        flash.style.height = renderer.lineHeight + 'px';
        
        document.getElementById('editor-viewport').appendChild(flash);
        
        setTimeout(() => {
            flash.remove();
        }, 500);
    }
    
    getSymbolAtLine(line) {
        const find = (symbols) => {
            for (const symbol of symbols) {
                if (symbol.line === line) {
                    return symbol;
                }
                if (symbol.children) {
                    const childResult = find(symbol.children);
                    if (childResult) return childResult;
                }
            }
            return null;
        };
        
        return find(this.symbols);
    }
}