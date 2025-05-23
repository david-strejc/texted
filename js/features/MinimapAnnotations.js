class MinimapAnnotations {
    constructor(editor) {
        this.editor = editor;
        this.minimap = editor.minimap;
        this.annotations = new Map();
        this.gitBlame = new Map();
        this.enabled = true;
        
        // Mock git blame data for demonstration
        this.mockGitData = {
            authors: ['Alice', 'Bob', 'Charlie', 'Dave'],
            commits: ['a1b2c3d', 'e4f5g6h', 'i7j8k9l', 'm0n1o2p']
        };
        
        this.initialize();
    }
    
    initialize() {
        this.setupEventHandlers();
        this.loadGitBlame();
        this.createAnnotationLayer();
    }
    
    createAnnotationLayer() {
        // Add annotation layer to minimap
        this.annotationLayer = document.createElement('canvas');
        this.annotationLayer.className = 'minimap-annotations';
        this.annotationLayer.style.position = 'absolute';
        this.annotationLayer.style.top = '0';
        this.annotationLayer.style.left = '0';
        this.annotationLayer.style.pointerEvents = 'none';
        
        const minimapElement = document.getElementById('minimap');
        if (minimapElement) {
            minimapElement.appendChild(this.annotationLayer);
        }
        
        // Tooltip for hover information
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'minimap-tooltip hidden';
        document.body.appendChild(this.tooltip);
    }
    
    setupEventHandlers() {
        // Update annotations on buffer change
        this.editor.buffer.on('change', () => {
            this.updateAnnotations();
        });
        
        // Update on minimap render
        if (this.minimap) {
            this.minimap.on('render', () => {
                this.renderAnnotations();
            });
        }
        
        // Handle minimap hover
        const minimapElement = document.getElementById('minimap');
        if (minimapElement) {
            minimapElement.addEventListener('mousemove', (e) => {
                this.handleMinimapHover(e);
            });
            
            minimapElement.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        }
    }
    
    loadGitBlame() {
        // Simulate git blame data loading
        const lineCount = this.editor.buffer.getLineCount();
        
        for (let i = 0; i < lineCount; i++) {
            // Generate mock git blame data
            const author = this.mockGitData.authors[Math.floor(Math.random() * this.mockGitData.authors.length)];
            const commit = this.mockGitData.commits[Math.floor(Math.random() * this.mockGitData.commits.length)];
            const date = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
            
            this.gitBlame.set(i, {
                author,
                commit,
                date,
                message: `Fix issue #${Math.floor(Math.random() * 1000)}`
            });
        }
        
        this.updateAnnotations();
    }
    
    updateAnnotations() {
        this.annotations.clear();
        
        // Create annotations based on different criteria
        this.createAuthorAnnotations();
        this.createAgeAnnotations();
        this.createChangeFrequencyAnnotations();
        
        this.renderAnnotations();
    }
    
    createAuthorAnnotations() {
        // Assign colors to authors
        const authorColors = new Map();
        const colors = ['#e91e63', '#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4'];
        
        this.mockGitData.authors.forEach((author, index) => {
            authorColors.set(author, colors[index % colors.length]);
        });
        
        // Create author annotations
        this.gitBlame.forEach((blame, line) => {
            const color = authorColors.get(blame.author);
            this.addAnnotation(line, 'author', {
                color,
                author: blame.author,
                opacity: 0.6
            });
        });
    }
    
    createAgeAnnotations() {
        const now = Date.now();
        const dayInMs = 24 * 60 * 60 * 1000;
        
        this.gitBlame.forEach((blame, line) => {
            const age = (now - blame.date.getTime()) / dayInMs;
            let heat = 0;
            
            if (age < 7) {
                heat = 1; // Very recent (hot)
            } else if (age < 30) {
                heat = 0.7; // Recent
            } else if (age < 90) {
                heat = 0.4; // Moderate
            } else {
                heat = 0.1; // Old (cold)
            }
            
            this.addAnnotation(line, 'age', {
                heat,
                age: Math.floor(age),
                date: blame.date
            });
        });
    }
    
    createChangeFrequencyAnnotations() {
        // Simulate change frequency data
        const changeFrequency = new Map();
        
        // Group consecutive lines that were changed together
        let currentGroup = [];
        let lastAuthor = null;
        let lastCommit = null;
        
        this.gitBlame.forEach((blame, line) => {
            if (blame.author === lastAuthor && blame.commit === lastCommit) {
                currentGroup.push(line);
            } else {
                if (currentGroup.length > 0) {
                    this.processChangeGroup(currentGroup, changeFrequency);
                }
                currentGroup = [line];
                lastAuthor = blame.author;
                lastCommit = blame.commit;
            }
        });
        
        if (currentGroup.length > 0) {
            this.processChangeGroup(currentGroup, changeFrequency);
        }
        
        // Add frequency annotations
        changeFrequency.forEach((frequency, line) => {
            this.addAnnotation(line, 'frequency', {
                frequency,
                intensity: Math.min(1, frequency / 10)
            });
        });
    }
    
    processChangeGroup(group, changeFrequency) {
        // Simulate that larger groups indicate more frequent changes
        const frequency = Math.min(10, group.length);
        
        group.forEach(line => {
            changeFrequency.set(line, frequency);
        });
    }
    
    addAnnotation(line, type, data) {
        if (!this.annotations.has(line)) {
            this.annotations.set(line, {});
        }
        
        this.annotations.get(line)[type] = data;
    }
    
    renderAnnotations() {
        if (!this.enabled || !this.minimap || !this.annotationLayer) return;
        
        const ctx = this.annotationLayer.getContext('2d');
        const minimapCanvas = this.minimap.canvas;
        
        if (!minimapCanvas) return;
        
        // Match minimap dimensions
        this.annotationLayer.width = minimapCanvas.width;
        this.annotationLayer.height = minimapCanvas.height;
        this.annotationLayer.style.width = minimapCanvas.style.width;
        this.annotationLayer.style.height = minimapCanvas.style.height;
        
        // Clear previous annotations
        ctx.clearRect(0, 0, this.annotationLayer.width, this.annotationLayer.height);
        
        const scale = this.minimap.scale;
        const lineHeight = this.editor.renderer.lineHeight * scale;
        const annotationWidth = 4; // Width of annotation bars
        
        // Render different annotation types
        this.renderAuthorAnnotations(ctx, lineHeight, annotationWidth);
        this.renderAgeHeatmap(ctx, lineHeight, annotationWidth);
        this.renderChangeIndicators(ctx, lineHeight, annotationWidth);
    }
    
    renderAuthorAnnotations(ctx, lineHeight, width) {
        const xOffset = this.annotationLayer.width - width * 3;
        
        this.annotations.forEach((annotation, line) => {
            if (annotation.author) {
                const y = line * lineHeight;
                
                ctx.fillStyle = annotation.author.color;
                ctx.globalAlpha = annotation.author.opacity;
                ctx.fillRect(xOffset, y, width, lineHeight);
            }
        });
        
        ctx.globalAlpha = 1;
    }
    
    renderAgeHeatmap(ctx, lineHeight, width) {
        const xOffset = this.annotationLayer.width - width * 2;
        
        this.annotations.forEach((annotation, line) => {
            if (annotation.age) {
                const y = line * lineHeight;
                const heat = annotation.age.heat;
                
                // Color gradient from blue (cold/old) to red (hot/new)
                const r = Math.floor(255 * heat);
                const b = Math.floor(255 * (1 - heat));
                
                ctx.fillStyle = `rgb(${r}, 0, ${b})`;
                ctx.fillRect(xOffset, y, width, lineHeight);
            }
        });
    }
    
    renderChangeIndicators(ctx, lineHeight, width) {
        const xOffset = this.annotationLayer.width - width;
        
        this.annotations.forEach((annotation, line) => {
            if (annotation.frequency) {
                const y = line * lineHeight;
                const intensity = annotation.frequency.intensity;
                
                ctx.fillStyle = '#ffc107';
                ctx.globalAlpha = intensity;
                ctx.fillRect(xOffset, y, width, lineHeight);
            }
        });
        
        ctx.globalAlpha = 1;
    }
    
    handleMinimapHover(event) {
        const rect = event.target.getBoundingClientRect();
        const y = event.clientY - rect.top;
        const scale = this.minimap.scale;
        const lineHeight = this.editor.renderer.lineHeight * scale;
        const line = Math.floor(y / lineHeight);
        
        const annotation = this.annotations.get(line);
        if (annotation && this.gitBlame.has(line)) {
            const blame = this.gitBlame.get(line);
            this.showTooltip(event.clientX, event.clientY, blame, annotation);
        } else {
            this.hideTooltip();
        }
    }
    
    showTooltip(x, y, blame, annotation) {
        const lines = [
            `<strong>${blame.author}</strong>`,
            `Commit: ${blame.commit}`,
            `Date: ${blame.date.toLocaleDateString()}`,
            `Message: ${blame.message}`
        ];
        
        if (annotation.age) {
            lines.push(`Age: ${annotation.age.age} days`);
        }
        
        if (annotation.frequency) {
            lines.push(`Change frequency: ${annotation.frequency.frequency}/10`);
        }
        
        this.tooltip.innerHTML = lines.join('<br>');
        this.tooltip.style.left = (x + 10) + 'px';
        this.tooltip.style.top = (y - 10) + 'px';
        this.tooltip.classList.remove('hidden');
    }
    
    hideTooltip() {
        this.tooltip.classList.add('hidden');
    }
    
    toggle() {
        this.enabled = !this.enabled;
        
        if (this.enabled) {
            this.renderAnnotations();
        } else {
            const ctx = this.annotationLayer.getContext('2d');
            ctx.clearRect(0, 0, this.annotationLayer.width, this.annotationLayer.height);
        }
        
        this.editor.showMessage(`Minimap annotations ${this.enabled ? 'enabled' : 'disabled'}`);
    }
    
    setAnnotationType(type, enabled) {
        // Toggle specific annotation types
        if (enabled) {
            this.updateAnnotations();
        } else {
            // Remove specific type
            this.annotations.forEach(annotation => {
                delete annotation[type];
            });
            this.renderAnnotations();
        }
    }
}