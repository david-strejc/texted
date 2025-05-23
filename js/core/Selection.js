class Selection {
    constructor(buffer, anchor, head) {
        this.buffer = buffer;
        this.anchor = anchor || { row: 0, col: 0 };
        this.head = head || { row: 0, col: 0 };
    }

    isEmpty() {
        return this.anchor.row === this.head.row && this.anchor.col === this.head.col;
    }

    getStart() {
        if (this.anchor.row < this.head.row || 
            (this.anchor.row === this.head.row && this.anchor.col < this.head.col)) {
            return this.anchor;
        }
        return this.head;
    }

    getEnd() {
        if (this.anchor.row > this.head.row || 
            (this.anchor.row === this.head.row && this.anchor.col > this.head.col)) {
            return this.anchor;
        }
        return this.head;
    }

    getText() {
        if (this.isEmpty()) return '';
        return this.buffer.getText(this.getStart(), this.getEnd());
    }

    contains(pos) {
        const start = this.getStart();
        const end = this.getEnd();
        
        if (pos.row < start.row || pos.row > end.row) return false;
        if (pos.row === start.row && pos.col < start.col) return false;
        if (pos.row === end.row && pos.col > end.col) return false;
        
        return true;
    }

    setAnchor(pos) {
        this.anchor = { ...pos };
    }

    setHead(pos) {
        this.head = { ...pos };
    }

    collapse(toAnchor = true) {
        if (toAnchor) {
            this.head = { ...this.anchor };
        } else {
            this.anchor = { ...this.head };
        }
    }

    expandToWord() {
        const line = this.buffer.getLine(this.head.row);
        let start = this.head.col;
        let end = this.head.col;

        while (start > 0 && /\w/.test(line[start - 1])) start--;
        while (end < line.length && /\w/.test(line[end])) end++;

        this.anchor = { row: this.head.row, col: start };
        this.head = { row: this.head.row, col: end };
    }

    expandToLine() {
        this.anchor = { row: this.head.row, col: 0 };
        this.head = { row: this.head.row, col: this.buffer.getLine(this.head.row).length };
    }

    expandToBrackets() {
        const brackets = { '(': ')', '[': ']', '{': '}', '<': '>' };
        const reverseBrackets = { ')': '(', ']': '[', '}': '{', '>': '<' };
        
        const findMatchingBracket = (startPos, bracket, forward) => {
            const matchBracket = forward ? brackets[bracket] : reverseBrackets[bracket];
            let count = 1;
            let pos = { ...startPos };
            
            while (count > 0) {
                if (forward) {
                    pos.col++;
                    if (pos.col >= this.buffer.getLine(pos.row).length) {
                        if (pos.row >= this.buffer.getLineCount() - 1) break;
                        pos.row++;
                        pos.col = 0;
                    }
                } else {
                    pos.col--;
                    if (pos.col < 0) {
                        if (pos.row <= 0) break;
                        pos.row--;
                        pos.col = this.buffer.getLine(pos.row).length - 1;
                    }
                }
                
                const char = this.buffer.getLine(pos.row)[pos.col];
                if (char === bracket) count++;
                else if (char === matchBracket) count--;
            }
            
            return count === 0 ? pos : null;
        };

        const line = this.buffer.getLine(this.head.row);
        const char = line[this.head.col];
        
        if (brackets[char]) {
            const endPos = findMatchingBracket(this.head, char, true);
            if (endPos) {
                this.anchor = { ...this.head };
                this.head = endPos;
                this.head.col++;
            }
        } else if (reverseBrackets[char]) {
            const startPos = findMatchingBracket(this.head, char, false);
            if (startPos) {
                this.anchor = { ...this.head };
                this.anchor.col++;
                this.head = startPos;
            }
        }
    }

    clone() {
        return new Selection(this.buffer, { ...this.anchor }, { ...this.head });
    }
}