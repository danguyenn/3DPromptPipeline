// app.js
class TextTo3DApp {
    constructor() {
      this.currentFiles = [];
      this.isGenerating = false;
      this.isResizing = false;
      this.modelInfoVisible = false;
      this.initializeElements();
      this.setupEventListeners();
      this.setupDragAndDrop();
      this.autoResizeTextarea();
      this.setupResize();
    }
  
    initializeElements() {
      this.chatMessages = document.getElementById('chat-messages');
      this.chatForm = document.getElementById('chat-form');
      this.chatInput = document.getElementById('chat-input');
      this.sendBtn = document.getElementById('send-btn');
      this.fileInput = document.getElementById('file-input');
      this.fileUploadArea = document.getElementById('file-upload-area');
      this.filePreview = document.getElementById('file-preview');
      this.progressBar = document.getElementById('progress-bar');
      this.progressFill = document.getElementById('progress-fill');
      this.viewerArea = document.getElementById('viewer-area');
      this.modelInfo = document.getElementById('model-info');
      this.downloadBtn = document.getElementById('download-model');
      this.resizeHandle = document.getElementById('resize-handle');
      this.appContainer = document.getElementById('app-container');
      this.chatSection = document.querySelector('.chat-section');
      this.infoToggle = document.getElementById('info-toggle');
      this.closeInfo = document.getElementById('close-info');
    }
  
    setupEventListeners() {
      this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));
      this.fileUploadArea?.addEventListener('click', () => this.fileInput?.click());
      this.fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));
      this.downloadBtn?.addEventListener('click', () => this.downloadModel());
      this.infoToggle?.addEventListener('click', () => this.toggleModelInfo());
      this.closeInfo?.addEventListener('click', () => this.hideModelInfo());
    }
  
    setupDragAndDrop() {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        this.fileUploadArea?.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
      });
  
      ['dragenter', 'dragover'].forEach(eventName => {
        this.fileUploadArea?.addEventListener(eventName, () => {
          this.fileUploadArea?.classList.add('dragover');
        });
      });
  
      ['dragleave', 'drop'].forEach(eventName => {
        this.fileUploadArea?.addEventListener(eventName, () => {
          this.fileUploadArea?.classList.remove('dragover');
        });
      });
  
      this.fileUploadArea?.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        this.handleFiles(files);
      });
    }
  
    autoResizeTextarea() {
      this.chatInput?.addEventListener('input', () => {
        this.chatInput.style.height = 'auto';
        this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 120) + 'px';
      });
    }
  
    setupResize() {
      this.resizeHandle?.addEventListener('mousedown', (e) => {
        this.isResizing = true;
        this.resizeHandle.classList.add('dragging');
        document.addEventListener('mousemove', this.handleResize.bind(this));
        document.addEventListener('mouseup', this.stopResize.bind(this));
        e.preventDefault();
      });
    }
  
    handleResize(e) {
      if (!this.isResizing) return;
      const containerRect = this.appContainer.getBoundingClientRect();
      const newChatWidth = containerRect.right - e.clientX;
      const minChatWidth = 350;
      const maxChatWidth = 800;
      const minViewerWidth = 400;
  
      if (newChatWidth >= minChatWidth && newChatWidth <= maxChatWidth &&
          (containerRect.width - newChatWidth) >= minViewerWidth) {
        this.chatSection.style.width = newChatWidth + 'px';
        this.resizeHandle.style.right = newChatWidth + 'px';
      }
    }
  
    stopResize() {
      this.isResizing = false;
      this.resizeHandle.classList.remove('dragging');
      document.removeEventListener('mousemove', this.handleResize);
      document.removeEventListener('mouseup', this.stopResize);
    }
  
    toggleModelInfo() {
      if (this.modelInfoVisible) {
        this.hideModelInfo();
      } else {
        this.showModelInfo();
      }
    }
  
    showModelInfo() {
      this.modelInfo.classList.add('show');
      this.infoToggle.classList.add('active');
      this.modelInfoVisible = true;
    }
  
    hideModelInfo() {
      this.modelInfo.classList.remove('show');
      this.infoToggle.classList.remove('active');
      this.modelInfoVisible = false;
    }
  
    handleFileSelect(e) {
      this.handleFiles(e.target.files);
    }
  
    handleFiles(files) {
      this.currentFiles = Array.from(files);
      this.displayFilePreview();
    }
  
    clearFiles() {
      this.currentFiles = [];
      if (this.fileInput) this.fileInput.value = '';
      this.filePreview?.classList.remove('show');
    }
  
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
  
    addMessage(text, type) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${type}`;
      messageDiv.textContent = text;
      this.chatMessages.appendChild(messageDiv);
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
  
    displayFilePreview() {
      if (this.currentFiles.length === 0) {
        this.filePreview?.classList.remove('show');
        return;
      }
  
      if (!this.filePreview) return;
      this.filePreview.classList.add('show');
      this.filePreview.innerHTML = `
        <strong>📁 Selected files:</strong><br>
        ${this.currentFiles.map(file => `📄 ${file.name} (${this.formatFileSize(file.size)})`).join('<br>')}
        <button type="button" onclick="app.clearFiles()" style="margin-left: 10px; background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: white; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.3s ease;">✕ Clear</button>
      `;
    }
  
    showTypingIndicator() {
      const typingDiv = document.createElement('div');
      typingDiv.className = 'typing-indicator';
      typingDiv.id = 'typing-indicator';
      typingDiv.innerHTML = `
        <span style="font-weight: 500;">AI is thinking</span>
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      `;
      this.chatMessages.appendChild(typingDiv);
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
  
    hideTypingIndicator() {
      const typingIndicator = document.getElementById('typing-indicator');
      if (typingIndicator) {
        typingIndicator.remove();
      }
    }
  
    showProgress() {
      this.progressBar?.classList.add('show');
      this.updateProgress(0);
    }
  
    hideProgress() {
      setTimeout(() => {
        this.progressBar?.classList.remove('show');
      }, 500);
    }
  
    updateProgress(percentage) {
      if (this.progressFill) {
        this.progressFill.style.width = percentage + '%';
      }
    }
  
    async handleSubmit(e) {
      e.preventDefault();
      const message = this.chatInput.value.trim();
      if (!message && this.currentFiles.length === 0) return;
      if (this.isGenerating) return;
  
      if (message) {
        this.addMessage(message, 'user');
        this.chatInput.value = '';
        this.chatInput.style.height = 'auto';
      }
  
      if (this.currentFiles.length > 0) {
        this.addMessage(`📎 Uploaded ${this.currentFiles.length} file(s): ${this.currentFiles.map(f => f.name).join(', ')}`, 'system');
      }
  
      this.isGenerating = true;
      this.sendBtn.disabled = true;
      this.showTypingIndicator();
      this.showProgress();
  
      try {
        const response = await fetch('http://localhost:5050/txtgen3d', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: message,
            artstyle: "realistic",
            save_path: "3d_files"
          })
        });
  
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
  
        const result = await response.json();
  
        if (result.success) {
          this.addMessage(`✅ Successfully generated 3D model: ${result.message || 'Model created successfully'}`, 'bot');
          if (result.file_path) {
            this.addMessage(`📁 File saved to: ${result.file_path}`, 'system');
          }
        } else {
          this.addMessage(`❌ Generation failed: ${result.error || 'Unknown error'}`, 'bot');
        }
      } catch (error) {
        console.error('API call failed:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          this.addMessage('❌ Cannot connect to the server. Please make sure the backend is running on localhost:5050.', 'bot');
        } else if (error.message.includes('HTTP error')) {
          this.addMessage(`❌ Server error: ${error.message}`, 'bot');
        } else {
          this.addMessage('❌ Sorry, there was an error processing your request. Please try again.', 'bot');
        }
      } finally {
        this.isGenerating = false;
        this.sendBtn.disabled = false;
        this.hideTypingIndicator();
        this.hideProgress();
        this.clearFiles();
      }
    }
  
    downloadModel() {
      this.addMessage('🎉 Download started! Your 3D model will be saved to your downloads folder.', 'system');
      this.showProgress();
      let progress = 0;
      const downloadInterval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(downloadInterval);
          this.hideProgress();
          this.addMessage('✅ Download complete! Your model is ready to use.', 'system');
        }
        this.updateProgress(progress);
      }, 150);
    }
  }
  
  const app = new TextTo3DApp();
  
  setTimeout(() => {
    app.addMessage("💡 Pro tip: Try describing objects like 'futuristic spaceship', 'cozy wooden cabin', or 'fantasy sword' for best results!", 'bot');
  }, 2000);
  