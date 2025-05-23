class Theme {
    constructor(name = 'dark') {
        this.name = name;
        this.colors = this.loadTheme(name);
    }

    loadTheme(name) {
        const themes = {
            dark: {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
                cursor: '#aeafad',
                selection: 'rgba(38, 79, 120, 0.5)',
                lineHighlight: 'rgba(255, 255, 255, 0.03)',
                lineNumber: '#858585',
                currentLineNumber: '#c6c6c6',
                searchHighlight: 'rgba(255, 235, 59, 0.3)',
                matchingBracket: 'rgba(0, 150, 136, 0.3)',
                scrollbar: 'rgba(255, 255, 255, 0.1)',
                minimapBackground: '#1a1a1a',
                minimapForeground: 'rgba(200, 200, 200, 0.6)',
                
                keyword: '#569cd6',
                string: '#ce9178',
                number: '#b5cea8',
                comment: '#6a9955',
                function: '#dcdcaa',
                variable: '#9cdcfe',
                operator: '#d4d4d4',
                bracket: '#ffd700',
                type: '#4ec9b0',
                constant: '#4fc1ff'
            },
            
            light: {
                background: '#ffffff',
                foreground: '#333333',
                cursor: '#333333',
                selection: 'rgba(0, 102, 204, 0.2)',
                lineHighlight: 'rgba(0, 0, 0, 0.02)',
                lineNumber: '#999999',
                currentLineNumber: '#333333',
                searchHighlight: 'rgba(255, 235, 59, 0.4)',
                matchingBracket: 'rgba(0, 150, 136, 0.2)',
                scrollbar: 'rgba(0, 0, 0, 0.1)',
                minimapBackground: '#f5f5f5',
                minimapForeground: 'rgba(50, 50, 50, 0.6)',
                
                keyword: '#0000ff',
                string: '#a31515',
                number: '#098658',
                comment: '#008000',
                function: '#795e26',
                variable: '#001080',
                operator: '#333333',
                bracket: '#333333',
                type: '#267f99',
                constant: '#0070c1'
            },
            
            solarized: {
                background: '#002b36',
                foreground: '#839496',
                cursor: '#839496',
                selection: 'rgba(38, 139, 210, 0.3)',
                lineHighlight: 'rgba(255, 255, 255, 0.02)',
                lineNumber: '#586e75',
                currentLineNumber: '#93a1a1',
                searchHighlight: 'rgba(181, 137, 0, 0.3)',
                matchingBracket: 'rgba(211, 54, 130, 0.3)',
                scrollbar: 'rgba(147, 161, 161, 0.1)',
                minimapBackground: '#002129',
                minimapForeground: 'rgba(131, 148, 150, 0.6)',
                
                keyword: '#859900',
                string: '#2aa198',
                number: '#d33682',
                comment: '#586e75',
                function: '#b58900',
                variable: '#268bd2',
                operator: '#839496',
                bracket: '#cb4b16',
                type: '#b58900',
                constant: '#6c71c4'
            },
            
            monokai: {
                background: '#272822',
                foreground: '#f8f8f2',
                cursor: '#f8f8f0',
                selection: 'rgba(73, 72, 62, 0.8)',
                lineHighlight: 'rgba(255, 255, 255, 0.03)',
                lineNumber: '#75715e',
                currentLineNumber: '#f8f8f2',
                searchHighlight: 'rgba(166, 226, 46, 0.3)',
                matchingBracket: 'rgba(249, 38, 114, 0.3)',
                scrollbar: 'rgba(255, 255, 255, 0.1)',
                minimapBackground: '#1e1f1a',
                minimapForeground: 'rgba(248, 248, 242, 0.6)',
                
                keyword: '#f92672',
                string: '#e6db74',
                number: '#ae81ff',
                comment: '#75715e',
                function: '#a6e22e',
                variable: '#fd971f',
                operator: '#f8f8f2',
                bracket: '#f8f8f2',
                type: '#66d9ef',
                constant: '#ae81ff'
            }
        };
        
        return themes[name] || themes.dark;
    }

    getColor(name) {
        return this.colors[name] || '#ffffff';
    }

    getSyntaxColor(tokenType) {
        const colorMap = {
            'keyword': this.colors.keyword,
            'string': this.colors.string,
            'number': this.colors.number,
            'comment': this.colors.comment,
            'function': this.colors.function,
            'variable': this.colors.variable,
            'operator': this.colors.operator,
            'bracket': this.colors.bracket,
            'type': this.colors.type,
            'constant': this.colors.constant,
            'text': this.colors.foreground
        };
        
        return colorMap[tokenType] || this.colors.foreground;
    }

    applyToDOM() {
        const root = document.documentElement;
        
        for (const [key, value] of Object.entries(this.colors)) {
            root.style.setProperty(`--theme-${key}`, value);
        }
    }
}