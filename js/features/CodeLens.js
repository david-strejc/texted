class CodeLens {
    constructor(editor) {
        this.editor = editor;
        this.enabled = true;
        this.lenses = new Map();
        this.updateDebounceTimer = null;
        this.container = null;
        
        this.metrics = {
            showComplexity: true,
            showLineCount: true,
            showLastModified: true,
            showReferences: true,
            complexityThreshold: 10
        };
        
        this.initialize();
    }
    
    initialize() {
        this.createContainer();
        this.setupEventHandlers();
        this.analyze();
    }
    
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'code-lens-container';
        this.container.className = 'code-lens-container';
        document.getElementById('editor-viewport').appendChild(this.container);
    }
    
    setupEventHandlers() {
        // Update lenses on buffer change
        this.editor.buffer.on('change', () => {
            this.debounceUpdate();
        });
        
        // Update lens positions on scroll
        this.editor.renderer.on('scroll', () => {
            this.updateLensPositions();
        });
        
        // Re-analyze on mode change
        this.editor.on('modeChange', () => {
            this.analyze();
        });
    }
    
    debounceUpdate() {
        clearTimeout(this.updateDebounceTimer);
        this.updateDebounceTimer = setTimeout(() => {
            this.analyze();
        }, 500);
    }
    
    analyze() {
        if (!this.enabled) return;
        
        this.clearLenses();
        
        const text = this.editor.buffer.getText();
        const functions = this.findFunctions(text);
        const classes = this.findClasses(text);
        
        // Analyze functions
        functions.forEach(func => {
            const metrics = this.analyzeFunctionComplexity(func);
            this.createLens(func.line, 'function', func.name, metrics);
        });
        
        // Analyze classes
        classes.forEach(cls => {
            const metrics = this.analyzeClassComplexity(cls);
            this.createLens(cls.line, 'class', cls.name, metrics);
        });
        
        this.updateLensPositions();
    }
    
    findFunctions(text) {
        const functions = [];
        const lines = text.split('\n');
        
        // Simple regex patterns for different function styles
        const patterns = [
            /function\s+(\w+)\s*\(/,           // function declaration
            /(\w+)\s*:\s*function\s*\(/,       // object method
            /(\w+)\s*=\s*function\s*\(/,       // function expression
            /(\w+)\s*=\s*\([^)]*\)\s*=>/,     // arrow function
            /(\w+)\s*:\s*\([^)]*\)\s*=>/,     // object method arrow
            /async\s+function\s+(\w+)\s*\(/,   // async function
            /(\w+)\s*\([^)]*\)\s*{/            // method shorthand
        ];
        
        lines.forEach((line, index) => {
            for (const pattern of patterns) {
                const match = line.match(pattern);
                if (match) {
                    const funcStart = index;
                    const funcEnd = this.findBlockEnd(lines, index);
                    
                    functions.push({
                        name: match[1],
                        line: index,
                        startLine: funcStart,
                        endLine: funcEnd,
                        content: lines.slice(funcStart, funcEnd + 1).join('\n')
                    });
                    break;
                }
            }
        });
        
        return functions;
    }
    
    findClasses(text) {
        const classes = [];
        const lines = text.split('\n');
        
        const classPattern = /class\s+(\w+)/;
        
        lines.forEach((line, index) => {
            const match = line.match(classPattern);
            if (match) {
                const classStart = index;
                const classEnd = this.findBlockEnd(lines, index);
                
                classes.push({
                    name: match[1],
                    line: index,
                    startLine: classStart,
                    endLine: classEnd,
                    content: lines.slice(classStart, classEnd + 1).join('\n')
                });
            }
        });
        
        return classes;
    }
    
    findBlockEnd(lines, startLine) {
        let braceCount = 0;
        let inBlock = false;
        
        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];
            
            for (const char of line) {
                if (char === '{') {
                    braceCount++;
                    inBlock = true;
                } else if (char === '}') {
                    braceCount--;
                    if (inBlock && braceCount === 0) {
                        return i;
                    }
                }
            }
        }
        
        return lines.length - 1;
    }
    
    analyzeFunctionComplexity(func) {
        const metrics = {
            complexity: 1, // Start with 1 for the function itself
            lineCount: func.endLine - func.startLine + 1,
            parameters: 0,
            returns: 0,
            branches: 0,
            loops: 0
        };
        
        // Count parameters
        const paramMatch = func.content.match(/\([^)]*\)/);
        if (paramMatch) {
            const params = paramMatch[0].match(/\w+/g);
            metrics.parameters = params ? params.length : 0;
        }
        
        // Analyze complexity
        const complexityPatterns = [
            { pattern: /\bif\b/g, type: 'branch' },
            { pattern: /\belse\b/g, type: 'branch' },
            { pattern: /\bswitch\b/g, type: 'branch' },
            { pattern: /\bcase\b/g, type: 'branch' },
            { pattern: /\bfor\b/g, type: 'loop' },
            { pattern: /\bwhile\b/g, type: 'loop' },
            { pattern: /\bdo\b/g, type: 'loop' },
            { pattern: /\breturn\b/g, type: 'return' },
            { pattern: /\?\s*[^:]+\s*:/g, type: 'ternary' },
            { pattern: /\|\|/g, type: 'logical' },
            { pattern: /&&/g, type: 'logical' }
        ];
        
        complexityPatterns.forEach(({ pattern, type }) => {
            const matches = func.content.match(pattern);
            if (matches) {
                const count = matches.length;
                metrics.complexity += count;
                
                if (type === 'branch' || type === 'ternary') {
                    metrics.branches += count;
                } else if (type === 'loop') {
                    metrics.loops += count;
                } else if (type === 'return') {
                    metrics.returns = count;
                }
            }
        });
        
        return metrics;
    }
    
    analyzeClassComplexity(cls) {
        const methods = this.findFunctions(cls.content);
        
        const metrics = {
            complexity: 0,
            lineCount: cls.endLine - cls.startLine + 1,
            methodCount: methods.length,
            avgMethodComplexity: 0
        };
        
        // Calculate total complexity
        let totalComplexity = 0;
        methods.forEach(method => {
            const methodMetrics = this.analyzeFunctionComplexity(method);
            totalComplexity += methodMetrics.complexity;
        });
        
        metrics.complexity = totalComplexity;
        metrics.avgMethodComplexity = methods.length > 0 
            ? (totalComplexity / methods.length).toFixed(1) 
            : 0;
        
        return metrics;
    }
    
    createLens(line, type, name, metrics) {
        const lens = document.createElement('div');
        lens.className = `code-lens ${type}`;
        lens.dataset.line = line;
        
        const parts = [];
        
        // Complexity indicator
        if (this.metrics.showComplexity) {
            const complexityClass = metrics.complexity > this.metrics.complexityThreshold ? 'high' : 'normal';
            parts.push(`<span class="complexity ${complexityClass}">◈ ${metrics.complexity}</span>`);
        }
        
        // Line count
        if (this.metrics.showLineCount) {
            parts.push(`<span class="line-count">${metrics.lineCount} lines</span>`);
        }
        
        // Type-specific metrics
        if (type === 'function' && metrics.parameters > 0) {
            parts.push(`<span class="params">${metrics.parameters} params</span>`);
        } else if (type === 'class' && metrics.methodCount > 0) {
            parts.push(`<span class="methods">${metrics.methodCount} methods</span>`);
        }
        
        lens.innerHTML = parts.join('<span class="separator">•</span>');
        
        // Add click handler
        lens.addEventListener('click', () => {
            this.showDetailedMetrics(name, type, metrics);
        });
        
        this.container.appendChild(lens);
        this.lenses.set(line, lens);
    }
    
    updateLensPositions() {
        const renderer = this.editor.renderer;
        
        this.lenses.forEach((lens, line) => {
            const y = line * renderer.lineHeight - renderer.viewport.scrollTop - 15;
            
            if (y >= -20 && y <= renderer.viewport.height) {
                lens.style.display = 'block';
                lens.style.top = y + 'px';
                lens.style.left = '10px';
            } else {
                lens.style.display = 'none';
            }
        });
    }
    
    showDetailedMetrics(name, type, metrics) {
        const details = [];
        
        details.push(`${type} ${name}:`);
        details.push(`  Complexity: ${metrics.complexity}`);
        details.push(`  Lines: ${metrics.lineCount}`);
        
        if (type === 'function') {
            details.push(`  Parameters: ${metrics.parameters}`);
            details.push(`  Returns: ${metrics.returns}`);
            details.push(`  Branches: ${metrics.branches}`);
            details.push(`  Loops: ${metrics.loops}`);
        } else if (type === 'class') {
            details.push(`  Methods: ${metrics.methodCount}`);
            details.push(`  Avg Method Complexity: ${metrics.avgMethodComplexity}`);
        }
        
        this.editor.showMessage(details.join('\n'));
    }
    
    clearLenses() {
        this.lenses.forEach(lens => lens.remove());
        this.lenses.clear();
    }
    
    toggle() {
        this.enabled = !this.enabled;
        
        if (this.enabled) {
            this.analyze();
        } else {
            this.clearLenses();
        }
    }
    
    setMetric(metric, value) {
        if (this.metrics.hasOwnProperty(metric)) {
            this.metrics[metric] = value;
            this.analyze();
        }
    }
}