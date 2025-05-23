class CollaborativeCursors {
    constructor(editor) {
        this.editor = editor;
        this.isEnabled = false;
        this.cursors = new Map();
        this.colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7dc6f', '#bb8fce', '#85c1e2'];
        this.websocket = null;
        this.userId = this.generateUserId();
        this.userName = this.getRandomName();
        
        this.createUI();
    }
    
    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }
    
    getRandomName() {
        const adjectives = ['Swift', 'Clever', 'Bright', 'Quick', 'Sharp', 'Nimble'];
        const animals = ['Fox', 'Eagle', 'Tiger', 'Falcon', 'Wolf', 'Hawk'];
        return adjectives[Math.floor(Math.random() * adjectives.length)] + ' ' + 
               animals[Math.floor(Math.random() * animals.length)];
    }
    
    createUI() {
        this.collaboratorsContainer = document.createElement('div');
        this.collaboratorsContainer.id = 'collaborators';
        this.collaboratorsContainer.className = 'hidden';
        this.collaboratorsContainer.innerHTML = `
            <div class="collaborators-header">
                <h4>Active Collaborators</h4>
            </div>
            <div class="collaborators-list"></div>
        `;
        document.getElementById('editor-container').appendChild(this.collaboratorsContainer);
    }
    
    enable() {
        this.isEnabled = true;
        this.collaboratorsContainer.classList.remove('hidden');
        
        // Simulate collaborative editing for demo
        this.simulateCollaborators();
        
        // Track local cursor movements
        this.editor.cursor.on('move', this.handleLocalCursorMove.bind(this));
        
        // Listen for text changes
        this.editor.buffer.on('change', this.handleLocalChange.bind(this));
        
        this.editor.showMessage('Collaborative mode enabled as ' + this.userName);
    }
    
    disable() {
        this.isEnabled = false;
        this.collaboratorsContainer.classList.add('hidden');
        
        // Clear all remote cursors
        this.cursors.forEach(cursor => {
            if (cursor.element) {
                cursor.element.remove();
            }
        });
        this.cursors.clear();
        
        this.editor.showMessage('Collaborative mode disabled');
    }
    
    simulateCollaborators() {
        // Simulate 2-3 other users
        const simulatedUsers = [
            { id: 'sim_1', name: 'Coding Ninja', color: this.colors[1] },
            { id: 'sim_2', name: 'Debug Master', color: this.colors[2] }
        ];
        
        simulatedUsers.forEach(user => {
            this.addCollaborator(user);
            
            // Simulate cursor movements
            setInterval(() => {
                if (this.isEnabled && Math.random() > 0.5) {
                    const row = Math.floor(Math.random() * Math.min(20, this.editor.buffer.getLineCount()));
                    const col = Math.floor(Math.random() * 40);
                    this.updateRemoteCursor(user.id, { row, col });
                }
            }, 3000 + Math.random() * 2000);
            
            // Simulate typing
            setInterval(() => {
                if (this.isEnabled && Math.random() > 0.7) {
                    const cursor = this.cursors.get(user.id);
                    if (cursor) {
                        this.simulateRemoteTyping(user.id, cursor.position);
                    }
                }
            }, 5000 + Math.random() * 5000);
        });
    }
    
    addCollaborator(user) {
        const cursor = {
            id: user.id,
            name: user.name,
            color: user.color,
            position: { row: 0, col: 0 },
            element: null,
            labelElement: null
        };
        
        this.cursors.set(user.id, cursor);
        this.updateCollaboratorsList();
    }
    
    updateCollaboratorsList() {
        const listElement = this.collaboratorsContainer.querySelector('.collaborators-list');
        listElement.innerHTML = '';
        
        // Add self
        const selfItem = document.createElement('div');
        selfItem.className = 'collaborator-item';
        selfItem.style.borderColor = this.colors[0];
        selfItem.innerHTML = `
            <div class="collaborator-indicator" style="background-color: ${this.colors[0]}"></div>
            <span>${this.userName} (You)</span>
        `;
        listElement.appendChild(selfItem);
        
        // Add others
        this.cursors.forEach(cursor => {
            const item = document.createElement('div');
            item.className = 'collaborator-item';
            item.style.borderColor = cursor.color;
            item.innerHTML = `
                <div class="collaborator-indicator" style="background-color: ${cursor.color}"></div>
                <span>${cursor.name}</span>
            `;
            listElement.appendChild(item);
        });
    }
    
    updateRemoteCursor(userId, position) {
        const cursor = this.cursors.get(userId);
        if (!cursor) return;
        
        cursor.position = position;
        
        // Create or update cursor element
        if (!cursor.element) {
            cursor.element = document.createElement('div');
            cursor.element.className = 'remote-cursor';
            cursor.element.style.backgroundColor = cursor.color;
            
            cursor.labelElement = document.createElement('div');
            cursor.labelElement.className = 'remote-cursor-label';
            cursor.labelElement.style.backgroundColor = cursor.color;
            cursor.labelElement.textContent = cursor.name;
            cursor.element.appendChild(cursor.labelElement);
            
            this.editor.renderer.cursorsLayer.appendChild(cursor.element);
        }
        
        // Update position
        const x = this.editor.renderer.getXForColumn(position.row, position.col);
        const y = this.editor.renderer.getYForRow(position.row);
        
        cursor.element.style.left = x + 'px';
        cursor.element.style.top = y + 'px';
        cursor.element.style.height = this.editor.renderer.lineHeight + 'px';
        
        // Add animation class
        cursor.element.classList.add('cursor-move');
        setTimeout(() => cursor.element.classList.remove('cursor-move'), 300);
    }
    
    simulateRemoteTyping(userId, position) {
        const snippets = [
            '// TODO: Fix this\n',
            'console.log("debug");',
            'function helper() {\n    \n}',
            '// Important note',
            'return result;',
            'const data = [];'
        ];
        
        const text = snippets[Math.floor(Math.random() * snippets.length)];
        const cursor = this.cursors.get(userId);
        
        if (cursor) {
            // Show typing indicator
            this.showTypingIndicator(userId, position);
            
            // Simulate character-by-character typing
            let i = 0;
            const typeInterval = setInterval(() => {
                if (i < text.length && this.isEnabled) {
                    const char = text[i];
                    const newPos = { ...position };
                    newPos.col += i;
                    
                    // Update cursor position
                    this.updateRemoteCursor(userId, newPos);
                    
                    // Show the character being typed (visual only, don't actually insert)
                    this.showRemoteTyping(userId, newPos, char);
                    
                    i++;
                } else {
                    clearInterval(typeInterval);
                    this.hideTypingIndicator(userId);
                }
            }, 100 + Math.random() * 50);
        }
    }
    
    showTypingIndicator(userId, position) {
        const cursor = this.cursors.get(userId);
        if (cursor && cursor.element) {
            cursor.element.classList.add('typing');
        }
    }
    
    hideTypingIndicator(userId) {
        const cursor = this.cursors.get(userId);
        if (cursor && cursor.element) {
            cursor.element.classList.remove('typing');
        }
    }
    
    showRemoteTyping(userId, position, char) {
        // Create a temporary element to show the character being typed
        const tempElement = document.createElement('div');
        tempElement.className = 'remote-typing-char';
        tempElement.textContent = char;
        tempElement.style.position = 'absolute';
        
        const x = this.editor.renderer.getXForColumn(position.row, position.col);
        const y = this.editor.renderer.getYForRow(position.row);
        
        tempElement.style.left = x + 'px';
        tempElement.style.top = y + 'px';
        tempElement.style.color = this.cursors.get(userId).color;
        tempElement.style.opacity = '0.5';
        
        this.editor.renderer.cursorsLayer.appendChild(tempElement);
        
        // Remove after animation
        setTimeout(() => tempElement.remove(), 500);
    }
    
    handleLocalCursorMove(position) {
        if (!this.isEnabled) return;
        
        // In a real implementation, this would send cursor position to other users
        // For now, just update local display
    }
    
    handleLocalChange(change) {
        if (!this.isEnabled) return;
        
        // In a real implementation, this would send the change to other users
        // For now, just log it
    }
    
    toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
    }
}