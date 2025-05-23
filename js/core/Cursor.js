class Cursor {
    constructor(buffer, row = 0, col = 0) {
        this.buffer = buffer;
        this.row = row;
        this.col = col;
        this.desiredCol = col;
        this.mark = null;
    }

    getPosition() {
        return { row: this.row, col: this.col };
    }

    setPosition(row, col) {
        this.row = this.clampRow(row);
        this.col = this.clampCol(this.row, col);
        this.desiredCol = this.col;
    }

    moveToPosition(pos) {
        this.setPosition(pos.row, pos.col);
    }

    clampRow(row) {
        return Math.max(0, Math.min(row, this.buffer.getLineCount() - 1));
    }

    clampCol(row, col) {
        const line = this.buffer.getLine(row);
        return Math.max(0, Math.min(col, line.length));
    }

    moveUp(count = 1) {
        this.row = this.clampRow(this.row - count);
        this.col = this.clampCol(this.row, this.desiredCol);
    }

    moveDown(count = 1) {
        this.row = this.clampRow(this.row + count);
        this.col = this.clampCol(this.row, this.desiredCol);
    }

    moveLeft(count = 1) {
        for (let i = 0; i < count; i++) {
            if (this.col > 0) {
                this.col--;
            } else if (this.row > 0) {
                this.row--;
                this.col = this.buffer.getLine(this.row).length;
            }
        }
        this.desiredCol = this.col;
    }

    moveRight(count = 1) {
        for (let i = 0; i < count; i++) {
            const lineLength = this.buffer.getLine(this.row).length;
            if (this.col < lineLength) {
                this.col++;
            } else if (this.row < this.buffer.getLineCount() - 1) {
                this.row++;
                this.col = 0;
            }
        }
        this.desiredCol = this.col;
    }

    moveToLineStart() {
        this.col = 0;
        this.desiredCol = 0;
    }

    moveToLineEnd() {
        this.col = this.buffer.getLine(this.row).length;
        this.desiredCol = this.col;
    }

    moveToFirstNonWhitespace() {
        const line = this.buffer.getLine(this.row);
        const match = line.match(/\S/);
        this.col = match ? match.index : 0;
        this.desiredCol = this.col;
    }

    moveWordForward() {
        const line = this.buffer.getLine(this.row);
        let col = this.col;
        
        while (col < line.length && /\W/.test(line[col])) col++;
        while (col < line.length && /\w/.test(line[col])) col++;
        
        if (col >= line.length && this.row < this.buffer.getLineCount() - 1) {
            this.row++;
            this.col = 0;
        } else {
            this.col = col;
        }
        this.desiredCol = this.col;
    }

    moveWordBackward() {
        const line = this.buffer.getLine(this.row);
        let col = this.col;
        
        if (col > 0) col--;
        while (col > 0 && /\W/.test(line[col])) col--;
        while (col > 0 && /\w/.test(line[col - 1])) col--;
        
        if (col === 0 && this.col === 0 && this.row > 0) {
            this.row--;
            this.col = this.buffer.getLine(this.row).length;
        } else {
            this.col = col;
        }
        this.desiredCol = this.col;
    }

    moveToBufferStart() {
        this.row = 0;
        this.col = 0;
        this.desiredCol = 0;
    }

    moveToBufferEnd() {
        this.row = this.buffer.getLineCount() - 1;
        this.col = this.buffer.getLine(this.row).length;
        this.desiredCol = this.col;
    }

    moveToLine(lineNumber) {
        this.row = this.clampRow(lineNumber - 1);
        this.col = this.clampCol(this.row, this.desiredCol);
    }

    findNext(pattern, options = {}) {
        const regex = new RegExp(pattern, options.ignoreCase ? 'i' : '');
        const startRow = this.row;
        const startCol = this.col + 1;

        for (let row = startRow; row < this.buffer.getLineCount(); row++) {
            const line = this.buffer.getLine(row);
            const searchStart = row === startRow ? startCol : 0;
            const match = line.substring(searchStart).match(regex);
            
            if (match) {
                this.row = row;
                this.col = searchStart + match.index;
                this.desiredCol = this.col;
                return true;
            }
        }

        if (options.wrap) {
            for (let row = 0; row <= startRow; row++) {
                const line = this.buffer.getLine(row);
                const searchEnd = row === startRow ? startCol : line.length;
                const match = line.substring(0, searchEnd).match(regex);
                
                if (match) {
                    this.row = row;
                    this.col = match.index;
                    this.desiredCol = this.col;
                    return true;
                }
            }
        }

        return false;
    }

    findPrevious(pattern, options = {}) {
        const regex = new RegExp(pattern, options.ignoreCase ? 'ig' : 'g');
        const startRow = this.row;
        const startCol = this.col;

        for (let row = startRow; row >= 0; row--) {
            const line = this.buffer.getLine(row);
            const searchEnd = row === startRow ? startCol : line.length;
            const searchStr = line.substring(0, searchEnd);
            
            let lastMatch = null;
            let match;
            while ((match = regex.exec(searchStr)) !== null) {
                lastMatch = match;
            }
            
            if (lastMatch) {
                this.row = row;
                this.col = lastMatch.index;
                this.desiredCol = this.col;
                return true;
            }
        }

        if (options.wrap) {
            for (let row = this.buffer.getLineCount() - 1; row >= startRow; row--) {
                const line = this.buffer.getLine(row);
                const searchStart = row === startRow ? startCol : 0;
                const searchStr = line.substring(searchStart);
                
                let lastMatch = null;
                let match;
                while ((match = regex.exec(searchStr)) !== null) {
                    lastMatch = match;
                }
                
                if (lastMatch) {
                    this.row = row;
                    this.col = searchStart + lastMatch.index;
                    this.desiredCol = this.col;
                    return true;
                }
            }
        }

        return false;
    }

    setMark(name) {
        this.buffer.setMark(name, this.getPosition());
    }

    jumpToMark(name) {
        const mark = this.buffer.getMark(name);
        if (mark) {
            this.moveToPosition(mark);
        }
    }

    clone() {
        return new Cursor(this.buffer, this.row, this.col);
    }
}