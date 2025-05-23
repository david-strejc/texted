class Buffer extends EventEmitter {
    constructor(content = '') {
        super();
        this.lines = content ? content.split('\n') : [''];
        this.version = 0;
        this.dirty = false;
        this.marks = new Map();
        this.folds = [];
    }

    getLine(row) {
        return this.lines[row] || '';
    }

    getLines(startRow, endRow) {
        return this.lines.slice(startRow, endRow + 1);
    }

    getLineCount() {
        return this.lines.length;
    }

    getText(startPos, endPos) {
        if (!endPos) {
            return this.lines.join('\n');
        }

        const lines = [];
        for (let row = startPos.row; row <= endPos.row; row++) {
            const line = this.getLine(row);
            if (row === startPos.row && row === endPos.row) {
                lines.push(line.substring(startPos.col, endPos.col));
            } else if (row === startPos.row) {
                lines.push(line.substring(startPos.col));
            } else if (row === endPos.row) {
                lines.push(line.substring(0, endPos.col));
            } else {
                lines.push(line);
            }
        }
        return lines.join('\n');
    }

    insert(pos, text) {
        const lines = text.split('\n');
        const line = this.getLine(pos.row);
        const before = line.substring(0, pos.col);
        const after = line.substring(pos.col);

        if (lines.length === 1) {
            this.lines[pos.row] = before + lines[0] + after;
        } else {
            const newLines = [before + lines[0]];
            for (let i = 1; i < lines.length - 1; i++) {
                newLines.push(lines[i]);
            }
            newLines.push(lines[lines.length - 1] + after);
            this.lines.splice(pos.row, 1, ...newLines);
        }

        this.version++;
        this.dirty = true;
        this.emit('change', {
            action: 'insert',
            start: pos,
            end: this.offsetPosition(pos, text),
            text: text
        });

        return this.offsetPosition(pos, text);
    }

    delete(startPos, endPos) {
        const deletedText = this.getText(startPos, endPos);
        
        if (startPos.row === endPos.row) {
            const line = this.getLine(startPos.row);
            this.lines[startPos.row] = line.substring(0, startPos.col) + line.substring(endPos.col);
        } else {
            const firstLine = this.getLine(startPos.row).substring(0, startPos.col);
            const lastLine = this.getLine(endPos.row).substring(endPos.col);
            this.lines.splice(startPos.row, endPos.row - startPos.row + 1, firstLine + lastLine);
        }

        this.version++;
        this.dirty = true;
        this.emit('change', {
            action: 'delete',
            start: startPos,
            end: endPos,
            text: deletedText
        });

        return startPos;
    }

    replace(startPos, endPos, text) {
        this.delete(startPos, endPos);
        return this.insert(startPos, text);
    }

    offsetPosition(pos, text) {
        const lines = text.split('\n');
        if (lines.length === 1) {
            return { row: pos.row, col: pos.col + text.length };
        } else {
            return {
                row: pos.row + lines.length - 1,
                col: lines[lines.length - 1].length
            };
        }
    }

    setMark(name, pos) {
        this.marks.set(name, { ...pos });
    }

    getMark(name) {
        return this.marks.get(name);
    }

    addFold(startRow, endRow) {
        this.folds.push({ startRow, endRow, collapsed: true });
        this.folds.sort((a, b) => a.startRow - b.startRow);
        this.emit('fold', { startRow, endRow });
    }

    toggleFold(row) {
        const fold = this.folds.find(f => f.startRow <= row && row <= f.endRow);
        if (fold) {
            fold.collapsed = !fold.collapsed;
            this.emit('fold', fold);
        }
    }

    isFolded(row) {
        return this.folds.some(f => f.collapsed && f.startRow < row && row <= f.endRow);
    }

    getVisibleRows() {
        const visible = [];
        for (let i = 0; i < this.lines.length; i++) {
            if (!this.isFolded(i)) {
                visible.push(i);
            }
        }
        return visible;
    }

    save() {
        this.dirty = false;
        this.emit('save');
    }
}