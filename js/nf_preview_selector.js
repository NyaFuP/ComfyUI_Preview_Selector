/**
 * NF Preview Selector - Main Extension
 * A floating dialog-based image review and selection system for ComfyUI
 */


import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { nfPreviewDialog } from './preview_dialog.js';

// NF Preview Selector loading

app.registerExtension({
    name: "nf.preview_selector",
    
    async setup() {
        // Setting up extension
        
        // Register message handler using ComfyUI's system
        if (api.addEventListener) {
            // Register for our custom event type
            api.addEventListener("nf_preview_request", (event) => {
                // Received review request
                nfPreviewDialog.show(event.detail);
            });
            
            // Event listener registered
        }
        
        // Event system is working correctly
        
        // Add settings
        app.ui.settings.addSetting({
            id: "NFPreviewSelector.UI.WindowPosition",
            name: "Remember window position and size",
            type: "boolean",
            defaultValue: true,
            tooltip: "Remember the position and size of the preview dialog window between sessions"
        });
        
        app.ui.settings.addSetting({
            id: "NFPreviewSelector.UI.MaxWidth.v2",
            name: "Dialog maximum width (px)",
            type: "number",
            defaultValue: 800,
            tooltip: "Maximum width of the preview dialog in pixels (400-1800)"
        });
        
        // Auto-select first image setting removed - this is available in node UI
        
        // Setup complete
    },
    
    async nodeCreated(node) {
        if (node.comfyClass === "NFPreviewSelector") {
            // Node created
            
            // Set node title
            node.title = "NF Preview Selector";
            
            // Add any node-specific setup here
            node.onResize = function() {
                // Handle node resize if needed
            };
        }
    },
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "NFPreviewSelector") {
            // Registering node definition
            
            // Add any node definition modifications here
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                if (onNodeCreated) {
                    onNodeCreated.apply(this, arguments);
                }
                
                // Node-specific initialization
                this.setProperty("review_position", { x: 100, y: 100 });
            };
        }
    }
});

// Extension loaded successfully