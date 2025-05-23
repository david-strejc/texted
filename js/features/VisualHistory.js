class VisualHistory {
    constructor(editor) {
        this.editor = editor;
        this.isEnabled = false;
        this.history = [];
        this.maxSnapshots = 50;
        this.snapshotInterval = 5000; // 5 seconds
        this.lastSnapshotTime = 0;
        
        this.createUI();
        this.setupEventHandlers();
    }
    
    createUI() {
        // Create visual history panel
        this.panel = document.createElement('div');
        this.panel.id = 'visual-history';
        this.panel.className = 'hidden';
        this.panel.innerHTML = `
            <div class="history-header">
                <h3>Visual History</h3>
                <div class="history-controls">
                    <button class="history-play" title="Play history">▶</button>
                    <button class="history-pause hidden" title="Pause">⏸</button>
                    <button class="history-close">&times;</button>
                </div>
            </div>
            <div class="history-timeline">
                <canvas id="history-canvas"></canvas>
                <div class="history-scrubber"></div>
            </div>
            <div class="history-preview">
                <div class="preview-time"></div>
                <pre class="preview-content"></pre>
            </div>
        `;
        
        document.getElementById('editor-container').appendChild(this.panel);
        
        this.canvas = this.panel.querySelector('#history-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.scrubber = this.panel.querySelector('.history-scrubber');
        this.previewTime = this.panel.querySelector('.preview-time');
        this.previewContent = this.panel.querySelector('.preview-content');
        
        this.isPlaying = false;
        this.playbackIndex = 0;
    }
    
    setupEventHandlers() {
        this.panel.querySelector('.history-close').addEventListener('click', () => this.hide());
        this.panel.querySelector('.history-play').addEventListener('click', () => this.play());
        this.panel.querySelector('.history-pause').addEventListener('click', () => this.pause());
        
        this.canvas.addEventListener('click', (e) => this.handleTimelineClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleTimelineHover(e));
        
        // Track changes
        this.editor.buffer.on('change', () => this.captureSnapshot());
    }
    
    enable() {
        this.isEnabled = true;
        this.captureSnapshot(true); // Force initial snapshot
        this.editor.showMessage('Visual History enabled - tracking changes');
    }
    
    disable() {
        this.isEnabled = false;
        this.hide();
        this.editor.showMessage('Visual History disabled');
    }
    
    captureSnapshot(force = false) {
        if (!this.isEnabled) return;
        
        const now = Date.now();
        if (!force && now - this.lastSnapshotTime < this.snapshotInterval) return;
        
        const content = this.editor.buffer.getText();
        const cursorPos = this.editor.cursor.getPosition();
        const lineCount = this.editor.buffer.getLineCount();
        
        // Calculate content metrics
        const metrics = this.calculateMetrics(content);
        
        const snapshot = {
            timestamp: now,
            content: content,
            cursorPos: cursorPos,
            lineCount: lineCount,
            metrics: metrics,
            changeIntensity: this.calculateChangeIntensity()
        };
        
        this.history.push(snapshot);
        this.lastSnapshotTime = now;
        
        // Limit history size
        if (this.history.length > this.maxSnapshots) {
            this.history.shift();
        }
        
        if (this.panel && !this.panel.classList.contains('hidden')) {
            this.renderTimeline();
        }
    }
    
    calculateMetrics(content) {
        const lines = content.split('\n');
        const nonEmptyLines = lines.filter(line => line.trim().length > 0);
        
        return {
            totalChars: content.length,
            totalLines: lines.length,
            nonEmptyLines: nonEmptyLines.length,
            avgLineLength: nonEmptyLines.length > 0 ? 
                nonEmptyLines.reduce((sum, line) => sum + line.length, 0) / nonEmptyLines.length : 0,
            complexity: this.calculateComplexity(content)
        };
    }
    
    calculateComplexity(content) {
        // Simple complexity metric based on nesting and keywords
        let complexity = 0;
        const lines = content.split('\n');
        let currentIndent = 0;
        
        const complexityKeywords = ['if', 'else', 'for', 'while', 'function', 'class', 'switch'];
        
        lines.forEach(line => {
            const trimmed = line.trim();
            const indent = line.length - trimmed.length;
            
            if (indent > currentIndent) {
                complexity += 0.5;
            }
            currentIndent = indent;
            
            complexityKeywords.forEach(keyword => {
                if (trimmed.includes(keyword)) {
                    complexity += 1;
                }
            });
            
            if (trimmed.includes('{')) complexity += 0.5;
            if (trimmed.includes('}')) complexity += 0.5;
        });
        
        return complexity;
    }
    
    calculateChangeIntensity() {
        if (this.history.length < 2) return 0;
        
        const recent = this.history[this.history.length - 1];
        const previous = this.history[this.history.length - 2];
        
        if (!previous) return 0;
        
        const timeDiff = recent.timestamp - previous.timestamp;
        const charDiff = Math.abs(recent.metrics.totalChars - previous.metrics.totalChars);
        
        // Higher intensity for more changes in less time
        return Math.min(1, charDiff / timeDiff * 1000);
    }
    
    show() {
        this.panel.classList.remove('hidden');
        this.renderTimeline();
    }
    
    hide() {
        this.panel.classList.add('hidden');
        this.pause();
    }
    
    renderTimeline() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear canvas
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, width, height);
        
        if (this.history.length < 2) return;
        
        const padding = 20;
        const graphWidth = width - padding * 2;
        const graphHeight = height - padding * 2;
        
        // Draw axes
        ctx.strokeStyle = '#454545';
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.stroke();
        
        // Find min/max values
        const maxChars = Math.max(...this.history.map(s => s.metrics.totalChars));
        const maxComplexity = Math.max(...this.history.map(s => s.metrics.complexity));
        
        // Draw character count line
        ctx.strokeStyle = '#4ecdc4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        this.history.forEach((snapshot, index) => {
            const x = padding + (index / (this.history.length - 1)) * graphWidth;
            const y = height - padding - (snapshot.metrics.totalChars / maxChars) * graphHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw complexity line
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        this.history.forEach((snapshot, index) => {
            const x = padding + (index / (this.history.length - 1)) * graphWidth;
            const y = height - padding - (snapshot.metrics.complexity / maxComplexity) * graphHeight * 0.5;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw change intensity bars
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        
        this.history.forEach((snapshot, index) => {
            if (snapshot.changeIntensity > 0) {
                const x = padding + (index / (this.history.length - 1)) * graphWidth;
                const barHeight = snapshot.changeIntensity * graphHeight * 0.3;
                
                ctx.fillRect(x - 2, height - padding - barHeight, 4, barHeight);
            }
        });
        
        // Draw time labels
        ctx.fillStyle = '#858585';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        
        const startTime = new Date(this.history[0].timestamp);
        const endTime = new Date(this.history[this.history.length - 1].timestamp);
        
        ctx.fillText(startTime.toLocaleTimeString(), padding, height - 5);
        ctx.fillText(endTime.toLocaleTimeString(), width - padding, height - 5);
        
        // Draw legend
        ctx.textAlign = 'left';
        ctx.fillStyle = '#4ecdc4';
        ctx.fillText('Characters', width - 100, 20);
        ctx.fillStyle = '#ff6b6b';
        ctx.fillText('Complexity', width - 100, 35);
    }
    
    handleTimelineClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const padding = 20;
        const graphWidth = this.canvas.width - padding * 2;
        
        const index = Math.round((x - padding) / graphWidth * (this.history.length - 1));
        if (index >= 0 && index < this.history.length) {
            this.showSnapshot(index);
        }
    }
    
    handleTimelineHover(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const padding = 20;
        const graphWidth = this.canvas.width - padding * 2;
        
        const index = Math.round((x - padding) / graphWidth * (this.history.length - 1));
        if (index >= 0 && index < this.history.length) {
            const snapshot = this.history[index];
            const time = new Date(snapshot.timestamp).toLocaleTimeString();
            
            this.scrubber.style.left = x + 'px';
            this.scrubber.title = `${time} - ${snapshot.metrics.totalChars} chars`;
        }
    }
    
    showSnapshot(index) {
        const snapshot = this.history[index];
        if (!snapshot) return;
        
        const time = new Date(snapshot.timestamp);
        this.previewTime.textContent = time.toLocaleString();
        
        // Show first 20 lines of content
        const lines = snapshot.content.split('\n').slice(0, 20);
        this.previewContent.textContent = lines.join('\n');
        
        if (lines.length < snapshot.lineCount) {
            this.previewContent.textContent += `\n... (${snapshot.lineCount - 20} more lines)`;
        }
        
        // Highlight current position
        this.scrubber.style.left = 
            (20 + (index / (this.history.length - 1)) * (this.canvas.width - 40)) + 'px';
        
        this.playbackIndex = index;
    }
    
    play() {
        if (this.history.length < 2) return;
        
        this.isPlaying = true;
        this.playbackIndex = 0;
        
        this.panel.querySelector('.history-play').classList.add('hidden');
        this.panel.querySelector('.history-pause').classList.remove('hidden');
        
        this.playbackInterval = setInterval(() => {
            if (this.playbackIndex >= this.history.length - 1) {
                this.pause();
                return;
            }
            
            this.showSnapshot(this.playbackIndex);
            this.playbackIndex++;
        }, 500);
    }
    
    pause() {
        this.isPlaying = false;
        
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
        
        this.panel.querySelector('.history-play').classList.remove('hidden');
        this.panel.querySelector('.history-pause').classList.add('hidden');
    }
    
    toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
            this.show();
        }
    }
}