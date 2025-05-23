class CodeFolding {
    constructor(editor) {
        this.editor = editor;
        this.foldedRegions = new Map(); // line -> {endLine, content}
        this.active = false;
        this.foldMarkers = [];
        
        this.setupUI();
        this.bindEvents();
    }
    
    setupUI() {
        this.foldGutter = document.createElement('div');
        this.foldGutter.className = 'fold-gutter';
        document.querySelector('.editor-container').appendChild(this.foldGutter);
    }
    
    bindEvents() {
        this.editor.on('change', () => {
            if (this.active) {
                this.updateFoldRegions();
            }
        });
        
        this.editor.on('scroll', () => {
            if (this.active) {
                this.renderFoldMarkers();
            }
        });
    }
    
    toggle() {
        this.active = !this.active;
        
        if (this.active) {
            this.detectFoldableRegions();
            this.renderFoldMarkers();
            this.editor.showMessage('Code folding enabled');
        } else {
            this.unfoldAll();
            this.foldGutter.innerHTML = '';
            this.editor.showMessage('Code folding disabled');
        }
        
        this.foldGutter.style.display = this.active ? 'block' : 'none';
    }
    
    detectFoldableRegions() {
        this.foldMarkers = [];
        const lines = this.editor.buffer.getLines();
        
        const bracketStack = [];
        const parenStack = [];
        const indentStack = [];
        
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            // Detect bracket-based folding
            if (trimmed.endsWith('{')) {
                bracketStack.push(index);
            } else if (trimmed.startsWith('}') && bracketStack.length > 0) {
                const startLine = bracketStack.pop();
                if (index - startLine > 1) {
                    this.foldMarkers.push({
                        startLine,
                        endLine: index,
                        type: 'bracket'
                    });
                }
            }
            
            // Detect function/method folding
            if (/^(function|class|const\s+\w+\s*=.*=>|def|public|private|protected)/.test(trimmed)) {
                let endLine = this.findFunctionEnd(lines, index);
                if (endLine > index + 1) {
                    this.foldMarkers.push({
                        startLine: index,
                        endLine,
                        type: 'function'
                    });
                }
            }
            
            // Detect comment block folding
            if (trimmed.startsWith('/*') || trimmed.startsWith('/**')) {
                let endLine = index;
                for (let i = index + 1; i < lines.length; i++) {
                    if (lines[i].includes('*/')) {
                        endLine = i;
                        break;
                    }
                }
                if (endLine > index) {
                    this.foldMarkers.push({
                        startLine: index,
                        endLine,
                        type: 'comment'
                    });
                }
            }
            
            // Detect Python-style indentation folding
            if (trimmed.endsWith(':')) {
                const indent = line.search(/\S/);
                let endLine = index;
                for (let i = index + 1; i < lines.length; i++) {
                    const nextIndent = lines[i].search(/\S/);
                    if (nextIndent >= 0 && nextIndent <= indent) {
                        endLine = i - 1;
                        break;
                    }
                    if (i === lines.length - 1) {
                        endLine = i;
                    }
                }
                if (endLine > index + 1) {
                    this.foldMarkers.push({
                        startLine: index,
                        endLine,
                        type: 'indent'
                    });
                }
            }
        });
        
        // Sort and remove overlapping regions
        this.foldMarkers.sort((a, b) => a.startLine - b.startLine);
        this.foldMarkers = this.removeOverlapping(this.foldMarkers);
    }
    
    findFunctionEnd(lines, startLine) {
        const startIndent = lines[startLine].search(/\S/);
        let bracketCount = 0;
        let inFunction = false;
        
        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];
            bracketCount += (line.match(/{/g) || []).length;
            bracketCount -= (line.match(/}/g) || []).length;
            
            if (bracketCount > 0) inFunction = true;
            
            if (inFunction && bracketCount === 0) {
                return i;
            }
            
            // For Python-style functions
            if (i > startLine && line.search(/\S/) >= 0 && line.search(/\S/) <= startIndent) {
                return i - 1;
            }
        }
        
        return lines.length - 1;
    }
    
    removeOverlapping(markers) {
        const result = [];
        let lastEnd = -1;
        
        for (const marker of markers) {
            if (marker.startLine > lastEnd) {
                result.push(marker);
                lastEnd = marker.endLine;
            }
        }
        
        return result;
    }
    
    fold(startLine) {
        const marker = this.foldMarkers.find(m => m.startLine === startLine);
        if (!marker || this.foldedRegions.has(startLine)) return;
        
        const lines = [];
        for (let i = startLine + 1; i <= marker.endLine; i++) {
            lines.push(this.editor.buffer.getLine(i));
        }
        
        this.foldedRegions.set(startLine, {
            endLine: marker.endLine,
            content: lines,
            type: marker.type
        });
        
        // Replace folded lines with placeholder
        this.editor.undoManager.beginGroup();
        for (let i = marker.endLine; i > startLine; i--) {
            this.editor.buffer.deleteLine(i);
        }
        
        const placeholder = this.createPlaceholder(marker.type, lines.length);
        const line = this.editor.buffer.getLine(startLine);
        this.editor.buffer.setLine(startLine, line + placeholder);
        this.editor.undoManager.endGroup();
        
        this.renderFoldMarkers();
    }
    
    unfold(startLine) {
        const folded = this.foldedRegions.get(startLine);
        if (!folded) return;
        
        // Remove placeholder
        const line = this.editor.buffer.getLine(startLine);
        const placeholderMatch = line.match(/\s*\/\*\.\.\.\*\/$/);
        if (placeholderMatch) {
            this.editor.buffer.setLine(startLine, line.substring(0, placeholderMatch.index));
        }
        
        // Restore folded lines
        this.editor.undoManager.beginGroup();
        folded.content.forEach((content, index) => {
            this.editor.buffer.insertLine(startLine + index + 1, content);
        });
        this.editor.undoManager.endGroup();
        
        this.foldedRegions.delete(startLine);
        this.renderFoldMarkers();
    }
    
    createPlaceholder(type, lineCount) {
        const icons = {
            bracket: '{}',
            function: 'fn',
            comment: '/**/',
            indent: '...'
        };
        return ` /*...${icons[type] || ''}[${lineCount} lines]...*/`;
    }
    
    unfoldAll() {
        const foldedLines = Array.from(this.foldedRegions.keys()).sort((a, b) => b - a);
        foldedLines.forEach(line => this.unfold(line));
    }
    
    renderFoldMarkers() {
        this.foldGutter.innerHTML = '';
        
        const scrollTop = this.editor.renderer.scrollTop;
        const lineHeight = this.editor.renderer.lineHeight;
        const visibleStart = Math.floor(scrollTop / lineHeight);
        const visibleEnd = visibleStart + Math.ceil(this.editor.canvas.height / lineHeight);
        
        this.foldMarkers.forEach(marker => {
            if (marker.startLine >= visibleStart && marker.startLine <= visibleEnd) {
                const y = (marker.startLine - visibleStart) * lineHeight;
                const isFolded = this.foldedRegions.has(marker.startLine);
                
                const markerEl = document.createElement('div');
                markerEl.className = `fold-marker ${isFolded ? 'folded' : ''}`;
                markerEl.style.top = `${y}px`;
                markerEl.textContent = isFolded ? '▶' : '▼';
                markerEl.title = `${isFolded ? 'Unfold' : 'Fold'} ${marker.type} (${marker.endLine - marker.startLine} lines)`;
                
                markerEl.addEventListener('click', () => {
                    if (isFolded) {
                        this.unfold(marker.startLine);
                    } else {
                        this.fold(marker.startLine);
                    }
                });
                
                this.foldGutter.appendChild(markerEl);
            }
        });
    }
    
    foldLevel(level) {
        // Fold all regions at a specific nesting level
        const nestingLevels = this.calculateNestingLevels();
        
        this.foldMarkers.forEach(marker => {
            const markerLevel = nestingLevels.get(marker.startLine);
            if (markerLevel === level && !this.foldedRegions.has(marker.startLine)) {
                this.fold(marker.startLine);
            }
        });
    }
    
    calculateNestingLevels() {
        const levels = new Map();
        let currentLevel = 0;
        const stack = [];
        
        this.editor.buffer.getLines().forEach((line, index) => {
            const trimmed = line.trim();
            
            if (trimmed.endsWith('{') || trimmed.endsWith(':')) {
                stack.push(currentLevel);
                levels.set(index, currentLevel);
                currentLevel++;
            } else if (trimmed.startsWith('}') && stack.length > 0) {
                currentLevel = stack.pop();
            }
        });
        
        return levels;
    }
}