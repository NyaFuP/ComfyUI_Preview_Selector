/**
 * NF Preview Selector - Main Extension
 * A floating dialog-based image review and selection system for ComfyUI
 */

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { nfPreviewDialog } from './preview_dialog.js';

console.log("NF Preview Selector: Loading extension...");

app.registerExtension({
    name: "nf.preview_selector",
    
    async setup() {
        console.log("NF Preview Selector: Setting up extension");
        console.log("NF Preview Selector: API object:", api);
        console.log("NF Preview Selector: API addEventListener available:", typeof api.addEventListener);
        
        // Register message handler using ComfyUI's system
        if (api.addEventListener) {
            // Register for our custom event type
            api.addEventListener("nf_preview_request", (event) => {
                console.log("NF Preview Selector: Received review request via event", event.detail);
                nfPreviewDialog.show(event.detail);
            });
            
            console.log("NF Preview Selector: Event listener registered for nf_preview_request");
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
        
        console.log("NF Preview Selector: Setup complete");
    },
    
    async nodeCreated(node) {
        if (node.comfyClass === "NFPreviewSelector") {
            console.log("NF Preview Selector: Node created", node.id);
            
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
            console.log("NF Preview Selector: Registering node definition");
            
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

console.log("NF Preview Selector: Extension loaded successfully");