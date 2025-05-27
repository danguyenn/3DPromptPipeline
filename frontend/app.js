// app.js
class TextTo3DApp {
  constructor() {
    this.currentFiles = [];
    this.isGenerating = false;
    this.isResizing = false;
    this.modelInfoVisible = false;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.currentModel = null;
    this.modelUrls = { refined: null, draft: null };
    this.currentModelType = "refined"; // 'refined' or 'draft'
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
  }

  initThreeJS() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f5f5);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.viewerArea.clientWidth / this.viewerArea.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 5);

    // Create renderer
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

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Add orbit controls (manual implementation since OrbitControls isn't available)
    this.setupMouseControls();

    // Handle window resize
    window.addEventListener("resize", () => this.onWindowResize());

    // Start render loop
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

    // Mouse wheel for zoom
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
        (gltf) => {
          resolve(gltf.scene);
        },
        (progress) => {
          // Handle loading progress if needed
          console.log(
            "Loading progress:",
            (progress.loaded / progress.total) * 100 + "%"
          );
        },
        (error) => {
          console.error("Error loading GLB model:", error);
          reject(error);
        }
      );
    });
  }

  async displayModel(modelUrl, modelType = "refined") {
    try {
      // Clear existing model
      if (this.currentModel) {
        this.scene.remove(this.currentModel);
      }

      // Show loading state
      this.showModelLoading();

      // Load new model
      const model = await this.loadGLBModel(modelUrl);

      // Center and scale the model
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      // Center the model
      model.position.sub(center);

      // Scale to fit in view
      const maxSize = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxSize;
      model.scale.setScalar(scale);

      // Enable shadows
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.currentModel = model;
      this.currentModelType = modelType;
      this.scene.add(model);

      // Clear the placeholder and add the canvas
      this.clearPlaceholder();
      if (!this.viewerArea.contains(this.renderer.domElement)) {
        this.viewerArea.appendChild(this.renderer.domElement);
      }

      // Update model info
      this.updateModelInfo(modelType, size);

      this.addMessage(
        `✅ ${
          modelType === "refined" ? "Refined" : "Draft"
        } model loaded successfully!`,
        "system"
      );
    } catch (error) {
      console.error("Error displaying model:", error);
      this.addMessage(
        `❌ Error loading ${modelType} model: ${error.message}`,
        "bot"
      );
      this.showModelError();
    }
  }

  showModelLoading() {
    const placeholder = this.viewerArea.querySelector(".placeholder");
    if (placeholder) {
      placeholder.innerHTML = `
        <div class="loading-spinner"></div>
        <p>Loading 3D Model...</p>
        <small>Please wait while we prepare your model</small>
      `;
    }
  }

  showModelError() {
    const placeholder = this.viewerArea.querySelector(".placeholder");
    if (placeholder) {
      placeholder.innerHTML = `
        <div class="placeholder-icon">❌</div>
        <p>Failed to load 3D model</p>
        <small>Please try generating a new model</small>
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
    if (modelDetails) {
      modelDetails.innerHTML = `
        <strong>Model Type:</strong> ${
          modelType === "refined" ? "Refined Quality" : "Draft Quality"
        }<br>
        <strong>Dimensions:</strong> ${size.x.toFixed(2)} × ${size.y.toFixed(
        2
      )} × ${size.z.toFixed(2)}<br>
        <strong>Vertices:</strong> ${this.getVertexCount()}<br>
        <strong>Format:</strong> GLB (Binary glTF)<br>
        <strong>Status:</strong> Ready for download
      `;
    }
  }

  getVertexCount() {
    if (!this.currentModel) return 0;

    let vertexCount = 0;
    this.currentModel.traverse((child) => {
      if (child.isMesh && child.geometry) {
        vertexCount += child.geometry.attributes.position.count;
      }
    });
    return vertexCount.toLocaleString();
  }

  setupEventListeners() {
    this.chatForm.addEventListener("submit", (e) => this.handleSubmit(e));
    this.fileUploadArea?.addEventListener("click", () =>
      this.fileInput?.click()
    );
    this.fileInput?.addEventListener("change", (e) => this.handleFileSelect(e));
    this.downloadBtn?.addEventListener("click", () => this.downloadModel());
    this.infoToggle?.addEventListener("click", () => this.toggleModelInfo());
    this.closeInfo?.addEventListener("click", () => this.hideModelInfo());
  }

  // Add model switching functionality
  addModelSwitchControls() {
    if (!this.modelUrls.refined || !this.modelUrls.draft) return;

    const controlsDiv = document.createElement("div");
    controlsDiv.className = "model-switch-controls";
    controlsDiv.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      display: flex;
      gap: 8px;
      z-index: 10;
    `;

    const refinedBtn = document.createElement("button");
    refinedBtn.textContent = "Refined";
    refinedBtn.className = `model-switch-btn ${
      this.currentModelType === "refined" ? "active" : ""
    }`;
    refinedBtn.onclick = () => this.switchModel("refined");

    const draftBtn = document.createElement("button");
    draftBtn.textContent = "Draft";
    draftBtn.className = `model-switch-btn ${
      this.currentModelType === "draft" ? "active" : ""
    }`;
    draftBtn.onclick = () => this.switchModel("draft");

    controlsDiv.appendChild(refinedBtn);
    controlsDiv.appendChild(draftBtn);

    // Remove existing controls
    const existing = this.viewerArea.querySelector(".model-switch-controls");
    if (existing) existing.remove();

    this.viewerArea.appendChild(controlsDiv);

    // Add styles
    const style = document.createElement("style");
    style.textContent = `
      .model-switch-btn {
        background: rgba(255, 255, 255, 0.9);
        border: 2px solid #dee2e6;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s ease;
      }
      .model-switch-btn:hover {
        background: white;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      .model-switch-btn.active {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        border-color: #667eea;
      }
    `;
    if (!document.head.querySelector("#model-switch-styles")) {
      style.id = "model-switch-styles";
      document.head.appendChild(style);
    }
  }

  async switchModel(modelType) {
    const url = this.modelUrls[modelType];
    if (!url) return;

    await this.displayModel(url, modelType);

    // Update button states
    const buttons = this.viewerArea.querySelectorAll(".model-switch-btn");
    buttons.forEach((btn) => {
      btn.classList.toggle(
        "active",
        btn.textContent.toLowerCase() === modelType
      );
    });
  }

  setupDragAndDrop() {
    const preventDefaults = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Prevent default drag behaviors globally (IMPORTANT)
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      document.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop area
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

    // Handle dropped files
    this.fileUploadArea?.addEventListener("drop", (e) => {
      const files = e.dataTransfer.files;
      this.handleFiles(files, true); // true = auto-display
    });
  }

  autoResizeTextarea() {
    this.chatInput?.addEventListener("input", () => {
      this.chatInput.style.height = "auto";
      this.chatInput.style.height =
        Math.min(this.chatInput.scrollHeight, 120) + "px";
    });
  }

  setupResize() {
    this.resizeHandle?.addEventListener("mousedown", (e) => {
      this.isResizing = true;
      this.resizeHandle.classList.add("dragging");
      document.addEventListener("mousemove", this.handleResize.bind(this));
      document.addEventListener("mouseup", this.stopResize.bind(this));
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

      // Update renderer size
      setTimeout(() => this.onWindowResize(), 100);
    }
  }

  stopResize() {
    this.isResizing = false;
    this.resizeHandle.classList.remove("dragging");
    document.removeEventListener("mousemove", this.handleResize);
    document.removeEventListener("mouseup", this.stopResize);
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

  handleFileSelect(e) {
    const files = e.target.files;
    this.handleFiles(files, true);
  }

  handleFiles(files, autoDisplay = false) {
    this.currentFiles = Array.from(files);
    this.displayFilePreview();

    // Auto-display first .glb file if present
    const glbFileIndex = this.currentFiles.findIndex((file) =>
      file.name.toLowerCase().endsWith(".glb")
    );
    if (glbFileIndex !== -1 && autoDisplay) {
      const glbFile = this.currentFiles[glbFileIndex];
      const localUrl = URL.createObjectURL(glbFile);
      this.modelUrls.refined = localUrl;
      this.currentModelType = "refined";
      this.displayModel(localUrl, "refined");
      this.addModelSwitchControls();
      this.addMessage(
        `Displaying uploaded GLB file: ${glbFile.name}`,
        "system"
      );
    }
  }

  clearFiles() {
    this.currentFiles = [];
    if (this.fileInput) this.fileInput.value = "";
    this.filePreview?.classList.remove("show");
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  addMessage(text, type) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    this.chatMessages.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  displayFilePreview() {
    if (this.currentFiles.length === 0) {
      this.filePreview?.classList.remove("show");
      return;
    }

    if (!this.filePreview) return;
    this.filePreview.classList.add("show");
    this.filePreview.innerHTML = `
      <strong>📁 Selected files:</strong><br>
      ${this.currentFiles
        .map((file) => `📄 ${file.name} (${this.formatFileSize(file.size)})`)
        .join("<br>")}
      <button type="button" onclick="app.clearFiles()" style="margin-left: 10px; background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: white; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.3s ease;">✕ Clear</button>
    `;
  }

  showTypingIndicator() {
    const typingDiv = document.createElement("div");
    typingDiv.className = "typing-indicator";
    typingDiv.id = "typing-indicator";
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
    const typingIndicator = document.getElementById("typing-indicator");
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  showProgress() {
    this.progressBar?.classList.add("show");
    this.updateProgress(0);
  }

  hideProgress() {
    setTimeout(() => {
      this.progressBar?.classList.remove("show");
    }, 500);
  }

  updateProgress(percentage) {
    if (this.progressFill) {
      this.progressFill.style.width = percentage + "%";
    }
  }

  async sendRemixRequest(prompt) {
    this.showTypingIndicator();
    this.showProgress();
    let progress = 0;

    const interval = setInterval(() => {
      progress += Math.random() * 10;
      this.updateProgress(Math.min(progress, 90));
    }, 200);

    try {
      const response = await fetch("http://localhost:5050/remixgen3d", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          glb_path: "3d_files/refined_model.glb",
          images_output: "images",
          text: prompt,
          image_output: "image",
          threeD_output: "3d_files",
        }),
      });

      clearInterval(interval);
      this.updateProgress(100);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const result = await response.json();
      if (result.status === "success") {
        this.addMessage("✅ Remix complete! Displaying new model...", "bot");

        // Load remixed model
        const remixPath =
          "http://localhost:5050/models/remixed_draft_model.glb";
        this.modelUrls.draft = remixPath;
        await this.displayModel(remixPath, "draft");
        this.addModelSwitchControls();
      } else {
        this.addMessage(`❌ Remix failed: ${result.message}`, "bot");
      }
    } catch (error) {
      clearInterval(interval);
      this.addMessage(`❌ Remix error: ${error.message}`, "bot");
    } finally {
      this.hideTypingIndicator();
      this.hideProgress();
      this.clearFiles();
      this.sendBtn.disabled = false;
      this.isGenerating = false;
    }
  }

  async handleSubmit(e) {

    e.preventDefault();
    const message = this.chatInput.value.trim();
    if (!message && this.currentFiles.length === 0) return;
    if (this.isGenerating) return;

    if(this.currentModel && this.modelUrls.refined){
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
        `📎 Uploaded ${this.currentFiles.length} file(s): ${this.currentFiles
          .map((f) => f.name)
          .join(", ")}`,
        "system"
      );
    }

    this.isGenerating = true;
    this.sendBtn.disabled = true;
    this.showTypingIndicator();
    this.showProgress();

    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 90) progress = 90;
      this.updateProgress(progress);
    }, 200);

    try {
      const response = await fetch("http://localhost:5050/txtgen3d", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: message,
          artstyle: "realistic",
          save_path: "3d_files",
        }),
      });

      clearInterval(progressInterval);
      this.updateProgress(100);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === "success") {
        this.addMessage(
          `✅ Successfully generated 3D model: ${result.message}`,
          "bot"
        );

        this.modelUrls.refined = `http://localhost:5050/models/refined_model.glb`;
        this.modelUrls.draft = `http://localhost:5050/models/draft_model.glb`;
        await this.displayModel(this.modelUrls.refined, "refined");

        // Add model switching controls
        this.addModelSwitchControls();

        this.addMessage(
          "🎮 Use your mouse to rotate the model and scroll to zoom. Switch between Draft and Refined versions using the buttons!",
          "system"
        );
      } else {
        this.addMessage(
          `❌ Generation failed: ${result.message || "Unknown error"}`,
          "bot"
        );
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error("API call failed:", error);
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        this.addMessage(
          "❌ Cannot connect to the server. Please make sure the backend is running on localhost:5050.",
          "bot"
        );
      } else if (error.message.includes("HTTP error")) {
        this.addMessage(`❌ Server error: ${error.message}`, "bot");
      } else {
        this.addMessage(
          "❌ Sorry, there was an error processing your request. Please try again.",
          "bot"
        );
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
    if (!this.modelUrls.refined && !this.modelUrls.draft) {
      this.addMessage(
        "❌ No model available for download. Please generate a model first.",
        "bot"
      );
      return;
    }

    const currentUrl = this.modelUrls[this.currentModelType];
    if (currentUrl) {
      // Create a temporary link to download the current model
      const link = document.createElement("a");
      link.href = currentUrl;
      link.download = `${this.currentModelType}_model.glb`;
      link.click();

      this.addMessage(
        `🎉 Downloading ${this.currentModelType} model...`,
        "system"
      );
    }
  }
}

// Initialize the app
const app = new TextTo3DApp();

// Add welcome message after a delay
setTimeout(() => {
  app.addMessage(
    "💡 Pro tip: Try describing objects like 'futuristic spaceship', 'cozy wooden cabin', or 'fantasy sword' for best results!",
    "bot"
  );
}, 2000);
