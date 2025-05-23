class MarkdownPreview {
    constructor(editor) {
        this.editor = editor;
        this.isVisible = false;
        this.previewPane = null;
        this.splitRatio = 0.5;
        this.updateTimer = null;
        this.syncScroll = true;
        
        this.initialize();
    }
    
    initialize() {
        this.createUI();
        this.setupEventHandlers();
    }
    
    createUI() {
        // Create preview pane
        this.previewPane = document.createElement('div');
        this.previewPane.id = 'markdown-preview';
        this.previewPane.className = 'markdown-preview hidden';
        this.previewPane.innerHTML = `
            <div class="preview-header">
                <span class="preview-title">Markdown Preview</span>
                <div class="preview-controls">
                    <button class="sync-scroll-btn" title="Sync Scrolling">⇅</button>
                    <button class="refresh-btn" title="Refresh">↻</button>
                    <button class="close-btn" title="Close">&times;</button>
                </div>
            </div>
            <div class="preview-content"></div>
        `;
        
        // Create split handle
        this.splitHandle = document.createElement('div');
        this.splitHandle.className = 'split-handle vertical hidden';
        
        const editorWrapper = document.getElementById('editor-wrapper');
        editorWrapper.appendChild(this.splitHandle);
        editorWrapper.appendChild(this.previewPane);
        
        // Setup control buttons
        this.previewPane.querySelector('.sync-scroll-btn').addEventListener('click', () => {
            this.toggleSyncScroll();
        });
        
        this.previewPane.querySelector('.refresh-btn').addEventListener('click', () => {
            this.updatePreview();
        });
        
        this.previewPane.querySelector('.close-btn').addEventListener('click', () => {
            this.hide();
        });
        
        // Setup split handle dragging
        this.setupSplitHandle();
    }
    
    setupEventHandlers() {
        // Update preview on buffer change
        this.editor.buffer.on('change', () => {
            this.debounceUpdate();
        });
        
        // Sync scrolling
        this.editor.renderer.on('scroll', () => {
            if (this.isVisible && this.syncScroll) {
                this.syncPreviewScroll();
            }
        });
        
        // Handle preview scroll
        const previewContent = this.previewPane.querySelector('.preview-content');
        previewContent.addEventListener('scroll', () => {
            if (this.isVisible && this.syncScroll) {
                this.syncEditorScroll();
            }
        });
    }
    
    setupSplitHandle() {
        let isDragging = false;
        let startX = 0;
        let startRatio = 0.5;
        
        this.splitHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startRatio = this.splitRatio;
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const editorWrapper = document.getElementById('editor-wrapper');
            const totalWidth = editorWrapper.offsetWidth;
            const deltaX = e.clientX - startX;
            const newRatio = startRatio + (deltaX / totalWidth);
            
            this.setSplitRatio(Math.max(0.2, Math.min(0.8, newRatio)));
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = '';
            }
        });
    }
    
    show() {
        if (this.isVisible) return;
        
        this.isVisible = true;
        this.previewPane.classList.remove('hidden');
        this.splitHandle.classList.remove('hidden');
        
        // Apply split layout
        this.applySplitLayout();
        
        // Initial preview update
        this.updatePreview();
        
        this.editor.showMessage('Markdown preview opened');
    }
    
    hide() {
        if (!this.isVisible) return;
        
        this.isVisible = false;
        this.previewPane.classList.add('hidden');
        this.splitHandle.classList.add('hidden');
        
        // Restore full width editor
        this.removeSplitLayout();
        
        this.editor.showMessage('Markdown preview closed');
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    applySplitLayout() {
        const editorViewport = document.getElementById('editor-viewport');
        const editorWrapper = document.getElementById('editor-wrapper');
        const totalWidth = editorWrapper.offsetWidth;
        
        const editorWidth = totalWidth * this.splitRatio;
        const previewWidth = totalWidth * (1 - this.splitRatio);
        
        editorViewport.style.width = editorWidth + 'px';
        this.previewPane.style.width = previewWidth + 'px';
        this.previewPane.style.left = editorWidth + 'px';
        
        this.splitHandle.style.left = (editorWidth - 2) + 'px';
        
        // Trigger editor resize
        this.editor.renderer.handleResize();
    }
    
    removeSplitLayout() {
        const editorViewport = document.getElementById('editor-viewport');
        
        editorViewport.style.width = '';
        
        // Trigger editor resize
        this.editor.renderer.handleResize();
    }
    
    setSplitRatio(ratio) {
        this.splitRatio = ratio;
        if (this.isVisible) {
            this.applySplitLayout();
        }
    }
    
    debounceUpdate() {
        clearTimeout(this.updateTimer);
        this.updateTimer = setTimeout(() => {
            this.updatePreview();
        }, 300);
    }
    
    updatePreview() {
        if (!this.isVisible) return;
        
        const markdown = this.editor.buffer.getText();
        const html = this.renderMarkdown(markdown);
        
        const previewContent = this.previewPane.querySelector('.preview-content');
        previewContent.innerHTML = html;
        
        // Apply syntax highlighting to code blocks
        this.highlightCodeBlocks();
        
        // Update line mapping for scroll sync
        this.updateLineMapping();
    }
    
    renderMarkdown(markdown) {
        // Simple markdown parser (can be replaced with a library like marked.js)
        let html = markdown;
        
        // Headers
        html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
        
        // Bold and italic
        html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Code blocks
        html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre><code class="language-${lang || 'plaintext'}">${this.escapeHtml(code)}</code></pre>`;
        });
        
        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
        
        // Images
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
        
        // Lists
        html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');
        
        // Blockquotes
        html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
        
        // Horizontal rules
        html = html.replace(/^---$/gm, '<hr>');
        
        // Paragraphs
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';
        
        // Clean up empty paragraphs
        html = html.replace(/<p><\/p>/g, '');
        html = html.replace(/<p>(<h[1-6]>)/g, '$1');
        html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
        
        return html;
    }
    
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        
        return text.replace(/[&<>"']/g, m => map[m]);
    }
    
    highlightCodeBlocks() {
        const codeBlocks = this.previewPane.querySelectorAll('pre code');
        
        codeBlocks.forEach(block => {
            const language = block.className.replace('language-', '');
            const code = block.textContent;
            
            // Simple syntax highlighting (can be enhanced)
            let highlighted = code;
            
            if (language === 'javascript' || language === 'js') {
                // Keywords
                highlighted = highlighted.replace(/\b(const|let|var|function|class|if|else|for|while|return|new|this|async|await)\b/g, 
                    '<span class="keyword">$1</span>');
                
                // Strings
                highlighted = highlighted.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, 
                    '<span class="string">$&</span>');
                
                // Comments
                highlighted = highlighted.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, 
                    '<span class="comment">$1</span>');
                
                // Numbers
                highlighted = highlighted.replace(/\b(\d+)\b/g, 
                    '<span class="number">$1</span>');
            }
            
            block.innerHTML = highlighted;
        });
    }
    
    updateLineMapping() {
        // Create mapping between source lines and preview elements
        this.lineMapping = new Map();
        
        const lines = this.editor.buffer.getText().split('\n');
        const previewElements = this.previewPane.querySelectorAll('h1, h2, h3, h4, h5, h6, p, pre, blockquote, ul, ol');
        
        let currentLine = 0;
        let elementIndex = 0;
        
        // Simple mapping based on content matching
        lines.forEach((line, lineIndex) => {
            if (line.trim() && elementIndex < previewElements.length) {
                const element = previewElements[elementIndex];
                this.lineMapping.set(lineIndex, element);
                
                // Check if we should move to next element
                if (line.match(/^#{1,6}\s/) || line.match(/^```/) || line.match(/^\* /) || line.match(/^\d+\. /)) {
                    elementIndex++;
                }
            }
        });
    }
    
    syncPreviewScroll() {
        if (!this.syncScroll || !this.lineMapping) return;
        
        const renderer = this.editor.renderer;
        const cursorLine = this.editor.cursor.row;
        
        // Find nearest mapped element
        let nearestLine = -1;
        let nearestElement = null;
        
        for (const [line, element] of this.lineMapping) {
            if (line <= cursorLine && line > nearestLine) {
                nearestLine = line;
                nearestElement = element;
            }
        }
        
        if (nearestElement) {
            const previewContent = this.previewPane.querySelector('.preview-content');
            const elementTop = nearestElement.offsetTop;
            const scrollRatio = renderer.viewport.scrollTop / (renderer.lineHeight * this.editor.buffer.getLineCount());
            
            previewContent.scrollTop = scrollRatio * previewContent.scrollHeight;
        }
    }
    
    syncEditorScroll() {
        if (!this.syncScroll) return;
        
        const previewContent = this.previewPane.querySelector('.preview-content');
        const scrollRatio = previewContent.scrollTop / previewContent.scrollHeight;
        
        const renderer = this.editor.renderer;
        const totalHeight = renderer.lineHeight * this.editor.buffer.getLineCount();
        
        renderer.viewport.scrollTop = scrollRatio * totalHeight;
        renderer.invalidate();
    }
    
    toggleSyncScroll() {
        this.syncScroll = !this.syncScroll;
        const btn = this.previewPane.querySelector('.sync-scroll-btn');
        btn.classList.toggle('active', this.syncScroll);
        
        this.editor.showMessage(`Scroll sync ${this.syncScroll ? 'enabled' : 'disabled'}`);
    }
}