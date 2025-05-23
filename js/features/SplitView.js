class SplitView {
    constructor(editor) {
        this.editor = editor;
        this.active = false;
        this.splitMode = 'vertical'; // vertical or horizontal
        this.compareMode = false;
        this.secondBuffer = null;
        this.secondCanvas = null;
        this.secondRenderer = null;
        this.diffHighlights = [];
        
        this.setupUI();
    }
    
    setupUI() {
        this.splitContainer = document.createElement('div');
        this.splitContainer.className = 'split-view-container hidden';
        
        this.secondViewport = document.createElement('div');
        this.secondViewport.className = 'split-viewport';
        
        this.secondCanvas = document.createElement('canvas');
        this.secondCanvas.className = 'editor-canvas';
        this.secondViewport.appendChild(this.secondCanvas);
        
        this.splitHandle = document.createElement('div');
        this.splitHandle.className = 'split-handle vertical';
        
        this.splitContainer.appendChild(this.splitHandle);
        this.splitContainer.appendChild(this.secondViewport);
        
        const editorContainer = document.getElementById('editor-container');
        editorContainer.appendChild(this.splitContainer);
        
        this.setupDragHandle();
    }
    
    setupDragHandle() {
        let isDragging = false;
        let startX = 0;
        let startWidth = 0;
        
        this.splitHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            const viewport = document.getElementById('editor-viewport');
            startWidth = viewport.offsetWidth;
            document.body.style.cursor = 'col-resize';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const diff = e.clientX - startX;
            const viewport = document.getElementById('editor-viewport');
            const newWidth = Math.max(200, startWidth + diff);
            const containerWidth = viewport.parentElement.offsetWidth;
            const secondWidth = containerWidth - newWidth - 4; // 4px for handle
            
            viewport.style.width = `${newWidth}px`;
            this.splitContainer.style.width = `${secondWidth}px`;
            
            if (this.editor.renderer) {
                this.editor.renderer.resize();
            }
            if (this.secondRenderer) {
                this.secondRenderer.resize();
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = '';
            }
        });
    }
    
    toggle() {
        this.active = !this.active;
        
        if (this.active) {
            this.show();
        } else {
            this.hide();
        }
    }
    
    show() {
        if (!this.secondBuffer) {
            this.secondBuffer = new Buffer();
            this.secondBuffer.setText(this.editor.buffer.getText());
        }
        
        if (!this.secondRenderer) {
            this.secondRenderer = new Renderer({
                buffer: this.secondBuffer,
                canvas: this.secondCanvas,
                options: this.editor.options
            });
        }
        
        this.splitContainer.classList.remove('hidden');
        
        // Adjust main viewport width
        const viewport = document.getElementById('editor-viewport');
        const containerWidth = viewport.parentElement.offsetWidth;
        viewport.style.width = `${containerWidth / 2 - 2}px`;
        this.splitContainer.style.width = `${containerWidth / 2 - 2}px`;
        
        // Resize renderers
        setTimeout(() => {
            this.editor.renderer.resize();
            this.secondRenderer.resize();
            this.secondRenderer.render();
        }, 0);
        
        this.editor.showMessage('Split view enabled. Press Ctrl+Shift+D to toggle diff mode');
    }
    
    hide() {
        this.splitContainer.classList.add('hidden');
        
        // Restore main viewport width
        const viewport = document.getElementById('editor-viewport');
        viewport.style.width = '';
        
        setTimeout(() => {
            this.editor.renderer.resize();
        }, 0);
        
        this.editor.showMessage('Split view disabled');
    }
    
    toggleCompareMode() {
        if (!this.active) return;
        
        this.compareMode = !this.compareMode;
        
        if (this.compareMode) {
            this.computeDiff();
            this.renderDiff();
            this.editor.showMessage('Diff mode enabled');
        } else {
            this.clearDiff();
            this.editor.showMessage('Diff mode disabled');
        }
    }
    
    computeDiff() {
        this.diffHighlights = [];
        
        const lines1 = this.editor.buffer.getLines();
        const lines2 = this.secondBuffer.getLines();
        
        // Simple line-by-line diff
        const maxLines = Math.max(lines1.length, lines2.length);
        
        for (let i = 0; i < maxLines; i++) {
            const line1 = lines1[i] || '';
            const line2 = lines2[i] || '';
            
            if (line1 !== line2) {
                // Compute character-level diff
                const charDiff = this.computeCharDiff(line1, line2);
                
                this.diffHighlights.push({
                    line: i,
                    type: !lines1[i] ? 'added' : !lines2[i] ? 'removed' : 'modified',
                    charDiff: charDiff
                });
            }
        }
    }
    
    computeCharDiff(str1, str2) {
        const diff = [];
        let i = 0, j = 0;
        
        // Find common prefix
        while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
            i++;
        }
        
        // Find common suffix
        let end1 = str1.length - 1;
        let end2 = str2.length - 1;
        while (end1 > i && end2 > i && str1[end1] === str2[end2]) {
            end1--;
            end2--;
        }
        
        if (i <= end1) {
            diff.push({
                start: i,
                end: end1 + 1,
                type: 'removed',
                side: 'left'
            });
        }
        
        if (i <= end2) {
            diff.push({
                start: i,
                end: end2 + 1,
                type: 'added',
                side: 'right'
            });
        }
        
        return diff;
    }
    
    renderDiff() {
        // Create diff overlay for main editor
        if (!this.diffOverlay1) {
            this.diffOverlay1 = document.createElement('div');
            this.diffOverlay1.className = 'diff-overlay';
            document.getElementById('editor-viewport').appendChild(this.diffOverlay1);
        }
        
        // Create diff overlay for second editor
        if (!this.diffOverlay2) {
            this.diffOverlay2 = document.createElement('div');
            this.diffOverlay2.className = 'diff-overlay';
            this.secondViewport.appendChild(this.diffOverlay2);
        }
        
        this.diffOverlay1.innerHTML = '';
        this.diffOverlay2.innerHTML = '';
        
        this.diffHighlights.forEach(highlight => {
            const y = highlight.line * this.editor.renderer.lineHeight;
            
            // Highlight in main editor
            if (highlight.type !== 'added') {
                const lineHighlight1 = document.createElement('div');
                lineHighlight1.className = `diff-line diff-${highlight.type}`;
                lineHighlight1.style.top = `${y}px`;
                lineHighlight1.style.height = `${this.editor.renderer.lineHeight}px`;
                this.diffOverlay1.appendChild(lineHighlight1);
                
                // Character-level highlights
                if (highlight.charDiff) {
                    highlight.charDiff.forEach(charDiff => {
                        if (charDiff.side === 'left') {
                            const charHighlight = document.createElement('div');
                            charHighlight.className = 'diff-char diff-removed';
                            const startX = this.editor.renderer.measureText(
                                this.editor.buffer.getLine(highlight.line).substring(0, charDiff.start)
                            );
                            const width = this.editor.renderer.measureText(
                                this.editor.buffer.getLine(highlight.line).substring(charDiff.start, charDiff.end)
                            );
                            charHighlight.style.left = `${startX}px`;
                            charHighlight.style.top = `${y}px`;
                            charHighlight.style.width = `${width}px`;
                            charHighlight.style.height = `${this.editor.renderer.lineHeight}px`;
                            this.diffOverlay1.appendChild(charHighlight);
                        }
                    });
                }
            }
            
            // Highlight in second editor
            if (highlight.type !== 'removed') {
                const lineHighlight2 = document.createElement('div');
                lineHighlight2.className = `diff-line diff-${highlight.type === 'removed' ? 'added' : highlight.type}`;
                lineHighlight2.style.top = `${y}px`;
                lineHighlight2.style.height = `${this.secondRenderer.lineHeight}px`;
                this.diffOverlay2.appendChild(lineHighlight2);
                
                // Character-level highlights
                if (highlight.charDiff) {
                    highlight.charDiff.forEach(charDiff => {
                        if (charDiff.side === 'right') {
                            const charHighlight = document.createElement('div');
                            charHighlight.className = 'diff-char diff-added';
                            const startX = this.secondRenderer.measureText(
                                this.secondBuffer.getLine(highlight.line).substring(0, charDiff.start)
                            );
                            const width = this.secondRenderer.measureText(
                                this.secondBuffer.getLine(highlight.line).substring(charDiff.start, charDiff.end)
                            );
                            charHighlight.style.left = `${startX}px`;
                            charHighlight.style.top = `${y}px`;
                            charHighlight.style.width = `${width}px`;
                            charHighlight.style.height = `${this.secondRenderer.lineHeight}px`;
                            this.diffOverlay2.appendChild(charHighlight);
                        }
                    });
                }
            }
        });
        
        // Add gutter indicators
        this.renderGutterIndicators();
    }
    
    renderGutterIndicators() {
        if (!this.diffGutter1) {
            this.diffGutter1 = document.createElement('div');
            this.diffGutter1.className = 'diff-gutter';
            document.getElementById('editor-viewport').appendChild(this.diffGutter1);
        }
        
        if (!this.diffGutter2) {
            this.diffGutter2 = document.createElement('div');
            this.diffGutter2.className = 'diff-gutter';
            this.secondViewport.appendChild(this.diffGutter2);
        }
        
        this.diffGutter1.innerHTML = '';
        this.diffGutter2.innerHTML = '';
        
        this.diffHighlights.forEach(highlight => {
            const y = highlight.line * this.editor.renderer.lineHeight;
            
            if (highlight.type !== 'added') {
                const indicator1 = document.createElement('div');
                indicator1.className = `diff-indicator diff-${highlight.type}`;
                indicator1.style.top = `${y}px`;
                indicator1.textContent = highlight.type === 'removed' ? '-' : '~';
                this.diffGutter1.appendChild(indicator1);
            }
            
            if (highlight.type !== 'removed') {
                const indicator2 = document.createElement('div');
                indicator2.className = `diff-indicator diff-${highlight.type === 'removed' ? 'added' : highlight.type}`;
                indicator2.style.top = `${y}px`;
                indicator2.textContent = highlight.type === 'added' ? '+' : '~';
                this.diffGutter2.appendChild(indicator2);
            }
        });
    }
    
    clearDiff() {
        if (this.diffOverlay1) {
            this.diffOverlay1.remove();
            this.diffOverlay1 = null;
        }
        if (this.diffOverlay2) {
            this.diffOverlay2.remove();
            this.diffOverlay2 = null;
        }
        if (this.diffGutter1) {
            this.diffGutter1.remove();
            this.diffGutter1 = null;
        }
        if (this.diffGutter2) {
            this.diffGutter2.remove();
            this.diffGutter2 = null;
        }
    }
    
    syncScroll() {
        if (!this.active || !this.secondRenderer) return;
        
        // Sync scroll position from main to second editor
        this.secondRenderer.scrollTop = this.editor.renderer.scrollTop;
        this.secondRenderer.render();
        
        if (this.compareMode) {
            this.renderDiff();
        }
    }
    
    openFile(filePath) {
        // This would load a file into the second buffer
        // For now, just simulate with some different content
        if (!this.secondBuffer) return;
        
        const demoContent = `// This is a demo file for split view
function hello() {
    console.log("Hello from split view!");
}

// You can edit this independently
const features = [
    'Split view',
    'Diff comparison',
    'Synchronized scrolling',
    'Character-level diff'
];

features.forEach(feature => {
    console.log(\`Feature: \${feature}\`);
});`;
        
        this.secondBuffer.setText(demoContent);
        if (this.secondRenderer) {
            this.secondRenderer.render();
        }
        
        if (this.compareMode) {
            this.computeDiff();
            this.renderDiff();
        }
    }
}