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
        
        // Load CSS
        this.loadCSS();
        
        // Apply max width setting
        this.applyMaxWidthSetting();
    }
    
    loadCSS() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = new URL("./floating_window.css", import.meta.url).href;
        document.head.appendChild(link);
    }
    
    applyMaxWidthSetting() {
        // Get max width setting from ComfyUI settings (try new ID first, fallback to old)
        let maxWidth = app.ui.settings.getSettingValue("NFPreviewSelector.UI.MaxWidth.v2", 
            app.ui.settings.getSettingValue("NFPreviewSelector.UI.MaxWidth", 800));
        
        // Validate and clamp the value between 400 and 1800
        maxWidth = Math.max(400, Math.min(1800, maxWidth));
        
        // Create or update CSS rule for max width
        const style = document.createElement('style');
        style.id = 'nf-preview-max-width-style';
        style.textContent = `
            .nf-float {
                max-width: ${maxWidth}px !important;
            }
        `;
        
        // Remove existing style if it exists
        const existingStyle = document.getElementById('nf-preview-max-width-style');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        document.head.appendChild(style);
    }
    
    show(data) {
        console.log("NF Preview Dialog: Showing review dialog", data);
        
        // Apply latest max width setting
        this.applyMaxWidthSetting();
        
        // If dialog is already open for this review, don't create another
        if (this.reviewId === data.review_id && this.window) {
            console.log("NF Preview Dialog: Dialog already open for this review");
            return;
        }
        
        // Stop any existing countdown
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
        
        // Get saved position or calculate center position
        const rememberPosition = app.ui.settings.getSettingValue("NFPreviewSelector.UI.WindowPosition", true);
        const savedPosition = rememberPosition ? this.getSavedPosition() : null;
        let x, y;
        
        if (savedPosition) {
            // Use saved position from previous session
            x = savedPosition.x;
            y = savedPosition.y;
        } else {
            // First time or position memory disabled: calculate center position
            x = Math.max(0, (window.innerWidth - 600) / 2);  // 600px is approximate dialog width
            y = Math.max(0, (window.innerHeight - 400) / 2); // 400px is approximate dialog height
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
        
        // Apply saved size if available and position memory is enabled
        if (rememberPosition) {
            const savedSize = this.getSavedSize();
            if (savedSize) {
                this.window.style.width = savedSize.width + 'px';
                this.window.style.height = savedSize.height + 'px';
            }
        }
        
        // Center the dialog only if no saved position (first time)
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
        
        // Selection info
        this.selectionInfo = document.createElement('div');
        this.selectionInfo.className = 'nf-selection-info';
        this.updateSelectionInfo();
        
        // Countdown
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
        
        this.buttons.appendChild(this.confirmButton);
        this.buttons.appendChild(this.cancelButton);
        
        this.controls.appendChild(this.selectionInfo);
        this.controls.appendChild(this.countdown);
        this.controls.appendChild(this.buttons);
        
        this.window.body.appendChild(this.controls);
    }
    
    renderImages() {
        this.imageGrid.innerHTML = '';
        
        this.images.forEach((imageInfo, index) => {
            const container = document.createElement('div');
            container.className = 'nf-image-container';
            container.dataset.index = index;
            container.onclick = () => this.toggleImage(index);
            
            const img = document.createElement('img');
            img.className = 'nf-image';
            img.src = this.getImageUrl(imageInfo);
            img.alt = `Image ${index + 1}`;
            
            const overlay = document.createElement('div');
            overlay.className = 'nf-image-overlay';
            overlay.textContent = index + 1;
            
            container.appendChild(img);
            container.appendChild(overlay);
            this.imageGrid.appendChild(container);
        });
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
        
        console.log("NF Preview Dialog: Selected indices:", Array.from(this.selectedIndices));
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
                console.log("NF Preview Dialog: Timeout reached");
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
        console.log("NF Preview Dialog: Confirming selection:", selection);
        
        this.sendSelection(selection, false);
        this.hide();
    }
    
    cancelSelection() {
        this.stopCountdown();
        
        console.log("NF Preview Dialog: Cancelling selection");
        this.sendSelection([], true);
        this.hide();
    }
    
    timeoutSelection() {
        this.stopCountdown();
        
        // On timeout, select all images or none based on setting
        const selection = []; // Default to empty selection on timeout
        console.log("NF Preview Dialog: Timeout - returning empty selection");
        
        this.sendSelection(selection, false);
        this.hide();
    }
    
    sendSelection(indices, cancelled) {
        const response = {
            review_id: this.reviewId,
            unique_id: this.uniqueId,
            selection: indices,
            cancelled: cancelled
        };
        
        // Send response to backend
        fetch('/nf_preview_response', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(response)
        }).catch(error => {
            console.error("NF Preview Dialog: Error sending response:", error);
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
        
        // Wait for the DOM to update and get actual dimensions
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
                // Validate position is within screen bounds
                if (position.x >= 0 && position.y >= 0 && 
                    position.x < window.innerWidth && position.y < window.innerHeight) {
                    return position;
                }
            }
        } catch (e) {
            console.warn("NF Preview Dialog: Error loading saved position:", e);
        }
        return null;
    }
    
    savePosition(x, y) {
        try {
            localStorage.setItem('nf-preview-dialog-position', JSON.stringify({ x, y }));
        } catch (e) {
            console.warn("NF Preview Dialog: Error saving position:", e);
        }
    }
    
    getSavedSize() {
        try {
            const saved = localStorage.getItem('nf-preview-dialog-size');
            if (saved) {
                const size = JSON.parse(saved);
                // Validate size is reasonable
                if (size.width > 200 && size.height > 150 && 
                    size.width < window.innerWidth + 100 && size.height < window.innerHeight + 100) {
                    return size;
                }
            }
        } catch (e) {
            console.warn("NF Preview Dialog: Error loading saved size:", e);
        }
        return null;
    }
    
    saveSize(width, height) {
        try {
            localStorage.setItem('nf-preview-dialog-size', JSON.stringify({ width, height }));
        } catch (e) {
            console.warn("NF Preview Dialog: Error saving size:", e);
        }
    }
    
    onWindowMove(x, y) {
        // Save position when user moves the dialog (only if setting is enabled)
        const rememberPosition = app.ui.settings.getSettingValue("NFPreviewSelector.UI.WindowPosition", true);
        if (rememberPosition) {
            this.savePosition(x, y);
        }
        console.log("NF Preview Dialog: Window moved to", x, y);
    }
    
    onWindowResize(width, height) {
        // Save size when user resizes the dialog (only if setting is enabled)
        const rememberPosition = app.ui.settings.getSettingValue("NFPreviewSelector.UI.WindowPosition", true);
        if (rememberPosition) {
            this.saveSize(width, height);
        }
        console.log("NF Preview Dialog: Window resized to", width, height);
    }
}

// Global instance
export const nfPreviewDialog = new NFPreviewDialog();