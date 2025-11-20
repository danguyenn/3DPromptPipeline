class TextTo3DApp {
  constructor() {
    this.currentFiles = [];
    this.isGenerating = false;
    this.isResizing = false;
    this.modelInfoVisible = false;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.currentModel = null;
    this.modelUrls = { refined: null, draft: null };
    this.currentModelType = "refined";

    // Speech to text state
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.audioStream = null;
    this.isRecording = false;

    this.initializeElements();
    this.setupEventListeners();
    this.setupDragAndDrop();
    this.autoResizeTextarea();
    this.setupResize();
    this.initThreeJS();
  }

  initializeElements() {
    this.chatMessages = document.getElementById("chat-messages");
    this.chatForm = document.getElementById("chat-form");
    this.chatInput = document.getElementById("chat-input");
    this.sendBtn = document.getElementById("send-btn");
    this.fileInput = document.getElementById("file-input");
    this.fileUploadArea = document.getElementById("file-upload-area");
    this.filePreview = document.getElementById("file-preview");
    this.progressBar = document.getElementById("progress-bar");
    this.progressFill = document.getElementById("progress-fill");
    this.viewerArea = document.getElementById("viewer-area");
    this.modelInfo = document.getElementById("model-info");
    this.downloadBtn = document.getElementById("download-model");
    this.resizeHandle = document.getElementById("resize-handle");
    this.appContainer = document.getElementById("app-container");
    this.chatSection = document.querySelector(".chat-section");
    this.infoToggle = document.getElementById("info-toggle");
    this.closeInfo = document.getElementById("close-info");
    this.voiceBtn = document.getElementById("voice-btn");
    this.sttStatus = document.getElementById("stt-status");
  }

  /* ---------- Three.js setup ---------- */

  initThreeJS() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f5f5);

    this.camera = new THREE.PerspectiveCamera(
      75,
      this.viewerArea.clientWidth / this.viewerArea.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(
      this.viewerArea.clientWidth,
      this.viewerArea.clientHeight
    );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    this.setupMouseControls();
    window.addEventListener("resize", () => this.onWindowResize());
    this.animate();
  }

  setupMouseControls() {
    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    let rotationX = 0;
    let rotationY = 0;

    this.viewerArea.addEventListener("mousedown", (e) => {
      isMouseDown = true;
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    this.viewerArea.addEventListener("mouseup", () => {
      isMouseDown = false;
    });

    this.viewerArea.addEventListener("mouseleave", () => {
      isMouseDown = false;
    });

    this.viewerArea.addEventListener("mousemove", (e) => {
      if (!isMouseDown || !this.currentModel) return;

      const deltaX = e.clientX - mouseX;
      const deltaY = e.clientY - mouseY;

      rotationY += deltaX * 0.01;
      rotationX += deltaY * 0.01;

      this.currentModel.rotation.y = rotationY;
      this.currentModel.rotation.x = rotationX;

      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    this.viewerArea.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (!this.currentModel) return;

      const zoom = e.deltaY * 0.001;
      this.camera.position.z += zoom;
      this.camera.position.z = Math.max(
        1,
        Math.min(20, this.camera.position.z)
      );
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;

    this.camera.aspect =
      this.viewerArea.clientWidth / this.viewerArea.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(
      this.viewerArea.clientWidth,
      this.viewerArea.clientHeight
    );
  }

  async loadGLBModel(url) {
    return new Promise((resolve, reject) => {
      const loader = new THREE.GLTFLoader();
      loader.load(
        url,
        (gltf) => resolve(gltf.scene),
        undefined,
        (error) => reject(error)
      );
    });
  }

  async displayModel(modelUrl, modelType = "refined") {
    try {
      if (this.currentModel) {
        this.scene.remove(this.currentModel);
      }

      this.showModelLoading();
      const model = await this.loadGLBModel(modelUrl);

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      model.position.sub(center);

      const maxSize = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxSize;
      model.scale.setScalar(scale);

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.currentModel = model;
      this.currentModelType = modelType;
      this.scene.add(model);

      this.clearPlaceholder();
      if (!this.viewerArea.contains(this.renderer.domElement)) {
        this.viewerArea.appendChild(this.renderer.domElement);
      }

      this.updateModelInfo(modelType, size);
      this.addMessage(
        `${modelType === "refined" ? "Refined" : "Draft"} model loaded.`,
        "system"
      );
    } catch (error) {
      console.error("Error displaying model:", error);
      this.addMessage(
        `Error loading ${modelType} model: ${error.message}`,
        "bot"
      );
      this.showModelError();
    }
  }

  showModelLoading() {
    const placeholder = this.viewerArea.querySelector(".placeholder");
    if (placeholder) {
      placeholder.innerHTML = `
        <p>Loading 3D model...</p>
        <small>Please wait while the model is prepared.</small>
      `;
    }
  }

  showModelError() {
    const placeholder = this.viewerArea.querySelector(".placeholder");
    if (placeholder) {
      placeholder.innerHTML = `
        <p>Failed to load the 3D model.</p>
        <small>Please try generating or uploading a new model.</small>
      `;
    }
  }

  clearPlaceholder() {
    const placeholder = this.viewerArea.querySelector(".placeholder");
    if (placeholder) {
      placeholder.style.display = "none";
    }
  }

  updateModelInfo(modelType, size) {
    const modelDetails = document.getElementById("model-details");
    if (!modelDetails) return;
    modelDetails.innerHTML = `
      <strong>Model type:</strong> ${
        modelType === "refined" ? "Refined quality" : "Draft quality"
      }<br/>
      <strong>Dimensions:</strong> ${size.x.toFixed(2)} × ${size.y.toFixed(
      2
    )} × ${size.z.toFixed(2)}<br/>
      <strong>Format:</strong> GLB (binary glTF)<br/>
      <strong>Status:</strong> Ready for inspection and download
    `;
  }

  /* ---------- UI bindings ---------- */

  setupEventListeners() {
    this.chatForm.addEventListener("submit", (e) => this.handleSubmit(e));
    this.fileUploadArea?.addEventListener("click", () =>
      this.fileInput?.click()
    );
    this.fileInput?.addEventListener("change", (e) =>
      this.handleFileSelect(e)
    );
    this.downloadBtn?.addEventListener("click", () => this.downloadModel());
    this.infoToggle?.addEventListener("click", () => this.toggleModelInfo());
    this.closeInfo?.addEventListener("click", () => this.hideModelInfo());

    if (this.voiceBtn) {
      this.voiceBtn.addEventListener("click", () => this.toggleVoiceInput());
    }
  }

  toggleModelInfo() {
    if (this.modelInfoVisible) {
      this.hideModelInfo();
    } else {
      this.showModelInfo();
    }
  }

  showModelInfo() {
    this.modelInfo.classList.add("show");
    this.infoToggle.classList.add("active");
    this.modelInfoVisible = true;
  }

  hideModelInfo() {
    this.modelInfo.classList.remove("show");
    this.infoToggle.classList.remove("active");
    this.modelInfoVisible = false;
  }

  /* ---------- Drag & drop / file upload ---------- */

  setupDragAndDrop() {
    const preventDefaults = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      document.addEventListener(eventName, preventDefaults, false);
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      this.fileUploadArea?.addEventListener(eventName, () => {
        this.fileUploadArea?.classList.add("dragover");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      this.fileUploadArea?.addEventListener(eventName, () => {
        this.fileUploadArea?.classList.remove("dragover");
      });
    });

    this.fileUploadArea?.addEventListener("drop", (e) => {
      const files = e.dataTransfer.files;
      this.handleFiles(files, true);
    });
  }

  handleFileSelect(e) {
    const files = e.target.files;
    this.handleFiles(files, true);
  }

  handleFiles(files, autoDisplay = false) {
    this.currentFiles = Array.from(files);
    this.displayFilePreview();

    const glbFileIndex = this.currentFiles.findIndex((file) =>
      file.name.toLowerCase().endsWith(".glb")
    );

    if (glbFileIndex !== -1 && autoDisplay) {
      const glbFile = this.currentFiles[glbFileIndex];
      const formData = new FormData();
      formData.append("file", glbFile);

      this.addMessage(`Uploading ${glbFile.name}...`, "system");

      fetch("/upload", {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then(async (data) => {
          if (data.status === "success") {
            const modelUrl = `/models/${data.filename}`;
            this.modelUrls.refined = modelUrl;
            this.currentModelType = "refined";
            await this.displayModel(modelUrl, "refined");
            this.addMessage(
              `Upload complete. Displayed model: ${data.filename}`,
              "system"
            );
          } else {
            this.addMessage(`Upload failed: ${data.message}`, "bot");
          }
        })
        .catch((err) => {
          console.error("Upload error:", err);
          this.addMessage(`Upload error: ${err.message}`, "bot");
        });
    }
  }

  clearFiles() {
    this.currentFiles = [];
    if (this.fileInput) this.fileInput.value = "";
    this.filePreview?.classList.remove("show");
  }

  displayFilePreview() {
    if (this.currentFiles.length === 0) {
      this.filePreview?.classList.remove("show");
      return;
    }

    if (!this.filePreview) return;
    this.filePreview.classList.add("show");
    this.filePreview.innerHTML = `
      <strong>Selected files:</strong><br/>
      ${this.currentFiles
        .map((file) => `${file.name} (${this.formatFileSize(file.size)})`)
        .join("<br/>")}
      <button type="button" onclick="app.clearFiles()" style="
        margin-left: 8px;
        background: linear-gradient(135deg, #ff6b6b, #ee5a24);
        color: white;
        border: none;
        padding: 4px 10px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.8rem;
      ">Clear</button>
    `;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /* ---------- Typing, progress, messages ---------- */

  addMessage(text, type) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    this.chatMessages.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  showTypingIndicator() {
    const typingDiv = document.createElement("div");
    typingDiv.className = "typing-indicator";
    typingDiv.id = "typing-indicator";
    typingDiv.innerHTML = `
      <span style="font-weight: 500;">Assistant is preparing a response</span>
      <div class="typing-dots">
        <span></span><span></span><span></span>
      </div>
    `;
    this.chatMessages.appendChild(typingDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  hideTypingIndicator() {
    const typingIndicator = document.getElementById("typing-indicator");
    if (typingIndicator) typingIndicator.remove();
  }

  showProgress() {
    this.progressBar?.classList.add("show");
    this.updateProgress(0);
  }

  hideProgress() {
    setTimeout(() => {
      this.progressBar?.classList.remove("show");
    }, 400);
  }

  updateProgress(percentage) {
    if (this.progressFill) {
      this.progressFill.style.width = percentage + "%";
    }
  }

  /* ---------- Chat / generation ---------- */

  async handleSubmit(e) {
    e.preventDefault();
    const message = this.chatInput.value.trim();
    if (!message && this.currentFiles.length === 0) return;
    if (this.isGenerating) return;

    // If a model already exists, interpret as remix
    if (this.currentModel && this.modelUrls.refined) {
      await this.sendRemixRequest(message);
      return;
    }

    if (message) {
      this.addMessage(message, "user");
      this.chatInput.value = "";
      this.chatInput.style.height = "auto";
    }

    if (this.currentFiles.length > 0) {
      this.addMessage(
        `Uploaded ${this.currentFiles.length} file(s): ${this.currentFiles
          .map((f) => f.name)
          .join(", ")}`,
        "system"
      );
    }

    this.isGenerating = true;
    this.sendBtn.disabled = true;
    this.showTypingIndicator();
    this.showProgress();

    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 90) progress = 90;
      this.updateProgress(progress);
    }, 200);

    try {
      const response = await fetch("/txtgen3d", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: message,
          artstyle: "realistic",
          save_path: "3d_files",
        }),
      });

      clearInterval(progressInterval);
      this.updateProgress(100);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();

      if (result.status === "success") {
        this.addMessage(`3D model generated: ${result.message}`, "bot");

        this.modelUrls.refined = `/models/refined_model.glb`;
        this.modelUrls.draft = `/models/draft_model.glb`;
        await this.displayModel(this.modelUrls.refined, "refined");

        this.addMessage(
          "Use the mouse to rotate the model and the scroll wheel to zoom.",
          "system"
        );
      } else {
        this.addMessage(
          `Generation failed: ${result.message || "Unknown error"}.`,
          "bot"
        );
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error("API call failed:", error);
      this.addMessage(
        "There was an error processing your request. Ensure the backend is running and try again.",
        "bot"
      );
    } finally {
      this.isGenerating = false;
      this.sendBtn.disabled = false;
      this.hideTypingIndicator();
      this.hideProgress();
      this.clearFiles();
    }
  }

  async sendRemixRequest(prompt) {
    if (!prompt) return;

    this.addMessage(prompt, "user");
    this.chatInput.value = "";
    this.chatInput.style.height = "auto";

    this.showTypingIndicator();
    this.showProgress();
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      this.updateProgress(Math.min(progress, 90));
    }, 200);

    try {
      if (!this.modelUrls.refined || !this.modelUrls.refined.includes("/models/")) {
        throw new Error("No uploaded model found for remixing.");
      }

      const filename = this.modelUrls.refined.split("/models/")[1];
      const glb_path = `3d_files/${filename}`;

      const response = await fetch("/remixgen3d", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          glb_path: glb_path,
          images_output: "images",
          text: prompt,
          image_output: "image",
          threeD_output: "3d_files",
        }),
      });

      clearInterval(interval);
      this.updateProgress(100);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.status === "success") {
        this.addMessage("Remix complete. Displaying new model.", "bot");

        const remixPath = "/models/remixed_draft_model.glb";
        this.modelUrls.draft = remixPath;
        await this.displayModel(remixPath, "draft");
      } else {
        this.addMessage(`Remix failed: ${result.message}`, "bot");
      }
    } catch (error) {
      clearInterval(interval);
      console.error("Remix error:", error);
      this.addMessage(`Remix error: ${error.message}`, "bot");
    } finally {
      this.hideTypingIndicator();
      this.hideProgress();
      this.clearFiles();
      this.sendBtn.disabled = false;
      this.isGenerating = false;
    }
  }

  downloadModel() {
    if (!this.modelUrls.refined && !this.modelUrls.draft) {
      this.addMessage(
        "No model is available for download. Generate or upload a model first.",
        "bot"
      );
      return;
    }

    const currentUrl = this.modelUrls[this.currentModelType];
    if (currentUrl) {
      const link = document.createElement("a");
      link.href = currentUrl;
      link.download = `${this.currentModelType}_model.glb`;
      link.click();

      this.addMessage(
        `Downloading ${this.currentModelType} model.`,
        "system"
      );
    }
  }

  /* ---------- Layout resize ---------- */

  setupResize() {
    this.resizeHandle?.addEventListener("mousedown", (e) => {
      this.isResizing = true;
      this.resizeHandle.classList.add("dragging");
      this.boundHandleResize = this.handleResize.bind(this);
      this.boundStopResize = this.stopResize.bind(this);
      document.addEventListener("mousemove", this.boundHandleResize);
      document.addEventListener("mouseup", this.boundStopResize);
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

    if (
      newChatWidth >= minChatWidth &&
      newChatWidth <= maxChatWidth &&
      containerRect.width - newChatWidth >= minViewerWidth
    ) {
      this.chatSection.style.width = newChatWidth + "px";
      this.resizeHandle.style.right = newChatWidth + "px";
      setTimeout(() => this.onWindowResize(), 100);
    }
  }

  stopResize() {
    this.isResizing = false;
    this.resizeHandle.classList.remove("dragging");
    document.removeEventListener("mousemove", this.boundHandleResize);
    document.removeEventListener("mouseup", this.boundStopResize);
  }

  autoResizeTextarea() {
    this.chatInput?.addEventListener("input", () => {
      this.chatInput.style.height = "auto";
      this.chatInput.style.height =
        Math.min(this.chatInput.scrollHeight, 120) + "px";
    });
  }

  /* ---------- Speech-to-text with OpenAI whisper-1 ---------- */

  async toggleVoiceInput() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.addMessage(
        "Microphone access is not supported in this browser.",
        "bot"
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioStream = stream;
      this.audioChunks = [];

      // Try higher-quality Opus WebM; fall back if browser complains.
      let options = {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: 128000,
      };
      try {
        this.mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        this.mediaRecorder = new MediaRecorder(stream);
      }

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: "audio/webm" });
        this.sendAudioForTranscription(blob);

        if (this.audioStream) {
          this.audioStream.getTracks().forEach((t) => t.stop());
          this.audioStream = null;
        }
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.voiceBtn.classList.add("active");
      if (this.sttStatus) this.sttStatus.textContent = "Recording…";
      this.addMessage(
        "Recording started. Click the microphone button again to stop.",
        "system"
      );
    } catch (err) {
      console.error("Error accessing microphone:", err);
      this.addMessage(
        "Unable to access the microphone. Check browser permissions and try again.",
        "bot"
      );
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }

    this.isRecording = false;
    this.voiceBtn.classList.remove("active");
    if (this.sttStatus) this.sttStatus.textContent = "Transcribing…";
    this.addMessage("Recording stopped. Transcribing audio.", "system");
  }

  async sendAudioForTranscription(blob) {
    try {
      const formData = new FormData();
      formData.append("file", blob, "speech.webm");

      const response = await fetch("/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.status === "success" && result.text) {
        const transcript = result.text.trim();
        this.chatInput.value = transcript;
        this.chatInput.dispatchEvent(new Event("input"));
        this.addMessage(
          "Transcription complete. You can edit the text and press Send.",
          "system"
        );
      } else {
        this.addMessage(
          `Transcription failed: ${result.message || "Unknown error."}`,
          "bot"
        );
      }
    } catch (error) {
      console.error("Transcription error:", error);
      this.addMessage(
        "There was an error transcribing the audio. Please try again or type your prompt.",
        "bot"
      );
    } finally {
      if (this.sttStatus) this.sttStatus.textContent = "";
    }
  }
}

/* ---------- Initialize app ---------- */

const app = new TextTo3DApp();

setTimeout(() => {
  app.addMessage(
    "Tip: clear, concise descriptions work best. For example: “a low-poly medieval tower” or “a realistic ergonomic office chair”.",
    "bot"
  );
}, 1500);
