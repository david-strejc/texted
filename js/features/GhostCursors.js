class GhostCursors {
    constructor(editor) {
        this.editor = editor;
        this.cursors = [];
        this.maxCursors = 5;
        this.fadeTime = 3000; // 3 seconds
        this.enabled = true;
        this.container = null;
        
        this.initialize();
    }
    
    initialize() {
        this.createContainer();
        this.setupEventHandlers();
    }
    
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'ghost-cursors';
        this.container.className = 'ghost-cursors-container';
        document.getElementById('editor-viewport').appendChild(this.container);
    }
    
    setupEventHandlers() {
        // Track cursor movements
        this.editor.cursor.on('move', (oldPos, newPos) => {
            if (this.enabled && this.shouldCreateGhost(oldPos, newPos)) {
                this.addGhostCursor(oldPos);
            }
        });
        
        // Update ghost positions on scroll
        this.editor.renderer.on('scroll', () => {
            this.updateGhostPositions();
        });
    }
    
    shouldCreateGhost(oldPos, newPos) {
        // Create ghost if movement is significant (more than 5 lines or 20 columns)
        const lineDiff = Math.abs(newPos.row - oldPos.row);
        const colDiff = Math.abs(newPos.col - oldPos.col);
        
        return lineDiff > 5 || colDiff > 20;
    }
    
    addGhostCursor(position) {
        // Remove oldest cursor if at max
        if (this.cursors.length >= this.maxCursors) {
            this.removeOldestCursor();
        }
        
        const ghost = {
            id: Date.now(),
            position: { ...position },
            element: this.createGhostElement(position),
            createdAt: Date.now(),
            fadeTimeout: null
        };
        
        this.cursors.push(ghost);
        this.container.appendChild(ghost.element);
        
        // Start fade animation
        this.startFadeAnimation(ghost);
    }
    
    createGhostElement(position) {
        const element = document.createElement('div');
        element.className = 'ghost-cursor';
        
        const renderer = this.editor.renderer;
        const x = position.col * renderer.charWidth - renderer.viewport.scrollLeft;
        const y = position.row * renderer.lineHeight - renderer.viewport.scrollTop;
        
        element.style.left = x + 'px';
        element.style.top = y + 'px';
        element.style.width = renderer.charWidth + 'px';
        element.style.height = renderer.lineHeight + 'px';
        
        // Add ripple effect
        const ripple = document.createElement('div');
        ripple.className = 'ghost-cursor-ripple';
        element.appendChild(ripple);
        
        return element;
    }
    
    startFadeAnimation(ghost) {
        // Immediate opacity animation
        requestAnimationFrame(() => {
            ghost.element.classList.add('fading');
        });
        
        // Remove after fade completes
        ghost.fadeTimeout = setTimeout(() => {
            this.removeCursor(ghost);
        }, this.fadeTime);
    }
    
    removeCursor(ghost) {
        const index = this.cursors.indexOf(ghost);
        if (index !== -1) {
            this.cursors.splice(index, 1);
            if (ghost.element.parentNode) {
                ghost.element.remove();
            }
            if (ghost.fadeTimeout) {
                clearTimeout(ghost.fadeTimeout);
            }
        }
    }
    
    removeOldestCursor() {
        if (this.cursors.length > 0) {
            this.removeCursor(this.cursors[0]);
        }
    }
    
    updateGhostPositions() {
        const renderer = this.editor.renderer;
        
        this.cursors.forEach(ghost => {
            const x = ghost.position.col * renderer.charWidth - renderer.viewport.scrollLeft;
            const y = ghost.position.row * renderer.lineHeight - renderer.viewport.scrollTop;
            
            ghost.element.style.left = x + 'px';
            ghost.element.style.top = y + 'px';
        });
    }
    
    clear() {
        this.cursors.forEach(ghost => {
            if (ghost.element.parentNode) {
                ghost.element.remove();
            }
            if (ghost.fadeTimeout) {
                clearTimeout(ghost.fadeTimeout);
            }
        });
        this.cursors = [];
    }
    
    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.clear();
        }
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.clear();
        }
    }
}