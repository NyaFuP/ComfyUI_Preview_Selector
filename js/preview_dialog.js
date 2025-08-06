/**
 * NF Preview Selector - Preview Dialog Component
 */



import { NFFloatingWindow } from './floating_window.js';
import { api } from "../../scripts/api.js";
import { app } from "../../scripts/app.js";

export class NFPreviewDialog {
    constructor() {
        this.window = null;
        this.images = [];
        this.selectedIndices = new Set();
        this.reviewId = null;
        this.uniqueId = null;
        this.timeout = 60;
        this.countdownInterval = null;
        this.remainingTime = 0;
        this.isPinned = false;
        
        // v1.2.5: Expanded image view system
        this.expandedView = null;
        
        // Load CSS
        this.loadCSS();
        
        this.applyMaxWidthSetting();
        
        // Setup Queue Prompt keybinding integration
        this.setupQueuePromptIntegration();
    }
    
    loadCSS() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = new URL("./floating_window.css", import.meta.url).href;
        document.head.appendChild(link);
    }
    
    applyMaxWidthSetting() {
        let maxWidth = app.ui.settings.getSettingValue("NFPreviewSelector.UI.MaxWidth.v2", 
            app.ui.settings.getSettingValue("NFPreviewSelector.UI.MaxWidth", 800));
        
        maxWidth = Math.max(400, Math.min(1800, maxWidth));
        
        const style = document.createElement('style');
        style.id = 'nf-preview-max-width-style';
        style.textContent = `
            .nf-float {
                max-width: ${maxWidth}px !important;
            }
        `;
        
        const existingStyle = document.getElementById('nf-preview-max-width-style');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        document.head.appendChild(style);
    }
    
    setupQueuePromptIntegration() {
        // Listen for Queue Prompt keybinding events
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.key === 'Enter') {
                if (this.isVisible()) {
                    this.stopDialogForQueue();
                    
                }
            }
        });
        
        api.addEventListener("status", (event) => {
            const status = event.detail;
            
            if (status && status.exec_info && status.exec_info.queue_remaining > 0) {
                if (this.isVisible()) {
                    this.stopDialogForQueue();
                }
            }
        });
    }
    
    stopDialogForQueue() {
        this.stopCountdown();
        
        this.sendSelection([], true);
        
        if (this.isPinned) {
            this.prepareForNextRequest();
        } else {
            this.hide();
        }
    }
    
    isVisible() {
        return this.window && !this.window.classList.contains('hidden');
    }
    
    show(data) {
        // Apply latest max width setting
        this.applyMaxWidthSetting();
        
        if (this.reviewId === data.review_id && this.window) {
            return;
        }
        
        if (this.isPinned && this.isVisible()) {
            this.updateWithNewData(data);
            return;
        }
        
        this.stopCountdown();
        
        this.images = data.images || [];
        this.reviewId = data.review_id;
        this.uniqueId = data.unique_id;
        this.timeout = data.timeout || 60;
        this.remainingTime = this.timeout;
        this.selectedIndices.clear();
        
        this.createWindow();
        this.renderImages();
        this.startCountdown();
    }
    
    createWindow() {
        if (this.window) {
            this.window.destroy();
        }
        
        const rememberPosition = app.ui.settings.getSettingValue("NFPreviewSelector.UI.WindowPosition", true);
        const savedPosition = rememberPosition ? this.getSavedPosition() : null;
        let x, y;
        
        if (savedPosition) {
            x = savedPosition.x;
            y = savedPosition.y;
        } else {
            x = Math.max(0, (window.innerWidth - 600) / 2);
            y = Math.max(0, (window.innerHeight - 400) / 2);
        }
        
        this.window = new NFFloatingWindow(
            `NF Preview - Select Images (${this.images.length})`,
            x,
            y,
            null,
            this.onWindowMove.bind(this),
            this.onWindowResize.bind(this)
        );
        
        this.setupWindowContent();
        this.updateWindowTitle();
        
        if (rememberPosition) {
            const savedSize = this.getSavedSize();
            if (savedSize) {
                this.window.style.width = savedSize.width + 'px';
                this.window.style.height = savedSize.height + 'px';
            }
        }
        
        if (!savedPosition) {
            this.centerDialog();
        }
    }
    
    setupWindowContent() {
        // Image grid container
        this.imageGrid = document.createElement('div');
        this.imageGrid.className = 'nf-image-grid';
        this.window.body.appendChild(this.imageGrid);
        
        // Controls
        this.controls = document.createElement('div');
        this.controls.className = 'nf-controls';
        
        this.selectionInfo = document.createElement('div');
        this.selectionInfo.className = 'nf-selection-info';
        this.updateSelectionInfo();
        
        this.countdown = document.createElement('div');
        this.countdown.className = 'nf-countdown';
        
        // Buttons
        this.buttons = document.createElement('div');
        this.buttons.className = 'nf-buttons';
        
        this.confirmButton = document.createElement('button');
        this.confirmButton.className = 'nf-button primary';
        this.confirmButton.textContent = 'Confirm Selection';
        this.confirmButton.onclick = this.confirmSelection.bind(this);
        this.updateConfirmButton();
        
        this.cancelButton = document.createElement('button');
        this.cancelButton.className = 'nf-button secondary';
        this.cancelButton.textContent = 'Cancel';
        this.cancelButton.onclick = this.cancelSelection.bind(this);
        
        this.pinButton = document.createElement('button');
        this.pinButton.className = 'nf-button pin';
        this.pinButton.innerHTML = '📌';
        this.pinButton.title = 'Pin dialog to keep open during new generations';
        this.pinButton.onclick = this.togglePin.bind(this);
        this.updatePinButton();
        
        this.buttons.appendChild(this.confirmButton);
        this.buttons.appendChild(this.cancelButton);
        this.buttons.appendChild(this.pinButton);
        
        this.controls.appendChild(this.selectionInfo);
        this.controls.appendChild(this.countdown);
        this.controls.appendChild(this.buttons);
        
        this.window.body.appendChild(this.controls);
    }
    
    renderImages() {
        this.imageGrid.innerHTML = '';
        
        let loadedImages = 0;
        let landscapeCount = 0;
        let portraitCount = 0;
        
        this.images.forEach((imageInfo, index) => {
            const container = document.createElement('div');
            container.className = 'nf-image-container';
            container.dataset.index = index;
            container.onclick = () => this.toggleImage(index);
            
            // v1.2.5: Add double-click for expanded view
            container.ondblclick = (e) => {
                e.stopPropagation();
                this.showExpandedView(index);
            };
            
            const img = document.createElement('img');
            img.className = 'nf-image';
            img.src = this.getImageUrl(imageInfo);
            img.alt = `Image ${index + 1}`;
            
            img.onload = () => {
                loadedImages++;
                
                const aspectRatio = img.naturalWidth / img.naturalHeight;
                if (aspectRatio > 1.1) {
                    landscapeCount++;
                } else if (aspectRatio < 0.9) {
                    portraitCount++;
                }
                
                if (loadedImages === this.images.length) {
                    this.applyImageLayout(landscapeCount, portraitCount);
                }
            };
            
            const overlay = document.createElement('div');
            overlay.className = 'nf-image-overlay';
            overlay.textContent = index + 1;
            
            container.appendChild(img);
            container.appendChild(overlay);
            this.imageGrid.appendChild(container);
        });
    }
    
    applyImageLayout(landscapeCount, portraitCount) {
        this.imageGrid.className = 'nf-image-grid comfyui-layout';
        
        const dialogWidth = this.window.offsetWidth - 48;
        const dialogHeight = this.window.offsetHeight - 140;
        
        const layoutResult = this.calculateComfyUILayout(this.images, dialogWidth, dialogHeight);
        
        this.imageGrid.style.setProperty('--min-column-width', `${layoutResult.cellWidth}px`);
        this.imageGrid.style.setProperty('--cell-height', `${layoutResult.cellHeight}px`);
        this.imageGrid.style.setProperty('--max-columns', layoutResult.cols);
        this.imageGrid.style.setProperty('--max-rows', layoutResult.rows);
        
    }
    
    calculateComfyUILayout(images, availableWidth, availableHeight) {
        if (!images || images.length === 0) {
            return { cellWidth: 200, cellHeight: 200, cols: 1, rows: 1 };
        }
        
        let imageWidth = 512;
        let imageHeight = 512;
        
        const firstImageContainer = this.imageGrid.querySelector('.nf-image-container img');
        if (firstImageContainer && firstImageContainer.naturalWidth > 0) {
            imageWidth = firstImageContainer.naturalWidth;
            imageHeight = firstImageContainer.naturalHeight;
        }
        
        const numImages = images.length;
        let bestArea = 0;
        let bestResult = { cellWidth: 200, cellHeight: 200, cols: 1, rows: 1 };
        
        for (let cols = 1; cols <= numImages; cols++) {
            const rows = Math.ceil(numImages / cols);
            const cellWidth_available = availableWidth / cols;
            const cellHeight_available = availableHeight / rows;
            
            const scaleX = cellWidth_available / imageWidth;
            const scaleY = cellHeight_available / imageHeight;
            const scale = Math.min(scaleX, scaleY, 1);
            
            const cellWidth = imageWidth * scale;
            const cellHeight = imageHeight * scale;
            
            const totalDisplayArea = cellWidth * cellHeight * numImages;
            
            if (totalDisplayArea > bestArea) {
                bestArea = totalDisplayArea;
                bestResult = {
                    cellWidth: Math.round(cellWidth),
                    cellHeight: Math.round(cellHeight),
                    cols,
                    rows
                };
            }
        }
        
        return bestResult;
    }
    
    calculateResponsiveColumnWidth(landscapeCount, portraitCount) {
        const dialogWidth = this.window.offsetWidth - 48;
        const isLandscapeDominant = landscapeCount > portraitCount;
        
        const devicePixelRatio = window.devicePixelRatio || 1;
        const dpiMultiplier = Math.min(Math.max(devicePixelRatio, 1), 2);
        
        const baseRatio = isLandscapeDominant ? 0.45 : 0.30; // 45% for landscape, 30% for portrait
        const maxColumns = isLandscapeDominant ? 2 : 4;
        
        const baseColumnWidth = dialogWidth * baseRatio;
        
        const dpiAwareColumnWidth = baseColumnWidth * dpiMultiplier;
        
        const minWidthForColumns = dialogWidth / maxColumns;
        
        const absoluteMin = isLandscapeDominant ? 200 : 120;
        const absoluteMax = isLandscapeDominant ? 600 : 400;
        
        const finalColumnWidth = Math.max(
            absoluteMin,
            Math.min(
                absoluteMax,
                Math.max(minWidthForColumns, dpiAwareColumnWidth)
            )
        );
        
        return Math.round(finalColumnWidth);
    }
    
    getImageUrl(imageInfo) {
        return `/view?filename=${encodeURIComponent(imageInfo.filename)}&type=${imageInfo.type}&subfolder=${encodeURIComponent(imageInfo.subfolder || '')}`;
    }
    
    toggleImage(index) {
        const container = this.imageGrid.querySelector(`[data-index="${index}"]`);
        
        if (this.selectedIndices.has(index)) {
            this.selectedIndices.delete(index);
            container.classList.remove('selected');
        } else {
            this.selectedIndices.add(index);
            container.classList.add('selected');
        }
        
        this.updateSelectionInfo();
        this.updateConfirmButton();
        
    }
    
    updateSelectionInfo() {
        const count = this.selectedIndices.size;
        const total = this.images.length;
        this.selectionInfo.textContent = `Selected: ${count} of ${total}`;
    }
    
    updateConfirmButton() {
        const hasSelection = this.selectedIndices.size > 0;
        this.confirmButton.disabled = !hasSelection;
        this.confirmButton.textContent = hasSelection 
            ? `Confirm (${this.selectedIndices.size} selected)`
            : 'Select at least one image';
    }
    
    startCountdown() {
        this.updateCountdown();
        this.countdownInterval = setInterval(() => {
            this.remainingTime--;
            this.updateCountdown();
            
            if (this.remainingTime <= 0) {
                this.timeoutSelection();
            }
        }, 1000);
    }
    
    updateCountdown() {
        const minutes = Math.floor(this.remainingTime / 60);
        const seconds = this.remainingTime % 60;
        this.countdown.textContent = `Time remaining: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }
    
    confirmSelection() {
        this.stopCountdown();
        
        const selection = Array.from(this.selectedIndices).sort((a, b) => a - b);
        
        this.sendSelection(selection, false);
        
        if (this.isPinned) {
            this.prepareForNextRequest();
        } else {
            this.hide();
        }
    }
    
    cancelSelection() {
        this.stopCountdown();
        
        this.sendSelection([], true);
        
        if (this.isPinned) {
            this.prepareForNextRequest();
        } else {
            this.hide();
        }
    }
    
    prepareForNextRequest() {
        this.selectedIndices.clear();
        this.clearImageSelection();
        this.updateSelectionInfo();
        this.updateConfirmButton();
        this.stopCountdown();
        
        this.images = [];
        this.reviewId = null;
        this.uniqueId = null;
        
        this.showWaitingMessage();
    }
    
    showWaitingMessage() {
        if (this.imageGrid) {
            this.imageGrid.innerHTML = '<div class="nf-waiting-message">Waiting for next generation...</div>';
        }
        if (this.countdown) {
            this.countdown.textContent = 'Pinned - waiting for next request';
        }
    }
    
    timeoutSelection() {
        this.stopCountdown();
        
        const selection = [];
        
        this.sendSelection(selection, false);
        
        if (this.isPinned) {
            this.prepareForNextRequest();
        } else {
            this.hide();
        }
    }
    
    sendSelection(indices, cancelled) {
        const response = {
            review_id: this.reviewId,
            unique_id: this.uniqueId,
            selection: indices,
            cancelled: cancelled
        };
        
        fetch('/nf_preview_response', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(response)
        }).catch(error => {
        });
    }
    
    hide() {
        this.stopCountdown();
        
        if (this.window) {
            this.window.destroy();
            this.window = null;
        }
        
        this.selectedIndices.clear();
    }
    
    centerDialog() {
        if (!this.window) return;
        
        setTimeout(() => {
            const dialogRect = this.window.getBoundingClientRect();
            const centerX = Math.max(0, (window.innerWidth - dialogRect.width) / 2);
            const centerY = Math.max(0, (window.innerHeight - dialogRect.height) / 2);
            
            this.window.moveTo(centerX, centerY);
        }, 10);
    }
    
    getSavedPosition() {
        try {
            const saved = localStorage.getItem('nf-preview-dialog-position');
            if (saved) {
                const position = JSON.parse(saved);
                if (position.x >= 0 && position.y >= 0 && 
                    position.x < window.innerWidth && position.y < window.innerHeight) {
                    return position;
                }
            }
        } catch (e) {
        }
        return null;
    }
    
    savePosition(x, y) {
        try {
            localStorage.setItem('nf-preview-dialog-position', JSON.stringify({ x, y }));
        } catch (e) {
        }
    }
    
    getSavedSize() {
        try {
            const saved = localStorage.getItem('nf-preview-dialog-size');
            if (saved) {
                const size = JSON.parse(saved);
                if (size.width > 200 && size.height > 150 && 
                    size.width < window.innerWidth + 100 && size.height < window.innerHeight + 100) {
                    return size;
                }
            }
        } catch (e) {
        }
        return null;
    }
    
    saveSize(width, height) {
        try {
            localStorage.setItem('nf-preview-dialog-size', JSON.stringify({ width, height }));
        } catch (e) {
        }
    }
    
    onWindowMove(x, y) {
        const rememberPosition = app.ui.settings.getSettingValue("NFPreviewSelector.UI.WindowPosition", true);
        if (rememberPosition) {
            this.savePosition(x, y);
        }
    }
    
    onWindowResize(width, height) {
        const rememberPosition = app.ui.settings.getSettingValue("NFPreviewSelector.UI.WindowPosition", true);
        if (rememberPosition) {
            this.saveSize(width, height);
        }
        
        if (this.imageGrid && this.imageGrid.children.length > 0) {
            let landscapeCount = 0;
            let portraitCount = 0;
            
            for (let container of this.imageGrid.children) {
                const img = container.querySelector('img');
                if (img && img.naturalWidth && img.naturalHeight) {
                    const aspectRatio = img.naturalWidth / img.naturalHeight;
                    if (aspectRatio > 1.1) {
                        landscapeCount++;
                    } else if (aspectRatio < 0.9) {
                        portraitCount++;
                    }
                }
            }
            
            this.applyImageLayout(landscapeCount, portraitCount);
        }
        
    }
    
    togglePin() {
        this.isPinned = !this.isPinned;
        this.updatePinButton();
        this.updateWindowTitle();
    }
    
    updatePinButton() {
        if (this.pinButton) {
            this.pinButton.classList.toggle('active', this.isPinned);
            this.pinButton.title = this.isPinned ? 
                'Unpin dialog (will close on new generations)' : 
                'Pin dialog to keep open during new generations';
        }
    }
    
    updateWindowTitle() {
        if (this.window && this.window.titleElement) {
            const baseTitle = 'NF Preview Selector';
            this.window.titleElement.textContent = this.isPinned ? `${baseTitle} (Pinned)` : baseTitle;
        }
    }
    
    updateWithNewData(data) {
        this.stopCountdown();
        
        this.reviewId = data.review_id;
        this.uniqueId = data.unique_id;
        this.images = data.images || [];
        this.timeout = data.timeout || 60;
        this.remainingTime = this.timeout;
        this.selectedIndices.clear();
        
        this.renderImages();
        this.updateSelectionInfo();
        this.updateConfirmButton();
        this.startCountdown();
    }
    
    // v1.2.5: Expanded view functionality
    showExpandedView(imageIndex) {
        if (!this.expandedView) {
            this.expandedView = new ExpandedImageView(this);
        }
        this.expandedView.show(imageIndex, this.images);
    }
    
    hideExpandedView() {
        if (this.expandedView) {
            this.expandedView.hide();
        }
    }
}

// v1.2.5: Expanded Image View Class
class ExpandedImageView {
    constructor(dialog) {
        this.dialog = dialog;
        this.overlay = null;
        this.imageElement = null;
        this.container = null;
        this.currentImageIndex = -1;
        this.images = [];
        
        // Zoom & Pan state
        this.currentZoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.minZoom = 0.25;
        this.maxZoom = 5.0;
        this.zoomStep = 0.1;
        
        // Interaction state
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.isVisible = false;
        
        // UI elements
        this.zoomControls = null;
        this.imageInfo = null;
        this.navigationControls = null;
        
        // Settings - will be dynamically checked from ComfyUI Settings
        this.enableKeyboardShortcuts = true;
    }
    
    show(imageIndex, images) {
        this.currentImageIndex = imageIndex;
        this.images = images;
        this.isVisible = true;
        
        if (!this.overlay) {
            this.createOverlay();
        }
        
        this.resetZoomAndPan();
        this.loadImage(imageIndex);
        this.updateImageInfo();
        this.overlay.classList.add('visible');
        
        // Focus for keyboard events
        this.overlay.focus();
    }
    
    hide() {
        if (this.overlay) {
            this.overlay.classList.remove('visible');
            setTimeout(() => {
                if (this.overlay && this.overlay.parentNode) {
                    this.overlay.parentNode.removeChild(this.overlay);
                    this.overlay = null;
                }
            }, 300); // Wait for fade-out animation
        }
        this.isVisible = false;
    }
    
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'nf-expanded-overlay';
        this.overlay.setAttribute('tabindex', '-1');
        
        // Main container
        this.container = document.createElement('div');
        this.container.className = 'nf-expanded-container';
        
        // Image element
        this.imageElement = document.createElement('img');
        this.imageElement.className = 'nf-expanded-image';
        this.imageElement.draggable = false;
        
        // Controls
        this.createControls();
        
        // Assembly
        this.container.appendChild(this.imageElement);
        this.overlay.appendChild(this.container);
        this.overlay.appendChild(this.zoomControls);
        this.overlay.appendChild(this.imageInfo);
        this.overlay.appendChild(this.navigationControls);
        this.overlay.appendChild(this.helpButton);
        
        // Event listeners
        this.attachEventListeners();
        
        document.body.appendChild(this.overlay);
    }
    
    createControls() {
        // Navigation controls (close, prev, next)
        this.navigationControls = document.createElement('div');
        this.navigationControls.className = 'nf-expanded-nav';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'nf-expanded-close';
        closeBtn.innerHTML = '×';
        closeBtn.title = 'Close (ESC)';
        closeBtn.onclick = () => this.hide();
        
        const prevBtn = document.createElement('button');
        prevBtn.className = 'nf-expanded-prev';
        prevBtn.innerHTML = '◀';
        prevBtn.title = 'Previous image (Alt + ←)';
        prevBtn.onclick = () => this.navigateToImage(this.currentImageIndex - 1);
        
        const nextBtn = document.createElement('button');
        nextBtn.className = 'nf-expanded-next';
        nextBtn.innerHTML = '▶';
        nextBtn.title = 'Next image (Alt + →)';
        nextBtn.onclick = () => this.navigateToImage(this.currentImageIndex + 1);
        
        this.navigationControls.appendChild(closeBtn);
        this.navigationControls.appendChild(prevBtn);
        this.navigationControls.appendChild(nextBtn);
        
        // Zoom controls
        this.zoomControls = document.createElement('div');
        this.zoomControls.className = 'nf-zoom-controls';
        
        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.innerHTML = '−';
        zoomOutBtn.title = 'Zoom out (Page Down)';
        zoomOutBtn.onclick = () => this.zoomOut();
        
        this.zoomLevel = document.createElement('span');
        this.zoomLevel.className = 'nf-zoom-level';
        this.zoomLevel.textContent = '100%';
        
        const zoomInBtn = document.createElement('button');
        zoomInBtn.innerHTML = '+';
        zoomInBtn.title = 'Zoom in (Page Up)';
        zoomInBtn.onclick = () => this.zoomIn();
        
        const resetBtn = document.createElement('button');
        resetBtn.innerHTML = '⌂';
        resetBtn.title = 'Reset zoom (Enter)';
        resetBtn.onclick = () => this.resetZoom();
        
        this.zoomControls.appendChild(zoomOutBtn);
        this.zoomControls.appendChild(this.zoomLevel);
        this.zoomControls.appendChild(zoomInBtn);
        this.zoomControls.appendChild(resetBtn);
        
        // Image info
        this.imageInfo = document.createElement('div');
        this.imageInfo.className = 'nf-image-info';
        
        // Keyboard shortcut help button
        this.helpButton = document.createElement('button');
        this.helpButton.className = 'nf-help-button';
        this.helpButton.innerHTML = '?';
        this.helpButton.title = 'Show keyboard shortcuts help';
        this.helpButton.onclick = () => this.toggleHelp();
    }
    
    attachEventListeners() {
        // Background click to close
        this.overlay.onclick = (e) => {
            if (e.target === this.overlay) {
                this.hide();
            }
        };
        
        // Double-click on image to close expanded view
        this.imageElement.ondblclick = (e) => {
            e.stopPropagation();
            this.hide();
        };
        
        // Mouse wheel zoom
        this.container.onwheel = (e) => this.handleWheelZoom(e);
        
        // Drag to pan
        this.container.onmousedown = (e) => this.handleMouseDown(e);
        this.container.onmousemove = (e) => this.handleMouseMove(e);
        this.container.onmouseup = () => this.handleMouseUp();
        this.container.onmouseleave = () => this.handleMouseUp();
        
        // Keyboard shortcuts (controlled by ComfyUI Settings)
        this.overlay.onkeydown = (e) => this.handleKeyboard(e);
        
        // Prevent context menu and drag on image
        this.imageElement.oncontextmenu = (e) => e.preventDefault();
        this.imageElement.ondragstart = (e) => e.preventDefault();
    }
    
    loadImage(index) {
        if (index >= 0 && index < this.images.length) {
            this.currentImageIndex = index;
            this.imageElement.src = this.dialog.getImageUrl(this.images[index]);
            this.updateImageInfo();
            this.updateNavigationButtons();
        }
    }
    
    updateImageInfo() {
        if (this.imageInfo && this.images.length > 0) {
            const current = this.currentImageIndex + 1;
            const total = this.images.length;
            const zoomPercent = Math.round(this.currentZoom * 100);
            
            this.imageInfo.innerHTML = `
                <span class="nf-image-counter">${current} / ${total}</span>
                <span class="nf-image-zoom">${zoomPercent}%</span>
            `;
        }
    }
    
    updateNavigationButtons() {
        const prevBtn = this.navigationControls.querySelector('.nf-expanded-prev');
        const nextBtn = this.navigationControls.querySelector('.nf-expanded-next');
        
        if (prevBtn) prevBtn.disabled = this.currentImageIndex <= 0;
        if (nextBtn) nextBtn.disabled = this.currentImageIndex >= this.images.length - 1;
    }
    
    navigateToImage(index) {
        if (index >= 0 && index < this.images.length) {
            this.loadImage(index);
        }
    }
    
    // Zoom functionality
    handleWheelZoom(event) {
        event.preventDefault();
        
        // Use container coordinates for consistency with zoomAtPoint
        const rect = this.container.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        const delta = event.deltaY > 0 ? (1 / 1.2) : 1.2;
        const newZoom = this.clampZoom(this.currentZoom * delta);
        
        this.zoomAtPoint(newZoom, mouseX, mouseY);
    }
    
    zoomAtPoint(newZoom, pointX, pointY) {
        const oldZoom = this.currentZoom;
        const zoomDelta = newZoom / oldZoom;
        
        const rect = this.container.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const offsetX = pointX - centerX;
        const offsetY = pointY - centerY;
        
        this.panX = (this.panX - offsetX) * zoomDelta + offsetX;
        this.panY = (this.panY - offsetY) * zoomDelta + offsetY;
        this.currentZoom = newZoom;
        
        this.updateImageTransform();
    }
    
    // Pan functionality
    handleMouseDown(event) {
        if (event.button === 0 && this.currentZoom > 1.0) {
            event.preventDefault(); // Prevent image file drag
            this.isDragging = true;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
            this.container.style.cursor = 'grabbing';
        }
    }
    
    handleMouseMove(event) {
        if (this.isDragging) {
            const deltaX = event.clientX - this.lastMouseX;
            const deltaY = event.clientY - this.lastMouseY;
            
            this.panX += deltaX;
            this.panY += deltaY;
            
            this.constrainPan();
            this.updateImageTransform();
            
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
        }
    }
    
    handleMouseUp() {
        this.isDragging = false;
        this.container.style.cursor = this.currentZoom > 1.0 ? 'grab' : 'default';
    }
    
    // Transform management
    updateImageTransform() {
        const transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.currentZoom})`;
        this.imageElement.style.transform = transform;
        this.updateZoomDisplay();
    }
    
    updateZoomDisplay() {
        if (this.zoomLevel) {
            this.zoomLevel.textContent = `${Math.round(this.currentZoom * 100)}%`;
        }
        this.updateImageInfo();
    }
    
    constrainPan() {
        if (this.currentZoom <= 1.0) {
            this.panX = 0;
            this.panY = 0;
            return;
        }
        
        // Keep image within reasonable bounds
        const maxPan = 200; // px
        this.panX = Math.max(-maxPan, Math.min(maxPan, this.panX));
        this.panY = Math.max(-maxPan, Math.min(maxPan, this.panY));
    }
    
    // Utility methods
    clampZoom(zoom) {
        return Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    }
    
    resetZoomAndPan() {
        this.currentZoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.updateImageTransform();
    }
    
    // Zoom operations
    zoomIn() {
        const newZoom = this.clampZoom(this.currentZoom * 1.25);
        this.setZoom(newZoom);
    }
    
    zoomOut() {
        const newZoom = this.clampZoom(this.currentZoom / 1.25);
        this.setZoom(newZoom);
    }
    
    resetZoom() {
        this.currentZoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.updateImageTransform();
    }
    
    setZoom(newZoom) {
        this.currentZoom = this.clampZoom(newZoom);
        this.updateImageTransform();
    }
    
    
    // Keyboard shortcuts (controlled by ComfyUI Settings)
    handleKeyboard(event) {
        if (!this.isVisible) return;
        
        // Check if keyboard shortcuts are enabled in ComfyUI Settings
        const shortcutsEnabled = app.ui.settings.getSettingValue("NFPreviewSelector.Keybinding.EnableShortcuts", true);
        if (!shortcutsEnabled) return;
        
        // Stop propagation to avoid ComfyUI conflicts
        event.stopPropagation();
        
        const key = event.code;
        const hasAlt = event.altKey;
        
        // Safe shortcuts only
        switch (key) {
            case 'Escape':
                event.preventDefault();
                this.hide();
                break;
            case 'Enter':
                if (!hasAlt) {
                    event.preventDefault();
                    this.resetZoom();
                }
                break;
            case 'PageUp':
                event.preventDefault();
                this.zoomIn();
                break;
            case 'PageDown':
                event.preventDefault();
                this.zoomOut();
                break;
            case 'Home':
            case 'End':
                if (!hasAlt) {
                    event.preventDefault();
                    this.resetZoom();
                }
                break;
            case 'ArrowLeft':
                if (hasAlt) {
                    event.preventDefault();
                    this.navigateToImage(this.currentImageIndex - 1);
                }
                break;
            case 'ArrowRight':
                if (hasAlt) {
                    event.preventDefault();
                    this.navigateToImage(this.currentImageIndex + 1);
                }
                break;
        }
    }
    
    // Help functionality
    toggleHelp() {
        const shortcutsEnabled = app.ui.settings.getSettingValue("NFPreviewSelector.Keybinding.EnableShortcuts", true);
        
        if (!shortcutsEnabled) {
            alert("Keyboard shortcuts are currently disabled in Settings.\n\nTo enable: Settings > NFPreviewSelector > Enable keyboard shortcuts in expanded view");
            return;
        }
        
        const helpText = `Keyboard Shortcuts in Expanded Image View:

Navigation:
• ESC - Close expanded view
• Alt + ← / → - Previous/Next image

Zoom Controls:  
• Page Up - Zoom in
• Page Down - Zoom out
• Enter - Reset zoom to 100%
• Home / End - Reset zoom to 100%

Mouse Controls:
• Mouse wheel - Zoom in/out at cursor position
• Click & drag - Pan when zoomed in
• Double-click on image - Close expanded view

To disable these shortcuts:
Settings > NFPreviewSelector > Enable keyboard shortcuts in expanded view`;
        
        alert(helpText);
    }
}

// Global instance
export const nfPreviewDialog = new NFPreviewDialog();