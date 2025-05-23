# TxtEd - Advanced Text Editor

A feature-rich text editor built in pure JavaScript, inspired by Vim and Emacs with modern enhancements.

## Features

- **Modal Editing**: Vim-style modes (Normal, Insert, Visual, Command)
- **Multi-cursor Support**: Edit multiple locations simultaneously
- **Syntax Highlighting**: Support for multiple languages
- **Themes**: Dark, Light, Solarized, and Monokai themes
- **Advanced Navigation**: Word, line, and block movements
- **Search & Replace**: Regular expression support
- **Code Folding**: Collapse and expand code blocks
- **Minimap**: Visual overview of your code
- **Command Palette**: Quick access to all commands (Ctrl+P)
- **Undo/Redo**: Intelligent grouping of changes with visual history
- **Auto-indentation**: Smart indentation and bracket matching

### New Advanced Features

- **Time Travel** (`Ctrl+T`): Visual timeline of all changes with preview
- **Collaborative Cursors** (`Ctrl+Shift+C`): Simulated multi-user editing
- **AI Assistant** (`Ctrl+Shift+A`): Context-aware code suggestions and refactoring hints
- **Visual History** (`Ctrl+Shift+H`): Interactive graph of editing session
- **Ghost Cursors** (`Ctrl+Alt+G`): Shows previous cursor positions
- **Zen Mode** (`Ctrl+K Z`): Distraction-free editing environment
- **Intelligent Brackets**: Auto-pairing with rainbow highlighting
- **Code Lens** (`Ctrl+Shift+L`): Inline complexity metrics
- **Smart Paste** (`Ctrl+Shift+V`): Context-aware pasting
- **Semantic Navigation** (`Ctrl+Shift+O`): Go to symbol
- **Markdown Preview** (`Ctrl+Shift+M`): Live preview with sync
- **Minimap Annotations**: Visual markers and tooltips

## Quick Start

### Starting the Server

```bash
./server.sh start
```

Then open http://localhost:8080 in your browser.

### Server Management

```bash
./server.sh start    # Start the server
./server.sh stop     # Stop the server
./server.sh restart  # Restart the server
./server.sh status   # Check server status
./server.sh logs     # View server logs
```

## Key Bindings

### Normal Mode
- `h/j/k/l` - Move left/down/up/right
- `w/b` - Move word forward/backward
- `0/$` - Move to line start/end
- `gg/G` - Go to file start/end
- `i` - Enter insert mode
- `v` - Enter visual mode
- `:` - Enter command mode
- `dd` - Delete line
- `yy` - Yank (copy) line
- `p` - Paste
- `u` - Undo
- `Ctrl+r` - Redo
- `Ctrl+Z` - Undo (alternative)
- `Ctrl+Y` - Redo (alternative)
- `/` - Search
- `n/N` - Next/previous search result

### Insert Mode
- `ESC` or `Ctrl+[` - Return to normal mode
- `Ctrl+n` - Auto-complete
- `Tab` - Indent or expand snippet
- `Ctrl+t/d` - Indent/outdent line

### Visual Mode
- `ESC` - Return to normal mode
- `y` - Yank selection
- `d` - Delete selection
- `c` - Change selection
- `>/<` - Indent/outdent selection

### Command Mode
- `:w` - Save file
- `:q` - Quit
- `:wq` - Save and quit
- `:theme <name>` - Change theme
- `:set <option>` - Set editor option

### Global
- `Ctrl+P` - Open command palette

## Architecture

The editor is built with a modular architecture:

- **Core**: Buffer management, cursor control, undo/redo
- **Modes**: Vim-style modal editing system
- **UI**: Canvas-based rendering, themes, status bar
- **Features**: Search, syntax highlighting, auto-completion

## Browser Compatibility

Works best in modern browsers with Canvas support:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

MIT License