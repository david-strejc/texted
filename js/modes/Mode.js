class Mode {
    constructor(editor) {
        this.editor = editor;
        this.name = 'base';
        this.keymap = new Map();
        this.statusText = '';
    }

    enter() {
        this.editor.emit('modeChange', this.name);
    }

    exit() {}

    handleKey(event) {
        const key = this.normalizeKey(event);
        const handler = this.keymap.get(key);
        
        // Debug logging for undo/redo
        if (key === 'C-z' || key === 'C-y') {
            console.log(`Mode: ${this.name}, Key: ${key}, Handler found: ${!!handler}`);
            console.log('Available keys:', Array.from(this.keymap.keys()));
        }
        
        if (handler) {
            handler.call(this, event);
            return true;
        }
        
        return false;
    }

    normalizeKey(event) {
        let key = '';
        
        if (event.ctrlKey) key += 'C-';
        if (event.altKey) key += 'M-';
        if (event.metaKey) key += 'S-';
        
        if (event.key.length === 1) {
            key += event.key.toLowerCase();
        } else {
            const specialKeys = {
                'Enter': 'Return',
                'Escape': 'Escape',
                'Backspace': 'Backspace',
                'Tab': 'Tab',
                'Delete': 'Delete',
                'ArrowUp': 'Up',
                'ArrowDown': 'Down',
                'ArrowLeft': 'Left',
                'ArrowRight': 'Right',
                'Home': 'Home',
                'End': 'End',
                'PageUp': 'PageUp',
                'PageDown': 'PageDown',
                ' ': 'Space'
            };
            
            key += specialKeys[event.key] || event.key;
        }
        
        // Debug logging
        if (event.ctrlKey && (event.key === 'z' || event.key === 'y')) {
            console.log('Normalized key:', key, 'for event:', event.key);
        }
        
        return key;
    }

    bindKey(key, handler) {
        this.keymap.set(key, handler);
    }

    bindKeys(bindings) {
        for (const [key, handler] of Object.entries(bindings)) {
            this.bindKey(key, handler);
        }
    }

    getStatusText() {
        return this.statusText;
    }

    setStatusText(text) {
        this.statusText = text;
        this.editor.emit('statusUpdate');
    }
}