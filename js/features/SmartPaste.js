class SmartPaste {
    constructor(editor) {
        this.editor = editor;
        this.enabled = true;
        
        this.setupEventHandlers();
    }
    
    setupEventHandlers() {
        // Override paste handling
        document.addEventListener('paste', (e) => {
            if (this.enabled && this.editor.mode.name === 'insert') {
                e.preventDefault();
                this.handlePaste(e);
            }
        });
    }
    
    handlePaste(event) {
        const clipboardData = event.clipboardData || window.clipboardData;
        const pastedText = clipboardData.getData('text');
        
        if (!pastedText) return;
        
        // Analyze context
        const context = this.analyzeContext();
        
        // Process the pasted text
        const processedText = this.processText(pastedText, context);
        
        // Insert the processed text
        this.editor.insertText(processedText);
    }
    
    analyzeContext() {
        const cursor = this.editor.cursor;
        const buffer = this.editor.buffer;
        const currentLine = buffer.getLine(cursor.row);
        const linesBefore = [];
        const linesAfter = [];
        
        // Get surrounding lines for context
        for (let i = Math.max(0, cursor.row - 5); i < cursor.row; i++) {
            linesBefore.push(buffer.getLine(i));
        }
        
        for (let i = cursor.row + 1; i < Math.min(buffer.getLineCount(), cursor.row + 5); i++) {
            linesAfter.push(buffer.getLine(i));
        }
        
        return {
            currentLine,
            currentColumn: cursor.col,
            linesBefore,
            linesAfter,
            indentLevel: this.getIndentLevel(currentLine),
            indentStyle: this.detectIndentStyle(buffer),
            language: this.detectLanguage(buffer),
            insideString: this.isInsideString(currentLine, cursor.col),
            insideComment: this.isInsideComment(currentLine, cursor.col),
            insideBlock: this.detectBlockContext(linesBefore, currentLine)
        };
    }
    
    processText(text, context) {
        let processed = text;
        
        // Handle different paste scenarios
        if (context.insideString) {
            processed = this.processStringPaste(text);
        } else if (context.insideComment) {
            processed = this.processCommentPaste(text, context);
        } else {
            processed = this.processCodePaste(text, context);
        }
        
        return processed;
    }
    
    processStringPaste(text) {
        // Escape quotes and special characters for string context
        return text
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    }
    
    processCommentPaste(text, context) {
        const lines = text.split('\n');
        const commentPrefix = this.getCommentPrefix(context.currentLine);
        
        // Add comment prefix to each line
        return lines.map((line, index) => {
            if (index === 0) {
                // First line might continue existing comment
                return line;
            }
            return commentPrefix + ' ' + line;
        }).join('\n');
    }
    
    processCodePaste(text, context) {
        const lines = text.split('\n');
        
        // Detect the indentation of the pasted code
        const pastedIndent = this.detectMinIndent(lines);
        
        // Calculate the target indentation
        let targetIndent = context.indentLevel;
        
        // Adjust for block context
        if (context.insideBlock) {
            targetIndent += context.indentStyle.size;
        }
        
        // Reindent the pasted code
        const reindented = this.reindentCode(lines, pastedIndent, targetIndent, context.indentStyle);
        
        // Handle special cases
        if (this.isListOrArray(context)) {
            return this.processListPaste(reindented, context);
        }
        
        if (this.isFunctionCall(context)) {
            return this.processFunctionPaste(reindented, context);
        }
        
        return reindented.join('\n');
    }
    
    detectIndentStyle(buffer) {
        const lines = [];
        const lineCount = Math.min(100, buffer.getLineCount());
        
        for (let i = 0; i < lineCount; i++) {
            lines.push(buffer.getLine(i));
        }
        
        let spaceCount = 0;
        let tabCount = 0;
        let indentSizes = [];
        
        lines.forEach(line => {
            const match = line.match(/^(\s+)/);
            if (match) {
                const indent = match[1];
                if (indent.includes('\t')) {
                    tabCount++;
                } else {
                    spaceCount++;
                    indentSizes.push(indent.length);
                }
            }
        });
        
        const useTabs = tabCount > spaceCount;
        let size = 4; // default
        
        if (!useTabs && indentSizes.length > 0) {
            // Find most common indent size
            const sizeCounts = {};
            indentSizes.forEach(s => {
                sizeCounts[s] = (sizeCounts[s] || 0) + 1;
            });
            
            size = parseInt(Object.keys(sizeCounts).reduce((a, b) => 
                sizeCounts[a] > sizeCounts[b] ? a : b
            ));
        }
        
        return { useTabs, size };
    }
    
    detectLanguage(buffer) {
        // Simple language detection based on content
        const text = buffer.getText().slice(0, 1000);
        
        if (text.includes('function') || text.includes('=>') || text.includes('const ')) {
            return 'javascript';
        } else if (text.includes('def ') || text.includes('import ')) {
            return 'python';
        } else if (text.includes('#include') || text.includes('int main')) {
            return 'c';
        } else if (text.includes('class ') && text.includes('public ')) {
            return 'java';
        }
        
        return 'text';
    }
    
    getIndentLevel(line) {
        const match = line.match(/^(\s*)/);
        if (!match) return 0;
        
        const indent = match[1];
        if (indent.includes('\t')) {
            return indent.split('\t').length - 1;
        } else {
            return Math.floor(indent.length / 4); // Assume 4 spaces per indent
        }
    }
    
    detectMinIndent(lines) {
        let minIndent = Infinity;
        
        lines.forEach(line => {
            if (line.trim()) { // Skip empty lines
                const indent = this.getIndentLevel(line);
                minIndent = Math.min(minIndent, indent);
            }
        });
        
        return minIndent === Infinity ? 0 : minIndent;
    }
    
    reindentCode(lines, fromIndent, toIndent, indentStyle) {
        const indentDiff = toIndent - fromIndent;
        const indentChar = indentStyle.useTabs ? '\t' : ' '.repeat(indentStyle.size);
        
        return lines.map(line => {
            if (!line.trim()) return line; // Preserve empty lines
            
            const currentIndent = this.getIndentLevel(line);
            const newIndent = Math.max(0, currentIndent + indentDiff);
            const newIndentStr = indentChar.repeat(newIndent);
            
            // Remove old indentation and add new
            return newIndentStr + line.trimStart();
        });
    }
    
    isInsideString(line, column) {
        let inString = false;
        let stringChar = null;
        let escaped = false;
        
        for (let i = 0; i < column && i < line.length; i++) {
            const char = line[i];
            
            if (escaped) {
                escaped = false;
                continue;
            }
            
            if (char === '\\') {
                escaped = true;
                continue;
            }
            
            if ((char === '"' || char === "'") && !inString) {
                inString = true;
                stringChar = char;
            } else if (char === stringChar && inString) {
                inString = false;
                stringChar = null;
            }
        }
        
        return inString;
    }
    
    isInsideComment(line, column) {
        // Check for single-line comment
        const beforeCursor = line.substring(0, column);
        
        // Common comment patterns
        const commentPatterns = [
            /\/\//,  // JavaScript, C++
            /#/,     // Python, Shell
            /--/,    // SQL, Haskell
            /;/      // Assembly, Lisp
        ];
        
        for (const pattern of commentPatterns) {
            const match = beforeCursor.match(pattern);
            if (match) {
                return true;
            }
        }
        
        // TODO: Add multi-line comment detection
        
        return false;
    }
    
    detectBlockContext(linesBefore, currentLine) {
        // Check if we're inside a block (function, if, loop, etc.)
        const blockStarters = /{\s*$|:\s*$|\b(then|do|begin)\s*$/;
        
        // Check previous lines
        for (let i = linesBefore.length - 1; i >= 0; i--) {
            const line = linesBefore[i].trim();
            if (blockStarters.test(line)) {
                return true;
            }
            if (line.endsWith('}') || line === 'end') {
                return false;
            }
        }
        
        // Check current line up to cursor
        const beforeCursor = currentLine.substring(0, this.editor.cursor.col);
        return blockStarters.test(beforeCursor);
    }
    
    getCommentPrefix(line) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('//')) return '//';
        if (trimmed.startsWith('#')) return '#';
        if (trimmed.startsWith('--')) return '--';
        if (trimmed.startsWith('*')) return ' *';
        if (trimmed.startsWith('/*')) return ' *';
        
        return '//'; // Default
    }
    
    isListOrArray(context) {
        const { currentLine, currentColumn } = context;
        const beforeCursor = currentLine.substring(0, currentColumn);
        
        // Check for array/list context
        return /[\[{]\s*$/.test(beforeCursor) || /,\s*$/.test(beforeCursor);
    }
    
    isFunctionCall(context) {
        const { currentLine, currentColumn } = context;
        const beforeCursor = currentLine.substring(0, currentColumn);
        
        // Check for function call context
        return /\w+\s*\(\s*$/.test(beforeCursor) || /,\s*$/.test(beforeCursor);
    }
    
    processListPaste(lines, context) {
        // Add commas between items if needed
        if (lines.length > 1) {
            return lines.map((line, index) => {
                if (index < lines.length - 1 && !line.trim().endsWith(',')) {
                    return line + ',';
                }
                return line;
            }).join('\n');
        }
        
        return lines.join('\n');
    }
    
    processFunctionPaste(lines, context) {
        // Similar to list processing but might handle differently
        return this.processListPaste(lines, context);
    }
    
    toggle() {
        this.enabled = !this.enabled;
        this.editor.showMessage(`Smart Paste ${this.enabled ? 'enabled' : 'disabled'}`);
    }
}