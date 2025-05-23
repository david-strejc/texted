class TimeTravel {
    constructor(editor) {
        this.editor = editor;
        this.undoManager = editor.undoManager;
        this.isVisible = false;
        this.timeline = null;
        this.previewEditor = null;
        this.currentPreviewIndex = -1;
        
        this.createUI();
    }
    
    createUI() {
        // Create time travel container
        this.container = document.createElement('div');
        this.container.id = 'time-travel';
        this.container.className = 'hidden';
        this.container.innerHTML = `
            <div class="time-travel-header">
                <h3>Time Travel</h3>
                <button class="close-btn">&times;</button>
            </div>
            <div class="time-travel-content">
                <div class="timeline-container">
                    <div class="timeline"></div>
                    <div class="timeline-cursor"></div>
                </div>
                <div class="preview-container">
                    <div class="preview-header">
                        <span class="preview-title">Preview</span>
                        <span class="preview-info"></span>
                    </div>
                    <canvas id="preview-canvas"></canvas>
                </div>
            </div>
            <div class="time-travel-footer">
                <button class="apply-btn">Apply</button>
                <button class="cancel-btn">Cancel</button>
            </div>
        `;
        
        document.getElementById('editor-container').appendChild(this.container);
        
        this.timeline = this.container.querySelector('.timeline');
        this.timelineCursor = this.container.querySelector('.timeline-cursor');
        this.previewCanvas = this.container.querySelector('#preview-canvas');
        this.previewInfo = this.container.querySelector('.preview-info');
        
        this.setupEventHandlers();
    }
    
    setupEventHandlers() {
        this.container.querySelector('.close-btn').addEventListener('click', () => this.hide());
        this.container.querySelector('.apply-btn').addEventListener('click', () => this.applyPreview());
        this.container.querySelector('.cancel-btn').addEventListener('click', () => this.hide());
        
        this.timeline.addEventListener('click', (e) => this.handleTimelineClick(e));
        this.timeline.addEventListener('mousemove', (e) => this.handleTimelineHover(e));
    }
    
    show() {
        this.isVisible = true;
        this.container.classList.remove('hidden');
        this.buildTimeline();
        this.updatePreview(this.undoManager.undoStack.length - 1);
    }
    
    hide() {
        this.isVisible = false;
        this.container.classList.add('hidden');
    }
    
    buildTimeline() {
        this.timeline.innerHTML = '';
        
        const undoStack = this.undoManager.undoStack;
        const redoStack = this.undoManager.redoStack;
        const totalItems = undoStack.length + redoStack.length;
        
        // Create timeline items for undo stack
        undoStack.forEach((group, index) => {
            const item = this.createTimelineItem(group, index, 'undo');
            this.timeline.appendChild(item);
        });
        
        // Add current state marker
        const currentMarker = document.createElement('div');
        currentMarker.className = 'timeline-item current';
        currentMarker.innerHTML = '<div class="timeline-marker"></div><span>Current</span>';
        this.timeline.appendChild(currentMarker);
        
        // Create timeline items for redo stack
        redoStack.forEach((group, index) => {
            const item = this.createTimelineItem(group, undoStack.length + index, 'redo');
            this.timeline.appendChild(item);
        });
    }
    
    createTimelineItem(group, index, type) {
        const item = document.createElement('div');
        item.className = `timeline-item ${type}`;
        item.dataset.index = index;
        item.dataset.type = type;
        
        const marker = document.createElement('div');
        marker.className = 'timeline-marker';
        
        const label = document.createElement('span');
        const change = group.changes[0];
        const timestamp = new Date(change.timestamp);
        const timeStr = timestamp.toLocaleTimeString();
        
        let changeType = '';
        if (change.action === 'insert') {
            changeType = `+${change.text.length} chars`;
        } else if (change.action === 'delete') {
            changeType = `-${change.text.length} chars`;
        }
        
        label.textContent = `${timeStr} - ${changeType}`;
        
        item.appendChild(marker);
        item.appendChild(label);
        
        return item;
    }
    
    handleTimelineClick(e) {
        const item = e.target.closest('.timeline-item');
        if (!item || item.classList.contains('current')) return;
        
        const index = parseInt(item.dataset.index);
        const type = item.dataset.type;
        
        this.updatePreview(index, type);
    }
    
    handleTimelineHover(e) {
        const item = e.target.closest('.timeline-item');
        if (!item) return;
        
        // Update cursor position
        const rect = item.getBoundingClientRect();
        const timelineRect = this.timeline.getBoundingClientRect();
        this.timelineCursor.style.left = (rect.left - timelineRect.left) + 'px';
    }
    
    updatePreview(index, type = 'undo') {
        this.currentPreviewIndex = index;
        
        // Create a temporary buffer with the state at the given index
        const tempBuffer = new Buffer(this.editor.buffer.getText());
        const tempUndoManager = new UndoManager(tempBuffer);
        
        // Copy undo/redo stacks
        tempUndoManager.undoStack = [...this.undoManager.undoStack];
        tempUndoManager.redoStack = [...this.undoManager.redoStack];
        
        // Apply changes to reach the desired state
        const currentIndex = this.undoManager.undoStack.length - 1;
        
        if (type === 'undo' && index < currentIndex) {
            // Undo to reach the desired state
            const undoCount = currentIndex - index;
            for (let i = 0; i < undoCount; i++) {
                tempUndoManager.undo();
            }
        } else if (type === 'redo') {
            // Redo to reach the desired state
            const redoIndex = index - this.undoManager.undoStack.length;
            for (let i = 0; i <= redoIndex; i++) {
                tempUndoManager.redo();
            }
        }
        
        // Update preview canvas
        this.renderPreview(tempBuffer);
        
        // Update preview info
        const totalChanges = this.undoManager.undoStack.length + this.undoManager.redoStack.length;
        this.previewInfo.textContent = `State ${index + 1} of ${totalChanges}`;
    }
    
    renderPreview(buffer) {
        const ctx = this.previewCanvas.getContext('2d');
        const rect = this.previewCanvas.parentElement.getBoundingClientRect();
        
        this.previewCanvas.width = rect.width;
        this.previewCanvas.height = rect.height - 40; // Subtract header height
        
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        
        ctx.font = '12px Consolas, Monaco, monospace';
        ctx.fillStyle = '#d4d4d4';
        ctx.textBaseline = 'top';
        
        const lineHeight = 16;
        const padding = 10;
        const visibleLines = Math.floor((this.previewCanvas.height - padding * 2) / lineHeight);
        
        for (let i = 0; i < Math.min(visibleLines, buffer.getLineCount()); i++) {
            const line = buffer.getLine(i);
            ctx.fillText(line, padding, padding + i * lineHeight);
        }
    }
    
    applyPreview() {
        if (this.currentPreviewIndex === -1) return;
        
        const currentIndex = this.undoManager.undoStack.length - 1;
        const targetIndex = this.currentPreviewIndex;
        
        if (targetIndex < currentIndex) {
            // Undo to reach the target state
            const undoCount = currentIndex - targetIndex;
            for (let i = 0; i < undoCount; i++) {
                this.editor.undo();
            }
        } else if (targetIndex > currentIndex) {
            // Redo to reach the target state
            const redoCount = targetIndex - currentIndex - 1;
            for (let i = 0; i < redoCount; i++) {
                this.editor.redo();
            }
        }
        
        this.hide();
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
}