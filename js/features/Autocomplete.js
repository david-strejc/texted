class Autocomplete {
    constructor(editor) {
        this.editor = editor;
        this.active = false;
        this.suggestions = [];
        this.selectedIndex = 0;
        this.currentWord = '';
        this.wordStart = null;
        
        this.setupUI();
        this.bindEvents();
        this.buildDictionary();
    }
    
    setupUI() {
        this.popup = document.createElement('div');
        this.popup.className = 'autocomplete-popup';
        this.popup.style.display = 'none';
        document.body.appendChild(this.popup);
    }
    
    bindEvents() {
        this.editor.on('change', () => {
            if (this.active) {
                this.triggerAutocomplete();
            }
        });
        
        this.editor.on('cursorMove', () => {
            if (this.active && this.popup.style.display === 'block') {
                this.hide();
            }
        });
        
        // Intercept Tab key for completion
        document.addEventListener('keydown', (e) => {
            if (this.popup.style.display === 'block') {
                if (e.key === 'Tab' || e.key === 'Enter') {
                    e.preventDefault();
                    this.complete();
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.selectNext();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.selectPrev();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.hide();
                }
            }
        });
    }
    
    toggle() {
        this.active = !this.active;
        this.editor.showMessage(`Autocomplete ${this.active ? 'enabled' : 'disabled'}`);
        
        if (!this.active) {
            this.hide();
        }
    }
    
    buildDictionary() {
        // Common programming keywords and snippets
        this.dictionary = {
            javascript: [
                { word: 'function', snippet: 'function ${1:name}(${2:params}) {\n\t${3}\n}' },
                { word: 'const', snippet: 'const ${1:name} = ${2:value};' },
                { word: 'let', snippet: 'let ${1:name} = ${2:value};' },
                { word: 'class', snippet: 'class ${1:Name} {\n\tconstructor(${2:params}) {\n\t\t${3}\n\t}\n}' },
                { word: 'async', snippet: 'async ${1:function}' },
                { word: 'await', snippet: 'await ${1:promise}' },
                { word: 'import', snippet: 'import ${1:module} from \'${2:path}\';' },
                { word: 'export', snippet: 'export ${1:default} ${2:component};' },
                { word: 'if', snippet: 'if (${1:condition}) {\n\t${2}\n}' },
                { word: 'else', snippet: 'else {\n\t${1}\n}' },
                { word: 'for', snippet: 'for (let ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t${3}\n}' },
                { word: 'forEach', snippet: '${1:array}.forEach((${2:item}) => {\n\t${3}\n});' },
                { word: 'map', snippet: '${1:array}.map((${2:item}) => ${3:item})' },
                { word: 'filter', snippet: '${1:array}.filter((${2:item}) => ${3:condition})' },
                { word: 'reduce', snippet: '${1:array}.reduce((${2:acc}, ${3:item}) => ${4:acc}, ${5:initial})' },
                { word: 'promise', snippet: 'new Promise((resolve, reject) => {\n\t${1}\n})' },
                { word: 'try', snippet: 'try {\n\t${1}\n} catch (${2:error}) {\n\t${3}\n}' },
                { word: 'console.log', snippet: 'console.log(${1});' },
                { word: 'document.getElementById', snippet: 'document.getElementById(\'${1:id}\')' },
                { word: 'addEventListener', snippet: '${1:element}.addEventListener(\'${2:event}\', (${3:e}) => {\n\t${4}\n});' },
                { word: 'querySelector', snippet: 'document.querySelector(\'${1:selector}\')' },
                { word: 'fetch', snippet: 'fetch(\'${1:url}\')\n\t.then(response => response.json())\n\t.then(data => {\n\t\t${2}\n\t});' }
            ],
            
            common: [
                { word: 'TODO', snippet: '// TODO: ${1:description}' },
                { word: 'FIXME', snippet: '// FIXME: ${1:description}' },
                { word: 'NOTE', snippet: '// NOTE: ${1:description}' },
                { word: 'HACK', snippet: '// HACK: ${1:description}' },
                { word: 'DEBUG', snippet: '// DEBUG: ${1:description}' }
            ]
        };
        
        // Extract words from current document
        this.documentWords = new Set();
        this.updateDocumentWords();
    }
    
    updateDocumentWords() {
        this.documentWords.clear();
        const text = this.editor.buffer.getText();
        const words = text.match(/\b\w{3,}\b/g) || [];
        words.forEach(word => this.documentWords.add(word));
    }
    
    triggerAutocomplete() {
        const cursor = this.editor.cursor;
        const line = this.editor.buffer.getLine(cursor.row);
        const beforeCursor = line.substring(0, cursor.col);
        
        // Find word at cursor
        const wordMatch = beforeCursor.match(/(\w+)$/);
        if (!wordMatch) {
            this.hide();
            return;
        }
        
        this.currentWord = wordMatch[1];
        this.wordStart = { row: cursor.row, col: cursor.col - this.currentWord.length };
        
        if (this.currentWord.length < 2) {
            this.hide();
            return;
        }
        
        // Generate suggestions
        this.suggestions = this.getSuggestions(this.currentWord);
        
        if (this.suggestions.length > 0) {
            this.show();
        } else {
            this.hide();
        }
    }
    
    getSuggestions(prefix) {
        const suggestions = [];
        const lower = prefix.toLowerCase();
        
        // Add dictionary suggestions
        [...this.dictionary.javascript, ...this.dictionary.common].forEach(item => {
            if (item.word.toLowerCase().startsWith(lower)) {
                suggestions.push({
                    text: item.word,
                    snippet: item.snippet,
                    type: 'snippet',
                    score: item.word.length - prefix.length
                });
            }
        });
        
        // Add document words
        this.documentWords.forEach(word => {
            if (word !== this.currentWord && word.toLowerCase().startsWith(lower)) {
                suggestions.push({
                    text: word,
                    type: 'word',
                    score: word.length - prefix.length + 10 // Lower priority than snippets
                });
            }
        });
        
        // Add context-aware suggestions
        const contextSuggestions = this.getContextSuggestions(prefix);
        suggestions.push(...contextSuggestions);
        
        // Sort by relevance
        suggestions.sort((a, b) => a.score - b.score);
        
        return suggestions.slice(0, 10);
    }
    
    getContextSuggestions(prefix) {
        const suggestions = [];
        const cursor = this.editor.cursor;
        const line = this.editor.buffer.getLine(cursor.row);
        
        // Suggest variable names after 'const', 'let', 'var'
        if (/\b(const|let|var)\s+$/.test(line.substring(0, cursor.col - prefix.length))) {
            suggestions.push({
                text: prefix + 'Value',
                type: 'context',
                score: 0
            });
        }
        
        // Suggest method names after '.'
        if (line[cursor.col - prefix.length - 1] === '.') {
            const objectMatch = line.substring(0, cursor.col - prefix.length - 1).match(/(\w+)$/);
            if (objectMatch) {
                const methods = this.getObjectMethods(objectMatch[1]);
                methods.forEach(method => {
                    if (method.toLowerCase().startsWith(prefix.toLowerCase())) {
                        suggestions.push({
                            text: method,
                            type: 'method',
                            score: 1
                        });
                    }
                });
            }
        }
        
        return suggestions;
    }
    
    getObjectMethods(objectName) {
        const methodMap = {
            'console': ['log', 'error', 'warn', 'info', 'debug', 'trace', 'table', 'time', 'timeEnd'],
            'document': ['getElementById', 'getElementsByClassName', 'querySelector', 'querySelectorAll', 'createElement'],
            'array': ['push', 'pop', 'shift', 'unshift', 'map', 'filter', 'reduce', 'forEach', 'find', 'includes'],
            'string': ['length', 'charAt', 'substring', 'slice', 'split', 'replace', 'trim', 'toLowerCase', 'toUpperCase'],
            'math': ['abs', 'ceil', 'floor', 'round', 'max', 'min', 'random', 'sqrt', 'pow']
        };
        
        return methodMap[objectName.toLowerCase()] || [];
    }
    
    show() {
        this.selectedIndex = 0;
        this.renderSuggestions();
        
        // Position popup
        const cursor = this.editor.cursor;
        const screenPos = this.editor.renderer.bufferToScreen(cursor);
        
        this.popup.style.left = `${screenPos.x}px`;
        this.popup.style.top = `${screenPos.y + this.editor.renderer.lineHeight}px`;
        this.popup.style.display = 'block';
    }
    
    hide() {
        this.popup.style.display = 'none';
        this.suggestions = [];
        this.currentWord = '';
        this.wordStart = null;
    }
    
    renderSuggestions() {
        this.popup.innerHTML = '';
        
        this.suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = `autocomplete-item ${index === this.selectedIndex ? 'selected' : ''}`;
            
            const icon = document.createElement('span');
            icon.className = 'autocomplete-icon';
            icon.textContent = this.getIcon(suggestion.type);
            
            const text = document.createElement('span');
            text.className = 'autocomplete-text';
            text.textContent = suggestion.text;
            
            const type = document.createElement('span');
            type.className = 'autocomplete-type';
            type.textContent = suggestion.type;
            
            item.appendChild(icon);
            item.appendChild(text);
            item.appendChild(type);
            
            item.addEventListener('click', () => {
                this.selectedIndex = index;
                this.complete();
            });
            
            this.popup.appendChild(item);
        });
    }
    
    getIcon(type) {
        const icons = {
            snippet: '◆',
            word: '◉',
            method: '⚡',
            context: '✦'
        };
        return icons[type] || '•';
    }
    
    selectNext() {
        this.selectedIndex = (this.selectedIndex + 1) % this.suggestions.length;
        this.renderSuggestions();
    }
    
    selectPrev() {
        this.selectedIndex = (this.selectedIndex - 1 + this.suggestions.length) % this.suggestions.length;
        this.renderSuggestions();
    }
    
    complete() {
        const suggestion = this.suggestions[this.selectedIndex];
        if (!suggestion) return;
        
        this.editor.undoManager.beginGroup();
        
        // Delete current word
        this.editor.buffer.delete(this.wordStart, this.editor.cursor.getPosition());
        
        // Insert completion
        if (suggestion.snippet) {
            this.insertSnippet(suggestion.snippet);
        } else {
            this.editor.insertText(suggestion.text);
        }
        
        this.editor.undoManager.endGroup();
        
        this.hide();
        this.updateDocumentWords();
    }
    
    insertSnippet(snippet) {
        // Simple snippet expansion with placeholders
        let processedSnippet = snippet;
        const placeholders = [];
        
        // Find placeholders ${n:text}
        const placeholderRegex = /\$\{(\d+):?([^}]*)\}/g;
        let match;
        while ((match = placeholderRegex.exec(snippet)) !== null) {
            placeholders.push({
                index: parseInt(match[1]),
                text: match[2] || '',
                start: match.index,
                end: match.index + match[0].length
            });
        }
        
        // Replace placeholders with their default text
        processedSnippet = snippet.replace(placeholderRegex, (match, num, text) => text);
        
        // Insert the snippet
        const startPos = this.editor.cursor.getPosition();
        this.editor.insertText(processedSnippet);
        
        // Move cursor to first placeholder
        if (placeholders.length > 0) {
            const firstPlaceholder = placeholders.find(p => p.index === 1) || placeholders[0];
            const lines = processedSnippet.substring(0, firstPlaceholder.start).split('\n');
            const row = startPos.row + lines.length - 1;
            const col = lines.length > 1 ? lines[lines.length - 1].length : startPos.col + lines[0].length;
            this.editor.cursor.moveToPosition({ row, col });
        }
    }
}