# 🚀 TxtEd - Advanced Text Editor

<div align="center">

![TxtEd Logo](https://img.shields.io/badge/TxtEd-v1.0.9-blue?style=for-the-badge&logo=javascript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Pure JS](https://img.shields.io/badge/Pure-JavaScript-yellow?style=for-the-badge&logo=javascript)
![No Dependencies](https://img.shields.io/badge/Dependencies-None-red?style=for-the-badge)

**A powerful, web-based text editor inspired by Vim and Emacs**

[Features](#-features) • [Quick Start](#-quick-start) • [Usage](#-usage) • [Key Bindings](#-key-bindings) • [Architecture](#-architecture)

</div>

---

## ✨ Features

### 🎯 Core Features
- **📝 Modal Editing** - Vim-style modal editing (Normal, Insert, Visual, Command)
- **🎨 Canvas Rendering** - High-performance text rendering using HTML5 Canvas
- **↩️ Undo/Redo** - Full undo/redo support with intelligent grouping
- **📋 Registers** - Multiple registers for yanking and pasting
- **🔍 Search** - Fast text search with highlighting
- **📐 Line Numbers** - Configurable line numbers with current line highlighting

### 🚀 Advanced Features

<table>
<tr>
<td width="50%">

#### 🤖 AI Assistant
Intelligent code suggestions and completions

#### ⏰ Time Travel
Visual timeline of all your changes

#### 👥 Collaborative Cursors
Multi-user editing simulation

#### 📊 Visual History
Interactive graph of your editing history

</td>
<td width="50%">

#### 👻 Ghost Cursors
See your previous cursor positions

#### 🧘 Zen Mode
Distraction-free writing environment

#### 📈 Code Lens
Inline complexity metrics

#### 🔀 Split View
Edit multiple files side by side

</td>
</tr>
</table>

### 🎨 Modern Enhancements
- **🎯 Smart Paste** - Context-aware pasting
- **🔗 Intelligent Brackets** - Auto-pairing and navigation
- **📝 Markdown Preview** - Live preview as you type
- **🗺️ Minimap** - Code overview with annotations
- **🎨 Themes** - Dark and light themes

## 🚀 Quick Start

### Prerequisites
- Any modern web browser
- Python 3.x (for development server)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/txted.git
cd txted

# Start the development server
./server.sh start

# Open in browser
# Navigate to http://localhost:8080
```

### Server Commands

```bash
./server.sh start    # Start the server
./server.sh stop     # Stop the server
./server.sh restart  # Restart the server
./server.sh status   # Check server status
./server.sh logs     # View server logs
```

## 🎮 Usage

### Modal Editing

TxtEd uses Vim-style modal editing:

| Mode | Description | Enter |
|------|-------------|-------|
| **Normal** | Navigation and commands | `ESC` |
| **Insert** | Text insertion | `i`, `a`, `o` |
| **Visual** | Text selection | `v`, `V` |
| **Command** | Ex commands | `:` |

### 📋 Key Bindings

<details>
<summary><b>Normal Mode</b></summary>

#### Navigation
- `h`, `j`, `k`, `l` - Move cursor (left, down, up, right)
- `w`, `b`, `e` - Word navigation
- `0`, `$` - Line start/end
- `gg`, `G` - File start/end
- `Ctrl+d`, `Ctrl+u` - Half page down/up

#### Editing
- `i`, `a` - Insert before/after cursor
- `I`, `A` - Insert at line start/end
- `o`, `O` - New line below/above
- `x`, `X` - Delete character
- `dd` - Delete line
- `yy` - Yank (copy) line
- `p`, `P` - Paste after/before

#### Other
- `u` - Undo
- `Ctrl+r` - Redo
- `/` - Search forward
- `v` - Visual mode
- `:` - Command mode

</details>

<details>
<summary><b>Insert Mode</b></summary>

- `ESC` or `Ctrl+[` - Return to Normal mode
- `Ctrl+z` - Undo
- `Ctrl+y` - Redo
- `Ctrl+n` - Autocomplete
- `Ctrl+t` - Indent
- `Ctrl+d` - Outdent

</details>

<details>
<summary><b>Command Mode</b></summary>

- `:w` - Save file
- `:q` - Quit
- `:wq` - Save and quit
- `:set number` - Toggle line numbers
- `:theme dark` - Set dark theme

</details>

### 🎨 Command Palette

Press `Ctrl+P` to open the command palette for quick access to all commands:

- 🔄 Undo/Redo
- 🕐 Time Travel
- 📋 Smart Paste
- 🧘 Zen Mode
- 👻 Ghost Cursors
- 🤖 AI Assistant
- And many more...

## 🏗️ Architecture

```
txted/
├── 📁 js/
│   ├── 📁 core/          # Core components
│   │   ├── Buffer.js     # Text storage
│   │   ├── Cursor.js     # Cursor management
│   │   ├── EventEmitter.js
│   │   └── UndoManager.js
│   ├── 📁 modes/         # Editor modes
│   │   ├── Mode.js       # Base mode class
│   │   ├── NormalMode.js
│   │   ├── InsertMode.js
│   │   └── VisualMode.js
│   ├── 📁 features/      # Advanced features
│   │   ├── AIAssistant.js
│   │   ├── TimeTravel.js
│   │   └── ...
│   └── 📁 ui/           # UI components
│       ├── Renderer.js   # Canvas rendering
│       ├── StatusBar.js
│       └── CommandPalette.js
├── 📁 css/              # Stylesheets
├── 📄 index.html        # Main HTML file
└── 📄 server.sh         # Dev server script
```

### 🔧 Technology Stack

- **Frontend**: Pure JavaScript (ES6+)
- **Rendering**: HTML5 Canvas API
- **Styling**: CSS3
- **Server**: Python SimpleHTTPServer
- **Dependencies**: None! 🎉

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by **Vim** and **Emacs**
- Built with ❤️ using pure JavaScript
- Special thanks to all contributors

---

<div align="center">

**[⬆ back to top](#-txted---advanced-text-editor)**

Made with ❤️ by the TxtEd Team

</div>