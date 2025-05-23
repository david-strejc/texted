# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TxtEd is a web-based advanced text editor built in pure JavaScript, inspired by Vim and Emacs with modern enhancements. It uses canvas-based rendering for performance and implements a modal editing system.

## Development Commands

```bash
# Start development server on port 8080
./server.sh start

# Stop the server
./server.sh stop

# Restart the server
./server.sh restart

# Check server status
./server.sh status

# View server logs
./server.sh logs
```

The project uses Python's built-in HTTP server and requires no build process - it runs directly in the browser.

## Architecture

### Core System
- **Editor.js**: Main orchestrator managing all components and modes
- **Buffer.js**: Handles text storage, line operations, and content management
- **Renderer.js**: Canvas-based rendering system for efficient text display
- **EventEmitter.js**: Central event system enabling component communication

### Modal Editing System
The editor implements Vim-style modal editing with four main modes:
- **NormalMode**: Navigation and commands
- **InsertMode**: Text insertion
- **VisualMode**: Text selection
- **CommandMode**: Command-line operations (triggered by `:`)

### Feature Architecture
Features are implemented as self-contained modules in `/js/features/`:
- Each feature extends the editor through the event system
- Features can be enabled/disabled independently
- They communicate via events rather than direct coupling

### Key Architectural Patterns
1. **Event-driven communication**: Components use EventEmitter for loose coupling
2. **Command pattern**: All editor actions go through EditorCommands.js
3. **Canvas rendering**: Custom text rendering for performance optimization
4. **No external dependencies**: Pure vanilla JavaScript implementation

## Important Conventions

### File Operations
- Text content is managed through Buffer.js methods
- Line numbers are 0-indexed internally
- Cursor positions use {line, column} objects

### Event System
Common events include:
- `modeChange`: When switching between modes
- `bufferChange`: When text content changes
- `cursorMove`: When cursor position updates
- `commandExecute`: When commands are executed

### Command System
- Vim commands are handled in NormalMode.js
- Ex commands (`:` commands) are processed in CommandMode.js
- All commands should be registered in EditorCommands.js

### Feature Development
When adding new features:
1. Create a new class in `/js/features/`
2. Initialize it in Editor.js
3. Use the event system for integration
4. Avoid direct dependencies on other features