class Renderer {
    constructor(editor, canvas) {
        this.editor = editor;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.textMeasure = new TextMeasure();
        
        this.viewport = {
            scrollTop: 0,
            scrollLeft: 0,
            width: 0,
            height: 0,
            visibleLines: 0,
            visibleColumns: 0
        };
        
        this.cache = {
            lines: new Map(),
            version: -1
        };
        
        this.selectionElements = [];
        this.cursorElement = null;
        this.textVerticalOffset = 0;
        
        // Get container reference
        this.container = this.canvas.parentElement;
        
        // Create cursors layer for collaborative cursors
        this.cursorsLayer = document.createElement('div');
        this.cursorsLayer.className = 'cursors-layer';
        this.cursorsLayer.style.position = 'absolute';
        this.cursorsLayer.style.top = '0';
        this.cursorsLayer.style.left = '0';
        this.cursorsLayer.style.pointerEvents = 'none';
        this.container.appendChild(this.cursorsLayer);
        
        this.setupCanvas();
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
    }

    setupCanvas() {
        const fontSize = this.editor.options.fontSize || 14;
        const fontFamily = this.editor.options.fontFamily || 'Consolas, Monaco, monospace';
        const font = `${fontSize}px ${fontFamily}`;
        
        this.textMeasure.setFont(font);
        this.ctx.font = font;
        this.ctx.textBaseline = 'top';
        
        this.charWidth = this.textMeasure.getCharWidth();
        this.lineHeight = this.textMeasure.getLineHeight();
        this.baseline = this.textMeasure.getBaseline();
        
        // Calculate vertical offset to center text within line height
        // Font size is the actual text height, lineHeight is 1.5x font size
        // So we need to offset by (lineHeight - fontSize) / 2
        // Add 2px to move text slightly lower for better visual alignment
        this.textVerticalOffset = (this.lineHeight - fontSize) / 2 + 2;
    }

    handleResize() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        this.ctx.scale(dpr, dpr);
        this.setupCanvas();
        
        this.viewport.width = rect.width;
        this.viewport.height = rect.height;
        this.viewport.visibleLines = Math.ceil(rect.height / this.lineHeight);
        this.viewport.visibleColumns = Math.floor(rect.width / this.charWidth);
        
        this.invalidate();
    }

    render() {
        this.clearCanvas();
        
        const buffer = this.editor.buffer;
        const firstLine = Math.floor(this.viewport.scrollTop / this.lineHeight);
        const lastLine = Math.min(
            firstLine + this.viewport.visibleLines + 1,
            buffer.getLineCount()
        );
        
        this.renderBackground();
        this.renderSelections();
        this.renderLines(firstLine, lastLine);
        this.renderCursor();
        this.renderLineNumbers();
        this.renderScrollbar();
    }

    clearCanvas() {
        const theme = this.editor.theme;
        this.ctx.fillStyle = theme ? theme.getColor('background') : '#1e1e1e';
        this.ctx.fillRect(0, 0, this.viewport.width, this.viewport.height);
    }

    renderBackground() {
        const theme = this.editor.theme;
        if (!theme) return;
        
        const cursor = this.editor.cursor;
        const y = (cursor.row * this.lineHeight) - this.viewport.scrollTop;
        
        if (this.editor.options.highlightCurrentLine && y >= 0 && y < this.viewport.height) {
            this.ctx.fillStyle = theme.getColor('lineHighlight');
            this.ctx.fillRect(0, y, this.viewport.width, this.lineHeight);
        }
    }

    renderSelections() {
        const theme = this.editor.theme;
        if (!theme) return;
        
        this.ctx.fillStyle = theme.getColor('selection');
        
        for (const selection of this.editor.selections) {
            this.renderSelection(selection);
        }
    }

    renderSelection(selection) {
        const start = selection.getStart();
        const end = selection.getEnd();
        
        for (let row = start.row; row <= end.row; row++) {
            const y = (row * this.lineHeight) - this.viewport.scrollTop;
            if (y > this.viewport.height || y + this.lineHeight < 0) continue;
            
            const line = this.editor.buffer.getLine(row);
            let startCol = row === start.row ? start.col : 0;
            let endCol = row === end.row ? end.col : line.length;
            
            const x1 = (startCol * this.charWidth) - this.viewport.scrollLeft;
            const x2 = (endCol * this.charWidth) - this.viewport.scrollLeft;
            
            this.ctx.fillRect(x1, y, x2 - x1, this.lineHeight);
        }
    }

    renderLines(firstLine, lastLine) {
        const theme = this.editor.theme;
        const syntax = this.editor.syntax;
        
        for (let row = firstLine; row < lastLine; row++) {
            const line = this.editor.buffer.getLine(row);
            const y = (row * this.lineHeight) - this.viewport.scrollTop;
            
            if (this.editor.buffer.isFolded(row)) continue;
            
            const cached = this.getCachedLine(row);
            if (cached && cached.version === this.editor.buffer.version) {
                this.drawCachedLine(cached, y);
            } else {
                const tokens = syntax ? syntax.tokenize(line) : [{ text: line, type: 'text' }];
                this.renderTokenizedLine(tokens, y, row);
                this.cacheLine(row, tokens);
            }
            
            if (this.editor.search && this.editor.search.hasMatches(row)) {
                this.renderSearchHighlights(row, y);
            }
        }
    }
    
    drawCachedLine(cached, y) {
        this.renderTokenizedLine(cached.tokens, y);
    }

    renderTokenizedLine(tokens, y, row) {
        const theme = this.editor.theme;
        let x = -this.viewport.scrollLeft;
        
        // Apply vertical offset to center text within line height
        const textY = y + this.textVerticalOffset;
        
        for (const token of tokens) {
            const color = theme ? theme.getSyntaxColor(token.type) : '#d4d4d4';
            this.ctx.fillStyle = color;
            
            const text = this.textMeasure.expandTabs(token.text);
            this.ctx.fillText(text, x, textY);
            
            x += this.textMeasure.measureText(token.text);
        }
    }

    renderCursor() {
        const cursor = this.editor.cursor;
        const x = (cursor.col * this.charWidth) - this.viewport.scrollLeft;
        const y = (cursor.row * this.lineHeight) - this.viewport.scrollTop;
        
        if (x >= -this.charWidth && x < this.viewport.width && 
            y >= -this.lineHeight && y < this.viewport.height) {
            
            const theme = this.editor.theme;
            this.ctx.fillStyle = theme ? theme.getColor('cursor') : '#aeafad';
            
            if (this.editor.mode && (this.editor.mode.name === 'normal' || this.editor.mode.name === 'visual')) {
                const line = this.editor.buffer.getLine(cursor.row);
                const charWidth = cursor.col < line.length ? this.charWidth : this.charWidth / 2;
                this.ctx.fillRect(x, y, charWidth, this.lineHeight);
                
                if (cursor.col < line.length) {
                    this.ctx.fillStyle = theme ? theme.getColor('background') : '#1e1e1e';
                    this.ctx.fillText(line[cursor.col], x, y + this.textVerticalOffset);
                }
            } else {
                this.ctx.fillRect(x, y, 2, this.lineHeight);
            }
        }
    }

    renderLineNumbers() {
        const lineNumbers = document.getElementById('line-numbers');
        const theme = this.editor.theme;
        const buffer = this.editor.buffer;
        
        lineNumbers.innerHTML = '';
        lineNumbers.style.color = theme ? theme.getColor('lineNumber') : '#858585';
        lineNumbers.style.fontSize = this.editor.options.fontSize + 'px';
        lineNumbers.style.fontFamily = this.editor.options.fontFamily;
        
        // Apply scroll offset to sync with canvas
        lineNumbers.style.transform = `translateY(${-this.viewport.scrollTop % this.lineHeight}px)`;
        
        const firstLine = Math.floor(this.viewport.scrollTop / this.lineHeight);
        const lastLine = Math.min(
            firstLine + this.viewport.visibleLines + 1,
            buffer.getLineCount()
        );
        
        for (let i = firstLine; i < lastLine; i++) {
            if (!buffer.isFolded(i)) {
                const div = document.createElement('div');
                div.textContent = i + 1;
                div.style.height = this.lineHeight + 'px';
                div.style.lineHeight = this.lineHeight + 'px';
                // Calculate padding to match canvas text centering
                const fontSize = parseInt(this.editor.options.fontSize);
                const padding = (this.lineHeight - fontSize) / 2; // No offset for line numbers (2px higher than canvas text)
                div.style.paddingTop = padding + 'px';
                div.style.paddingBottom = '0';
                div.style.boxSizing = 'border-box';
                
                if (i === this.editor.cursor.row) {
                    div.style.color = theme ? theme.getColor('currentLineNumber') : '#c6c6c6';
                    div.style.fontWeight = 'bold';
                }
                
                lineNumbers.appendChild(div);
            }
        }
    }

    renderScrollbar() {
        const buffer = this.editor.buffer;
        const totalHeight = buffer.getLineCount() * this.lineHeight;
        
        if (totalHeight > this.viewport.height) {
            const scrollbarHeight = Math.max(30, (this.viewport.height / totalHeight) * this.viewport.height);
            const scrollbarY = (this.viewport.scrollTop / totalHeight) * this.viewport.height;
            
            const theme = this.editor.theme;
            this.ctx.fillStyle = theme ? theme.getColor('scrollbar') : 'rgba(255, 255, 255, 0.1)';
            this.ctx.fillRect(this.viewport.width - 10, scrollbarY, 10, scrollbarHeight);
        }
    }

    renderSearchHighlights(row, y) {
        const matches = this.editor.search.getMatches(row);
        const theme = this.editor.theme;
        
        this.ctx.fillStyle = theme ? theme.getColor('searchHighlight') : 'rgba(255, 235, 59, 0.3)';
        
        for (const match of matches) {
            const x = (match.start * this.charWidth) - this.viewport.scrollLeft;
            const width = (match.end - match.start) * this.charWidth;
            this.ctx.fillRect(x, y, width, this.lineHeight);
        }
    }

    ensureCursorVisible() {
        const cursor = this.editor.cursor;
        const cursorY = cursor.row * this.lineHeight;
        const cursorX = cursor.col * this.charWidth;
        
        if (cursorY < this.viewport.scrollTop) {
            this.viewport.scrollTop = cursorY;
        } else if (cursorY + this.lineHeight > this.viewport.scrollTop + this.viewport.height) {
            this.viewport.scrollTop = cursorY + this.lineHeight - this.viewport.height;
        }
        
        if (cursorX < this.viewport.scrollLeft) {
            this.viewport.scrollLeft = cursorX;
        } else if (cursorX + this.charWidth > this.viewport.scrollLeft + this.viewport.width) {
            this.viewport.scrollLeft = cursorX + this.charWidth - this.viewport.width;
        }
        
        this.invalidate();
    }

    scroll(direction, amount) {
        switch (direction) {
            case 'up':
                this.viewport.scrollTop = Math.max(0, this.viewport.scrollTop - amount);
                break;
            case 'down':
                const maxScroll = this.editor.buffer.getLineCount() * this.lineHeight - this.viewport.height;
                this.viewport.scrollTop = Math.min(maxScroll, this.viewport.scrollTop + amount);
                break;
            case 'left':
                this.viewport.scrollLeft = Math.max(0, this.viewport.scrollLeft - amount);
                break;
            case 'right':
                this.viewport.scrollLeft += amount;
                break;
        }
        
        this.invalidate();
    }

    pageUp() {
        this.scroll('up', this.viewport.height - this.lineHeight);
    }

    pageDown() {
        this.scroll('down', this.viewport.height - this.lineHeight);
    }

    getCachedLine(row) {
        return this.cache.lines.get(row);
    }

    cacheLine(row, tokens) {
        this.cache.lines.set(row, {
            tokens,
            version: this.editor.buffer.version
        });
    }

    invalidate() {
        requestAnimationFrame(() => this.render());
    }

    invalidateLines(startRow, endRow) {
        for (let row = startRow; row <= endRow; row++) {
            this.cache.lines.delete(row);
        }
        this.invalidate();
    }

    clearCache() {
        this.cache.lines.clear();
        this.cache.version = -1;
    }
    
    getXForColumn(row, col) {
        const lineNumberWidth = this.editor.options.lineNumbers ? this.getLineNumberWidth() : 0;
        const line = this.editor.buffer.getLine(row);
        const text = line.substring(0, col);
        const textWidth = this.textMeasure.measureText(text);
        return lineNumberWidth + textWidth - this.viewport.scrollLeft;
    }
    
    getYForRow(row) {
        return row * this.lineHeight - this.viewport.scrollTop;
    }
}