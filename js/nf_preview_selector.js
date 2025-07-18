/**
 * NF Preview Selector - Main Extension
 * A floating dialog-based image review and selection system for ComfyUI
 */


import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { nfPreviewDialog } from './preview_dialog.js';


app.registerExtension({
    name: "nf.preview_selector",
    
    async setup() {
        
        if (api.addEventListener) {
            api.addEventListener("nf_preview_request", (event) => {
                nfPreviewDialog.show(event.detail);
            });
            
        }
        
        
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
        
        
    },
    
    async nodeCreated(node) {
        if (node.comfyClass === "NFPreviewSelector") {
            
            node.title = "NF Preview Selector";
            
            node.onResize = function() {
            };
        }
    },
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "NFPreviewSelector") {
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                if (onNodeCreated) {
                    onNodeCreated.apply(this, arguments);
                }
                
                this.setProperty("review_position", { x: 100, y: 100 });
            };
        }
    }
});

