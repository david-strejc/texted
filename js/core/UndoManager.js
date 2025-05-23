class UndoManager {
    constructor(buffer, maxStackSize = 1000) {
        this.buffer = buffer;
        this.undoStack = [];
        this.redoStack = [];
        this.maxStackSize = maxStackSize;
        this.currentGroup = null;
        this.lastChange = null;
        
        this.buffer.on('change', this.handleChange.bind(this));
    }

    handleChange(change) {
        console.log('UndoManager.handleChange called:', change);
        if (this.isUndoing || this.isRedoing) {
            console.log('Ignoring change during undo/redo');
            return;
        }

        const entry = {
            action: change.action,
            start: { ...change.start },
            end: { ...change.end },
            text: change.text,
            timestamp: Date.now()
        };

        if (this.currentGroup) {
            this.currentGroup.changes.push(entry);
            console.log('Added to current group');
        } else if (this.shouldMergeWithLast(entry)) {
            this.mergeWithLast(entry);
            console.log('Merged with last entry');
        } else {
            this.pushEntry(entry);
            console.log('Pushed new entry, stack length:', this.undoStack.length);
        }

        this.redoStack = [];
        this.lastChange = entry;
    }

    shouldMergeWithLast(entry) {
        if (!this.lastChange || this.undoStack.length === 0) return false;
        
        const lastGroup = this.undoStack[this.undoStack.length - 1];
        const lastEntry = lastGroup.changes[lastGroup.changes.length - 1];
        
        if (entry.timestamp - lastEntry.timestamp > 1000) return false;
        
        if (entry.action === 'insert' && lastEntry.action === 'insert') {
            return entry.start.row === lastEntry.end.row && 
                   entry.start.col === lastEntry.end.col &&
                   entry.text.length === 1 && 
                   !/\s/.test(entry.text);
        }
        
        if (entry.action === 'delete' && lastEntry.action === 'delete') {
            return entry.end.row === lastEntry.start.row && 
                   entry.end.col === lastEntry.start.col;
        }
        
        return false;
    }

    mergeWithLast(entry) {
        const lastGroup = this.undoStack[this.undoStack.length - 1];
        const lastEntry = lastGroup.changes[lastGroup.changes.length - 1];
        
        if (entry.action === 'insert') {
            lastEntry.end = { ...entry.end };
            lastEntry.text += entry.text;
        } else if (entry.action === 'delete') {
            lastEntry.start = { ...entry.start };
            lastEntry.text = entry.text + lastEntry.text;
        }
        
        lastEntry.timestamp = entry.timestamp;
    }

    pushEntry(entry) {
        this.undoStack.push({
            changes: [entry],
            cursorBefore: null,
            cursorAfter: null
        });
        
        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift();
        }
    }

    beginGroup() {
        if (!this.currentGroup) {
            this.currentGroup = {
                changes: [],
                cursorBefore: null,
                cursorAfter: null
            };
        }
    }

    endGroup() {
        if (this.currentGroup && this.currentGroup.changes.length > 0) {
            this.undoStack.push(this.currentGroup);
            if (this.undoStack.length > this.maxStackSize) {
                this.undoStack.shift();
            }
        }
        this.currentGroup = null;
    }

    undo() {
        console.log('UndoManager.undo() - stack length:', this.undoStack.length);
        if (this.undoStack.length === 0) return null;
        
        this.isUndoing = true;
        const group = this.undoStack.pop();
        console.log('Undoing group with', group.changes.length, 'changes');
        const undoneGroup = {
            changes: [],
            cursorBefore: group.cursorAfter,
            cursorAfter: group.cursorBefore
        };
        
        for (let i = group.changes.length - 1; i >= 0; i--) {
            const change = group.changes[i];
            let undoneChange;
            
            if (change.action === 'insert') {
                this.buffer.delete(change.start, change.end);
                undoneChange = {
                    action: 'delete',
                    start: change.start,
                    end: change.end,
                    text: change.text
                };
            } else if (change.action === 'delete') {
                this.buffer.insert(change.start, change.text);
                undoneChange = {
                    action: 'insert',
                    start: change.start,
                    end: change.end,
                    text: change.text
                };
            }
            
            undoneGroup.changes.unshift(undoneChange);
        }
        
        this.redoStack.push(undoneGroup);
        this.isUndoing = false;
        
        return group.cursorBefore;
    }

    redo() {
        if (this.redoStack.length === 0) return null;
        
        this.isRedoing = true;
        const group = this.redoStack.pop();
        const redoneGroup = {
            changes: [],
            cursorBefore: group.cursorAfter,
            cursorAfter: group.cursorBefore
        };
        
        for (const change of group.changes) {
            let redoneChange;
            
            if (change.action === 'insert') {
                this.buffer.insert(change.start, change.text);
                redoneChange = {
                    action: 'insert',
                    start: change.start,
                    end: change.end,
                    text: change.text
                };
            } else if (change.action === 'delete') {
                this.buffer.delete(change.start, change.end);
                redoneChange = {
                    action: 'delete',
                    start: change.start,
                    end: change.end,
                    text: change.text
                };
            }
            
            redoneGroup.changes.push(redoneChange);
        }
        
        this.undoStack.push(redoneGroup);
        this.isRedoing = false;
        
        return group.cursorAfter;
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.currentGroup = null;
        this.lastChange = null;
    }

    saveCursorState(before, after) {
        if (this.currentGroup) {
            this.currentGroup.cursorBefore = before;
            this.currentGroup.cursorAfter = after;
        } else if (this.undoStack.length > 0) {
            const lastGroup = this.undoStack[this.undoStack.length - 1];
            if (!lastGroup.cursorBefore) lastGroup.cursorBefore = before;
            lastGroup.cursorAfter = after;
        }
    }
}