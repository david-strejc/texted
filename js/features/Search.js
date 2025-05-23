class Search {
    constructor(editor) {
        this.editor = editor;
        this.pattern = null;
        this.matches = new Map();
        this.currentMatch = null;
        this.options = {
            ignoreCase: false,
            wholeWord: false,
            regex: true,
            wrap: true
        };
    }

    setPattern(pattern, options = {}) {
        this.pattern = pattern;
        this.options = { ...this.options, ...options };
        this.findAllMatches();
    }

    findAllMatches() {
        this.matches.clear();
        if (!this.pattern) return;
        
        const buffer = this.editor.buffer;
        const regex = this.createRegex();
        
        for (let row = 0; row < buffer.getLineCount(); row++) {
            const line = buffer.getLine(row);
            const rowMatches = [];
            let match;
            
            while ((match = regex.exec(line)) !== null) {
                rowMatches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0]
                });
            }
            
            if (rowMatches.length > 0) {
                this.matches.set(row, rowMatches);
            }
        }
        
        this.editor.renderer.invalidate();
    }

    createRegex() {
        let pattern = this.pattern;
        
        if (!this.options.regex) {
            pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
        
        if (this.options.wholeWord) {
            pattern = `\\b${pattern}\\b`;
        }
        
        const flags = this.options.ignoreCase ? 'gi' : 'g';
        return new RegExp(pattern, flags);
    }

    findNext() {
        if (!this.pattern || this.matches.size === 0) return false;
        
        const cursor = this.editor.cursor;
        const currentPos = cursor.getPosition();
        
        for (let row = currentPos.row; row < this.editor.buffer.getLineCount(); row++) {
            const rowMatches = this.matches.get(row);
            if (!rowMatches) continue;
            
            for (const match of rowMatches) {
                if (row === currentPos.row && match.start <= currentPos.col) continue;
                
                cursor.setPosition(row, match.start);
                this.currentMatch = { row, match };
                this.editor.ensureCursorVisible();
                return true;
            }
        }
        
        if (this.options.wrap) {
            for (let row = 0; row <= currentPos.row; row++) {
                const rowMatches = this.matches.get(row);
                if (!rowMatches) continue;
                
                for (const match of rowMatches) {
                    if (row === currentPos.row && match.start >= currentPos.col) break;
                    
                    cursor.setPosition(row, match.start);
                    this.currentMatch = { row, match };
                    this.editor.ensureCursorVisible();
                    return true;
                }
            }
        }
        
        return false;
    }

    findPrevious() {
        if (!this.pattern || this.matches.size === 0) return false;
        
        const cursor = this.editor.cursor;
        const currentPos = cursor.getPosition();
        
        for (let row = currentPos.row; row >= 0; row--) {
            const rowMatches = this.matches.get(row);
            if (!rowMatches) continue;
            
            for (let i = rowMatches.length - 1; i >= 0; i--) {
                const match = rowMatches[i];
                if (row === currentPos.row && match.start >= currentPos.col) continue;
                
                cursor.setPosition(row, match.start);
                this.currentMatch = { row, match };
                this.editor.ensureCursorVisible();
                return true;
            }
        }
        
        if (this.options.wrap) {
            for (let row = this.editor.buffer.getLineCount() - 1; row >= currentPos.row; row--) {
                const rowMatches = this.matches.get(row);
                if (!rowMatches) continue;
                
                for (let i = rowMatches.length - 1; i >= 0; i--) {
                    const match = rowMatches[i];
                    if (row === currentPos.row && match.start <= currentPos.col) break;
                    
                    cursor.setPosition(row, match.start);
                    this.currentMatch = { row, match };
                    this.editor.ensureCursorVisible();
                    return true;
                }
            }
        }
        
        return false;
    }

    replace(replacement) {
        if (!this.currentMatch) return;
        
        const { row, match } = this.currentMatch;
        const start = { row, col: match.start };
        const end = { row, col: match.end };
        
        this.editor.replaceRange(start, end, replacement);
        this.findAllMatches();
    }

    replaceAll(replacement) {
        if (this.matches.size === 0) return;
        
        this.editor.undoManager.beginGroup();
        
        const sortedRows = Array.from(this.matches.keys()).sort((a, b) => b - a);
        
        for (const row of sortedRows) {
            const rowMatches = this.matches.get(row);
            const sortedMatches = [...rowMatches].sort((a, b) => b.start - a.start);
            
            for (const match of sortedMatches) {
                const start = { row, col: match.start };
                const end = { row, col: match.end };
                this.editor.buffer.replace(start, end, replacement);
            }
        }
        
        this.editor.undoManager.endGroup();
        this.findAllMatches();
    }

    clear() {
        this.pattern = null;
        this.matches.clear();
        this.currentMatch = null;
        this.editor.renderer.invalidate();
    }

    hasMatches(row) {
        return this.matches.has(row);
    }

    getMatches(row) {
        return this.matches.get(row) || [];
    }

    getMatchCount() {
        let count = 0;
        for (const rowMatches of this.matches.values()) {
            count += rowMatches.length;
        }
        return count;
    }

    getCurrentMatchIndex() {
        if (!this.currentMatch) return 0;
        
        let index = 0;
        for (const [row, rowMatches] of this.matches) {
            if (row < this.currentMatch.row) {
                index += rowMatches.length;
            } else if (row === this.currentMatch.row) {
                for (const match of rowMatches) {
                    if (match === this.currentMatch.match) {
                        return index + 1;
                    }
                    index++;
                }
            }
        }
        
        return 0;
    }
}