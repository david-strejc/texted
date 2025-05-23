class Minimap {
    constructor(editor) {
        this.editor = editor;
        this.element = document.getElementById('minimap');
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.scale = 0.1;
        this.charWidth = 2;
        this.lineHeight = 3;
        this.visible = true;
        
        this.build();
        this.setupEventHandlers();
        
        this.editor.on('change', () => this.render());
        this.editor.on('scroll', () => this.updateViewport());
    }

    build() {
        this.element.appendChild(this.canvas);
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        const rect = this.element.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
        
        this.render();
    }

    setupEventHandlers() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        this.dragging = false;
    }

    handleMouseDown(event) {
        this.dragging = true;
        this.scrollToPosition(event);
    }

    handleMouseMove(event) {
        if (this.dragging) {
            this.scrollToPosition(event);
        }
    }

    handleMouseUp(event) {
        this.dragging = false;
    }

    scrollToPosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        const y = event.clientY - rect.top;
        const row = Math.floor(y / this.lineHeight);
        
        const targetScroll = row * this.editor.renderer.lineHeight;
        this.editor.renderer.viewport.scrollTop = targetScroll;
        this.editor.renderer.invalidate();
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        const theme = this.editor.theme;
        if (!theme) return;
        
        const buffer = this.editor.buffer;
        const maxLines = Math.floor(this.height / this.lineHeight);
        const lineCount = Math.min(buffer.getLineCount(), maxLines);
        
        this.ctx.fillStyle = theme.getColor('minimapBackground') || '#1a1a1a';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        for (let i = 0; i < lineCount; i++) {
            const line = buffer.getLine(i);
            const y = i * this.lineHeight;
            
            this.renderMinimapLine(line, y);
        }
        
        this.updateViewport();
    }

    renderMinimapLine(line, y) {
        const theme = this.editor.theme;
        let x = 0;
        
        for (let i = 0; i < line.length && x < this.width; i++) {
            const char = line[i];
            
            if (char !== ' ' && char !== '\t') {
                const alpha = 0.5 + (Math.random() * 0.3);
                this.ctx.fillStyle = theme ? theme.getColor('minimapForeground') : `rgba(200, 200, 200, ${alpha})`;
                this.ctx.fillRect(x, y, this.charWidth - 1, this.lineHeight - 1);
            }
            
            x += this.charWidth;
        }
    }

    updateViewport() {
        const renderer = this.editor.renderer;
        const buffer = this.editor.buffer;
        
        const viewportTop = renderer.viewport.scrollTop;
        const viewportHeight = renderer.viewport.height;
        const totalHeight = buffer.getLineCount() * renderer.lineHeight;
        
        const minimapViewportTop = (viewportTop / totalHeight) * this.height;
        const minimapViewportHeight = (viewportHeight / totalHeight) * this.height;
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillRect(0, minimapViewportTop, this.width, minimapViewportHeight);
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.strokeRect(0, minimapViewportTop, this.width, minimapViewportHeight);
    }

    toggle() {
        this.visible = !this.visible;
        this.element.style.display = this.visible ? 'block' : 'none';
        
        if (this.visible) {
            this.render();
        }
    }

    show() {
        this.visible = true;
        this.element.style.display = 'block';
        this.render();
    }

    hide() {
        this.visible = false;
        this.element.style.display = 'none';
    }
}