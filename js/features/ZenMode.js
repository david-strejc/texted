class ZenMode {
    constructor(editor) {
        this.editor = editor;
        this.isActive = false;
        this.previousState = null;
        this.container = null;
        
        this.options = {
            hideLineNumbers: true,
            hideMinimap: true,
            hideStatusBar: true,
            hideMenuBar: true,
            centerContent: true,
            dimBackground: true,
            focusLine: true,
            maxWidth: 80, // characters
            typewriterMode: true, // Keep cursor centered vertically
            ambientSounds: false
        };
        
        this.initialize();
    }
    
    initialize() {
        this.createUI();
        this.setupEventHandlers();
    }
    
    createUI() {
        // Create zen mode overlay
        this.overlay = document.createElement('div');
        this.overlay.id = 'zen-mode-overlay';
        this.overlay.className = 'hidden';
        
        // Create focus gradient
        this.focusGradient = document.createElement('div');
        this.focusGradient.className = 'zen-focus-gradient';
        this.overlay.appendChild(this.focusGradient);
        
        document.body.appendChild(this.overlay);
        
        // Create zen mode container
        this.container = document.createElement('div');
        this.container.id = 'zen-mode-container';
        this.container.className = 'hidden';
        
        // Add breathing indicator
        this.breathingIndicator = document.createElement('div');
        this.breathingIndicator.className = 'breathing-indicator';
        this.breathingIndicator.innerHTML = '<div class="breath-circle"></div>';
        this.container.appendChild(this.breathingIndicator);
        
        document.getElementById('editor-container').appendChild(this.container);
    }
    
    setupEventHandlers() {
        // Exit zen mode on Escape
        document.addEventListener('keydown', (e) => {
            if (this.isActive && e.key === 'Escape' && e.shiftKey) {
                this.exit();
            }
        });
        
        // Update typewriter mode on cursor move
        this.editor.cursor.on('move', () => {
            if (this.isActive && this.options.typewriterMode) {
                this.centerCursor();
            }
        });
    }
    
    enter() {
        if (this.isActive) return;
        
        this.isActive = true;
        
        // Save current state
        this.previousState = {
            lineNumbers: this.editor.options.lineNumbers,
            bodyClass: document.body.className,
            containerClass: document.getElementById('editor-container').className
        };
        
        // Apply zen mode
        document.body.classList.add('zen-mode');
        document.getElementById('editor-container').classList.add('zen-mode-active');
        
        // Show overlay with fade effect
        this.overlay.classList.remove('hidden');
        requestAnimationFrame(() => {
            this.overlay.classList.add('active');
        });
        
        // Hide UI elements
        if (this.options.hideLineNumbers) {
            document.getElementById('line-numbers').style.display = 'none';
        }
        
        if (this.options.hideMinimap && this.editor.minimap) {
            this.editor.minimap.hide();
        }
        
        if (this.options.hideStatusBar) {
            document.getElementById('status-bar').style.display = 'none';
        }
        
        if (this.options.hideMenuBar) {
            document.getElementById('menu-bar').style.display = 'none';
        }
        
        // Center content
        if (this.options.centerContent) {
            this.applyContentCentering();
        }
        
        // Show breathing indicator
        this.container.classList.remove('hidden');
        
        // Apply focus line effect
        if (this.options.focusLine) {
            this.applyFocusLineEffect();
        }
        
        // Start typewriter mode
        if (this.options.typewriterMode) {
            this.centerCursor();
        }
        
        this.editor.showMessage('Zen Mode - Press Shift+Escape to exit');
    }
    
    exit() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        // Remove zen mode classes
        document.body.classList.remove('zen-mode');
        document.getElementById('editor-container').classList.remove('zen-mode-active');
        
        // Hide overlay
        this.overlay.classList.remove('active');
        setTimeout(() => {
            this.overlay.classList.add('hidden');
        }, 300);
        
        // Restore UI elements
        if (this.previousState) {
            if (this.options.hideLineNumbers) {
                document.getElementById('line-numbers').style.display = '';
            }
            
            if (this.options.hideMinimap && this.editor.minimap) {
                this.editor.minimap.show();
            }
            
            if (this.options.hideStatusBar) {
                document.getElementById('status-bar').style.display = '';
            }
            
            if (this.options.hideMenuBar) {
                document.getElementById('menu-bar').style.display = '';
            }
        }
        
        // Remove content centering
        this.removeContentCentering();
        
        // Hide breathing indicator
        this.container.classList.add('hidden');
        
        // Remove focus line effect
        this.removeFocusLineEffect();
        
        this.editor.renderer.invalidate();
        this.editor.showMessage('Exited Zen Mode');
    }
    
    applyContentCentering() {
        const viewport = document.getElementById('editor-viewport');
        const canvas = this.editor.canvas;
        
        // Calculate centered width
        const charWidth = this.editor.renderer.charWidth;
        const maxWidthPx = this.options.maxWidth * charWidth;
        const viewportWidth = viewport.offsetWidth;
        
        if (viewportWidth > maxWidthPx) {
            const padding = (viewportWidth - maxWidthPx) / 2;
            canvas.style.paddingLeft = padding + 'px';
            canvas.style.paddingRight = padding + 'px';
        }
    }
    
    removeContentCentering() {
        const canvas = this.editor.canvas;
        canvas.style.paddingLeft = '';
        canvas.style.paddingRight = '';
    }
    
    applyFocusLineEffect() {
        // Add custom render hook for focus effect
        this.editor.renderer.on('renderLine', this.renderFocusLine.bind(this));
    }
    
    removeFocusLineEffect() {
        this.editor.renderer.off('renderLine', this.renderFocusLine.bind(this));
    }
    
    renderFocusLine(ctx, row, y) {
        if (!this.isActive || !this.options.focusLine) return;
        
        const cursorRow = this.editor.cursor.row;
        const distance = Math.abs(row - cursorRow);
        
        if (distance > 0) {
            // Apply dimming based on distance from cursor
            const maxDistance = 10;
            const opacity = Math.max(0.3, 1 - (distance / maxDistance));
            
            ctx.globalAlpha = opacity;
        }
    }
    
    centerCursor() {
        if (!this.isActive || !this.options.typewriterMode) return;
        
        const renderer = this.editor.renderer;
        const cursorY = this.editor.cursor.row * renderer.lineHeight;
        const viewportHeight = renderer.viewport.height;
        
        // Center cursor vertically
        renderer.viewport.scrollTop = cursorY - (viewportHeight / 2) + (renderer.lineHeight / 2);
        renderer.invalidate();
    }
    
    toggle() {
        if (this.isActive) {
            this.exit();
        } else {
            this.enter();
        }
    }
    
    setOption(option, value) {
        if (this.options.hasOwnProperty(option)) {
            this.options[option] = value;
            
            // Apply changes if zen mode is active
            if (this.isActive) {
                // Re-enter to apply new settings
                this.exit();
                this.enter();
            }
        }
    }
}