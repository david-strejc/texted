class StatusBar {
    constructor(editor) {
        this.editor = editor;
        this.element = document.getElementById('status-bar');
        this.segments = {
            mode: this.createElement('mode'),
            message: this.createElement('message'),
            position: this.createElement('position'),
            fileInfo: this.createElement('file-info')
        };
        
        this.commandLine = this.createElement('command-line');
        this.commandLine.style.display = 'none';
        
        this.build();
        this.editor.on('statusUpdate', () => this.update());
        this.update();
    }

    createElement(className) {
        const element = document.createElement('div');
        element.className = `status-${className}`;
        return element;
    }

    build() {
        this.element.innerHTML = '';
        this.element.appendChild(this.segments.mode);
        this.element.appendChild(this.segments.message);
        this.element.appendChild(this.commandLine);
        
        const right = document.createElement('div');
        right.className = 'status-right';
        right.appendChild(this.segments.position);
        right.appendChild(this.segments.fileInfo);
        this.element.appendChild(right);
    }

    update() {
        const info = this.editor.getStatusInfo();
        
        this.segments.mode.textContent = info.statusText || this.getModeText(info.mode);
        this.segments.position.textContent = `${info.row}:${info.col}`;
        this.segments.fileInfo.textContent = `${info.lines} lines${info.modified ? ' [+]' : ''}`;
    }

    getModeText(mode) {
        const modeTexts = {
            'normal': 'NORMAL',
            'insert': '-- INSERT --',
            'visual': '-- VISUAL --',
            'command': ':'
        };
        return modeTexts[mode] || mode.toUpperCase();
    }

    showMessage(message, duration = 3000) {
        this.segments.message.textContent = message;
        this.segments.message.style.color = '';
        
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }
        
        this.messageTimeout = setTimeout(() => {
            this.segments.message.textContent = '';
        }, duration);
    }

    showError(message) {
        this.segments.message.textContent = message;
        this.segments.message.style.color = '#f44336';
        
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }
        
        this.messageTimeout = setTimeout(() => {
            this.segments.message.textContent = '';
            this.segments.message.style.color = '';
        }, 5000);
    }

    showCommandLine(prefix) {
        this.commandLine.style.display = 'block';
        this.commandLine.innerHTML = `<span class="command-prefix">${prefix}</span><input type="text" class="command-input" />`;
        
        const input = this.commandLine.querySelector('.command-input');
        input.focus();
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideCommandLine();
                this.editor.mode.cancel();
            }
        });
    }

    hideCommandLine() {
        this.commandLine.style.display = 'none';
        this.commandLine.innerHTML = '';
        document.getElementById('hidden-input').focus();
    }

    updateCommandLine(text) {
        const prefix = this.commandLine.querySelector('.command-prefix');
        const input = this.commandLine.querySelector('.command-input');
        
        if (prefix && input) {
            const command = text.substring(1);
            input.value = command;
            input.setSelectionRange(command.length, command.length);
        }
    }
}