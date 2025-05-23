class AIAssistant {
    constructor(editor) {
        this.editor = editor;
        this.isEnabled = false;
        this.suggestions = [];
        this.currentSuggestionIndex = -1;
        
        this.createUI();
        this.setupPatterns();
    }
    
    createUI() {
        // Create AI assistant panel
        this.panel = document.createElement('div');
        this.panel.id = 'ai-assistant';
        this.panel.className = 'hidden';
        this.panel.innerHTML = `
            <div class="ai-header">
                <span class="ai-icon">🤖</span>
                <span class="ai-title">AI Assistant</span>
                <button class="ai-close">&times;</button>
            </div>
            <div class="ai-content">
                <div class="ai-suggestion"></div>
                <div class="ai-actions">
                    <button class="ai-accept">Accept</button>
                    <button class="ai-reject">Reject</button>
                    <button class="ai-next">Next →</button>
                </div>
            </div>
        `;
        
        document.getElementById('editor-container').appendChild(this.panel);
        
        // Create inline suggestion element
        this.inlineSuggestion = document.createElement('div');
        this.inlineSuggestion.className = 'inline-suggestion hidden';
        this.editor.renderer.container.appendChild(this.inlineSuggestion);
        
        this.setupEventHandlers();
    }
    
    setupEventHandlers() {
        this.panel.querySelector('.ai-close').addEventListener('click', () => this.hide());
        this.panel.querySelector('.ai-accept').addEventListener('click', () => this.acceptSuggestion());
        this.panel.querySelector('.ai-reject').addEventListener('click', () => this.rejectSuggestion());
        this.panel.querySelector('.ai-next').addEventListener('click', () => this.nextSuggestion());
        
        // Watch for typing patterns
        this.editor.buffer.on('change', (change) => {
            if (this.isEnabled && change.action === 'insert') {
                this.analyzeContext();
            }
        });
    }
    
    setupPatterns() {
        // Common code patterns and their completions
        this.patterns = [
            {
                trigger: /for\s*\(\s*$/,
                suggestions: [
                    'let i = 0; i < array.length; i++',
                    'const item of items',
                    'const [index, item] of items.entries()',
                    'let i = array.length - 1; i >= 0; i--'
                ]
            },
            {
                trigger: /if\s*\(\s*$/,
                suggestions: [
                    'condition) {\n    \n}',
                    'value === null || value === undefined',
                    'typeof value === "string"',
                    'array.length > 0'
                ]
            },
            {
                trigger: /function\s+(\w+)\s*\(\s*$/,
                suggestions: [
                    ') {\n    \n}',
                    'param1, param2) {\n    \n}',
                    '...args) {\n    \n}',
                    'options = {}) {\n    \n}'
                ]
            },
            {
                trigger: /class\s+(\w+)\s*$/,
                suggestions: [
                    '{\n    constructor() {\n        \n    }\n}',
                    'extends BaseClass {\n    constructor() {\n        super();\n    }\n}',
                    'implements Interface {\n    \n}'
                ]
            },
            {
                trigger: /\/\/\s*TODO:\s*$/,
                suggestions: [
                    'Implement error handling',
                    'Add input validation',
                    'Optimize performance',
                    'Write unit tests',
                    'Add documentation'
                ]
            },
            {
                trigger: /console\.\s*$/,
                suggestions: [
                    'log()',
                    'error()',
                    'warn()',
                    'table()',
                    'time()',
                    'timeEnd()'
                ]
            },
            {
                trigger: /array\.\s*$/,
                suggestions: [
                    'map(item => )',
                    'filter(item => )',
                    'reduce((acc, item) => acc, initialValue)',
                    'forEach(item => )',
                    'find(item => )',
                    'sort((a, b) => a - b)'
                ]
            }
        ];
        
        // Smart imports
        this.importSuggestions = {
            'useState': "import { useState } from 'react';",
            'useEffect': "import { useEffect } from 'react';",
            'Component': "import { Component } from 'react';",
            'express': "const express = require('express');",
            'fs': "const fs = require('fs').promises;",
            'path': "const path = require('path');",
            'axios': "import axios from 'axios';"
        };
    }
    
    enable() {
        this.isEnabled = true;
        this.editor.showMessage('AI Assistant enabled - Type to see suggestions');
    }
    
    disable() {
        this.isEnabled = false;
        this.hide();
        this.editor.showMessage('AI Assistant disabled');
    }
    
    analyzeContext() {
        const cursor = this.editor.cursor;
        const line = this.editor.buffer.getLine(cursor.row);
        const textBeforeCursor = line.substring(0, cursor.col);
        
        // Check for pattern matches
        for (const pattern of this.patterns) {
            const match = textBeforeCursor.match(pattern.trigger);
            if (match) {
                this.showSuggestions(pattern.suggestions, match);
                return;
            }
        }
        
        // Check for import suggestions
        const words = textBeforeCursor.split(/\s+/);
        const lastWord = words[words.length - 1];
        
        if (this.importSuggestions[lastWord] && !this.hasImport(lastWord)) {
            this.suggestImport(lastWord);
        }
        
        // Check for refactoring opportunities
        this.checkRefactoringOpportunities();
    }
    
    showSuggestions(suggestions, match) {
        this.suggestions = suggestions;
        this.currentSuggestionIndex = 0;
        
        const suggestion = suggestions[0];
        this.showInlineSuggestion(suggestion);
        
        // Show panel if multiple suggestions
        if (suggestions.length > 1) {
            this.panel.classList.remove('hidden');
            this.updatePanel();
        }
    }
    
    showInlineSuggestion(suggestion) {
        const cursor = this.editor.cursor;
        const x = this.editor.renderer.getXForColumn(cursor.row, cursor.col);
        const y = this.editor.renderer.getYForRow(cursor.row);
        
        this.inlineSuggestion.textContent = suggestion;
        this.inlineSuggestion.style.left = x + 'px';
        this.inlineSuggestion.style.top = y + 'px';
        this.inlineSuggestion.classList.remove('hidden');
        
        // Auto-hide after delay
        clearTimeout(this.hideTimeout);
        this.hideTimeout = setTimeout(() => {
            this.inlineSuggestion.classList.add('hidden');
        }, 10000);
    }
    
    updatePanel() {
        const suggestion = this.suggestions[this.currentSuggestionIndex];
        const content = this.panel.querySelector('.ai-suggestion');
        
        content.innerHTML = `
            <div class="suggestion-header">Suggestion ${this.currentSuggestionIndex + 1} of ${this.suggestions.length}</div>
            <pre class="suggestion-code">${this.escapeHtml(suggestion)}</pre>
            <div class="suggestion-hint">Press Tab to accept, Esc to reject</div>
        `;
    }
    
    acceptSuggestion() {
        if (this.suggestions.length === 0) return;
        
        const suggestion = this.suggestions[this.currentSuggestionIndex];
        this.editor.insertText(suggestion);
        
        this.hide();
        this.editor.showMessage('AI suggestion accepted');
    }
    
    rejectSuggestion() {
        this.hide();
    }
    
    nextSuggestion() {
        if (this.suggestions.length === 0) return;
        
        this.currentSuggestionIndex = (this.currentSuggestionIndex + 1) % this.suggestions.length;
        this.updatePanel();
        this.showInlineSuggestion(this.suggestions[this.currentSuggestionIndex]);
    }
    
    hide() {
        this.panel.classList.add('hidden');
        this.inlineSuggestion.classList.add('hidden');
        this.suggestions = [];
        this.currentSuggestionIndex = -1;
    }
    
    hasImport(module) {
        const content = this.editor.buffer.getText();
        const importRegex = new RegExp(`(import.*${module}|require.*${module})`);
        return importRegex.test(content);
    }
    
    suggestImport(module) {
        const importStatement = this.importSuggestions[module];
        this.showSuggestions([importStatement], [module]);
        
        // Optionally auto-insert at top of file
        this.panel.querySelector('.ai-suggestion').innerHTML += `
            <div class="import-hint">Auto-insert at top of file? 
                <button onclick="window.editor.aiAssistant.autoInsertImport('${module}')">Yes</button>
            </div>
        `;
    }
    
    autoInsertImport(module) {
        const importStatement = this.importSuggestions[module];
        const firstLine = this.editor.buffer.getLine(0);
        
        // Insert at beginning of file
        this.editor.buffer.insert({ row: 0, col: 0 }, importStatement + '\n');
        this.hide();
        this.editor.showMessage('Import added');
    }
    
    checkRefactoringOpportunities() {
        const cursor = this.editor.cursor;
        const line = this.editor.buffer.getLine(cursor.row);
        
        // Check for long lines
        if (line.length > 100) {
            this.suggestRefactoring('Long line detected', [
                'Consider breaking this line into multiple lines for better readability'
            ]);
        }
        
        // Check for nested callbacks
        if (line.includes('function') && line.includes('){') && line.includes('})')) {
            this.suggestRefactoring('Nested callbacks detected', [
                'Consider using async/await for better readability',
                'Extract inner function to a named function'
            ]);
        }
        
        // Check for repeated code
        this.checkDuplication();
    }
    
    checkDuplication() {
        // Simple duplication detection
        const currentLine = this.editor.buffer.getLine(this.editor.cursor.row);
        const lines = [];
        
        for (let i = 0; i < this.editor.buffer.getLineCount(); i++) {
            lines.push(this.editor.buffer.getLine(i));
        }
        
        const duplicates = lines.filter((line, index) => 
            line === currentLine && index !== this.editor.cursor.row && line.trim().length > 10
        );
        
        if (duplicates.length > 0) {
            this.suggestRefactoring('Duplicate code detected', [
                'Consider extracting this into a reusable function',
                'Use a loop or array method to reduce repetition'
            ]);
        }
    }
    
    suggestRefactoring(title, suggestions) {
        // Show refactoring suggestion in a non-intrusive way
        const notification = document.createElement('div');
        notification.className = 'ai-refactoring-hint';
        notification.innerHTML = `
            <span class="hint-icon">💡</span>
            <span class="hint-text">${title}</span>
        `;
        
        const y = this.editor.renderer.getYForRow(this.editor.cursor.row);
        notification.style.top = y + 'px';
        
        this.editor.renderer.container.appendChild(notification);
        
        setTimeout(() => notification.remove(), 5000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
    }
}