class TextMeasure {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.cache = new Map();
        this.tabSize = 4;
    }

    setFont(font) {
        this.font = font;
        this.ctx.font = font;
        this.cache.clear();
        this.measureBasicMetrics();
    }

    measureBasicMetrics() {
        const metrics = this.ctx.measureText('M');
        this.charWidth = metrics.width;
        this.lineHeight = parseInt(this.font.match(/\d+/)[0]) * 1.5;
        this.baseline = this.lineHeight * 0.8;
    }

    measureText(text) {
        if (this.cache.has(text)) {
            return this.cache.get(text);
        }

        const expandedText = this.expandTabs(text);
        const width = this.ctx.measureText(expandedText).width;
        
        this.cache.set(text, width);
        return width;
    }

    measureLine(line) {
        return this.measureText(line);
    }

    expandTabs(text) {
        if (!text.includes('\t')) return text;
        
        let result = '';
        let col = 0;
        
        for (const char of text) {
            if (char === '\t') {
                const spaces = this.tabSize - (col % this.tabSize);
                result += ' '.repeat(spaces);
                col += spaces;
            } else {
                result += char;
                col++;
            }
        }
        
        return result;
    }

    getCharIndexAtX(line, x) {
        const expanded = this.expandTabs(line);
        let currentX = 0;
        let charIndex = 0;
        let expandedIndex = 0;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            let charWidth;
            
            if (char === '\t') {
                const spaces = this.tabSize - (expandedIndex % this.tabSize);
                charWidth = this.charWidth * spaces;
                expandedIndex += spaces;
            } else {
                charWidth = this.charWidth;
                expandedIndex++;
            }
            
            if (currentX + charWidth / 2 > x) {
                return i;
            }
            
            currentX += charWidth;
        }
        
        return line.length;
    }

    getXAtCharIndex(line, index) {
        if (index === 0) return 0;
        
        const substring = line.substring(0, index);
        return this.measureText(substring);
    }

    getLineHeight() {
        return this.lineHeight;
    }

    getCharWidth() {
        return this.charWidth;
    }

    getBaseline() {
        return this.baseline;
    }

    clearCache() {
        this.cache.clear();
    }
}