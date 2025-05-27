// app.js
class TextTo3DApp {
    constructor() {
      this.currentFiles = [];
      this.isGenerating = false;
      this.isResizing = false;
      this.modelInfoVisible = false;
      this.initializeElements();
      this.setupEventListeners();
      this.setupResize();
    }
  
    initializeElements() {
      this.chatMessages = document.getElementById('chat-messages');
      this.chatForm = document.getElementById('chat-form');
      this.chatInput = document.getElementById('chat-input');
      this.sendBtn = document.getElementById('send-btn');
      this.viewerArea = document.getElementById('viewer-area');
      this.modelInfo = document.getElementById('model-info');
      this.downloadBtn = document.getElementById('download-model');
      this.resizeHandle = document.getElementById('resize-handle');
      this.chatSection = document.querySelector('.chat-section');
      this.closeInfo = document.getElementById('close-info');
    }
  
    setupEventListeners() {
      this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));
      this.downloadBtn.addEventListener('click', () => this.downloadModel());
      this.closeInfo.addEventListener('click', () => this.hideModelInfo());
    }
  
    handleSubmit(e) {
      e.preventDefault();
      const message = this.chatInput.value.trim();
      if (!message) return;
      this.addMessage(message, 'user');
      this.chatInput.value = '';
      this.simulateBotResponse(message);
    }
  
    addMessage(text, type) {
      const msg = document.createElement('div');
      msg.className = `message ${type}`;
      msg.textContent = text;
      this.chatMessages.appendChild(msg);
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
  
    simulateBotResponse(input) {
      const responses = {
        castle: "Here's your medieval castle model!",
        car: "A sleek futuristic car model has been generated.",
        house: "Enjoy this modern house design!",
      };
  
      const key = Object.keys(responses).find(k => input.toLowerCase().includes(k));
      const reply = responses[key] || "Your model is being processed!";
  
      setTimeout(() => this.addMessage(reply, 'bot'), 1000);
    }
  
    downloadModel() {
      this.addMessage('🔽 Download initiated...', 'system');
    }
  
    hideModelInfo() {
      this.modelInfo.classList.remove('show');
    }
  
    setupResize() {
      this.resizeHandle.addEventListener('mousedown', (e) => {
        this.isResizing = true;
        document.addEventListener('mousemove', this.resize.bind(this));
        document.addEventListener('mouseup', this.stopResize.bind(this));
      });
    }
  
    resize(e) {
      if (!this.isResizing) return;
      const newChatWidth = window.innerWidth - e.clientX;
      if (newChatWidth > 300 && newChatWidth < 700) {
        this.chatSection.style.width = newChatWidth + 'px';
      }
    }
  
    stopResize() {
      this.isResizing = false;
      document.removeEventListener('mousemove', this.resize);
      document.removeEventListener('mouseup', this.stopResize);
    }
  }
  
  // Initialize app
  const app = new TextTo3DApp();
  