document.addEventListener('DOMContentLoaded', () => {
    const editor = new Editor({
        fontSize: 14,
        fontFamily: 'Consolas, Monaco, monospace',
        tabSize: 4,
        insertSpaces: true,
        lineNumbers: true,
        highlightCurrentLine: true,
        theme: 'dark'
    });
    
    window.editor = editor;
    
    // Initialize commands
    editor.commands = new EditorCommands(editor);
    
    const sampleText = `// Welcome to TxtEd - Advanced Text Editor
// This is a feature-rich text editor inspired by Vim and Emacs

function fibonacci(n) {
    if (n <= 1) return n;
    
    let prev = 0;
    let current = 1;
    
    for (let i = 2; i <= n; i++) {
        const temp = current;
        current = prev + current;
        prev = temp;
    }
    
    return current;
}

class Editor {
    constructor(options) {
        this.options = options;
        this.buffer = new Buffer();
        this.cursor = new Cursor(this.buffer);
        this.mode = 'normal';
    }
    
    insertText(text) {
        const pos = this.cursor.getPosition();
        this.buffer.insert(pos, text);
        this.cursor.moveRight(text.length);
    }
    
    deleteChar() {
        const pos = this.cursor.getPosition();
        if (pos.col > 0) {
            this.buffer.delete(
                { row: pos.row, col: pos.col - 1 },
                pos
            );
            this.cursor.moveLeft();
        }
    }
}

// Key bindings:
// - Normal mode: h/j/k/l for navigation, i for insert mode
// - Insert mode: Type normally, ESC to return to normal mode
// - Visual mode: v to start selection, y to yank, d to delete
// - Command mode: : to enter, type commands like :w, :q, :wq

const commands = {
    'w': () => editor.save(),
    'q': () => editor.quit(),
    'wq': () => {
        editor.save();
        editor.quit();
    }
};

// Try these features:
// 1. Press 'i' to enter insert mode and start typing
// 2. Press 'ESC' to return to normal mode
// 3. Use 'h', 'j', 'k', 'l' to navigate
// 4. Press 'v' to start visual selection
// 5. Press ':' to enter command mode
// 6. Try 'dd' to delete a line
// 7. Press 'u' to undo, 'Ctrl+r' to redo`;
    
    // Replace the buffer content instead of creating a new buffer
    editor.buffer.lines = sampleText.split('\n');
    editor.buffer.version++;
    editor.buffer.emit('change', {
        action: 'replace',
        start: { row: 0, col: 0 },
        end: { row: editor.buffer.getLineCount() - 1, col: editor.buffer.getLine(editor.buffer.getLineCount() - 1).length },
        text: sampleText
    });
    
    // Update cursor to use the existing buffer
    editor.cursor.buffer = editor.buffer;
    editor.cursor.setPosition(0, 0);
    editor.renderer.invalidate();
    
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            editor.commandPalette.show();
        }
    });
    
    editor.on('quit', () => {
        if (confirm('Are you sure you want to quit?')) {
            window.close();
        }
    });
    
    const preventDefaults = ['Tab', 'Enter', 'Backspace', 'Delete'];
    document.addEventListener('keydown', (e) => {
        if (preventDefaults.includes(e.key)) {
            e.preventDefault();
        }
    });
    
    console.log('TxtEd v1.0.9 initialized successfully!');
    console.log('Press Ctrl+P to open command palette');
    console.log('Version updated: Fixed undo/redo - buffer replacement issue resolved');
});