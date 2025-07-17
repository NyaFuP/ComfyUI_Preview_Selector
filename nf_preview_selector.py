"""
NF Preview Selector - Floating dialog image review system

"""

import torch
import folder_paths
import json
import uuid
from server import PromptServer
from nodes import PreviewImage
from aiohttp import web
import asyncio
from comfy.model_management import InterruptProcessingException

# Global storage for pending reviews
pending_reviews = {}
review_responses = {}

async def handle_review_response(request):
    """Handle review response from frontend"""
    try:
        data = await request.json()
        review_id = data.get('review_id')
        selection = data.get('selection', [])
        cancelled = data.get('cancelled', False)
        
        pass  # Response received
        
        # Store response
        review_responses[review_id] = {
            'selection': selection,
            'cancelled': cancelled
        }
        
        return web.json_response({'status': 'success'})
    except Exception as e:
        pass  # Error handled
        return web.json_response({'status': 'error', 'message': str(e)}, status=500)

# Register API endpoint
PromptServer.instance.app.router.add_post('/nf_preview_response', handle_review_response)

class NFPreviewSelector(PreviewImage):
    """
    A node for reviewing and selecting images using a floating dialog interface
    """
    
    def __init__(self):
        super().__init__()

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "images": ("IMAGE",),
                "mode": (["review_and_select", "pass_through", "take_first", "take_last"], {"default": "review_and_select"}),
                "timeout": ("INT", {"default": 60, "min": 10, "max": 300, "step": 1}),
            },
            "optional": {
                "latents": ("LATENT",),
                "selection_indices": ("STRING", {"default": ""}),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "prompt": "PROMPT", 
                "extra_pnginfo": "EXTRA_PNGINFO"
            },
        }

    RETURN_TYPES = ("IMAGE", "LATENT", "STRING")
    RETURN_NAMES = ("selected_images", "selected_latents", "selection_indices")
    FUNCTION = "preview_images"
    CATEGORY = "image/preview"
    OUTPUT_NODE = True

    def preview_images(self, images, mode, timeout, unique_id=None, latents=None, selection_indices="", prompt=None, extra_pnginfo=None):
        """Main function for image preview and selection"""
        
        pass  # Processing images
        
        # No flags needed anymore
        
        # Save images for UI display using parent class method
        preview_result = self.save_images(images, filename_prefix="NFPreview", prompt=prompt, extra_pnginfo=extra_pnginfo)
        
        # Handle different modes
        if mode == "pass_through":
            selected_indices = list(range(len(images)))
        elif mode == "take_first":
            selected_indices = [0] if len(images) > 0 else []
        elif mode == "take_last":
            selected_indices = [len(images) - 1] if len(images) > 0 else []
        elif mode == "review_and_select":
            # Send to frontend for review
            if unique_id:
                review_id = str(uuid.uuid4())
                pending_reviews[unique_id] = {
                    "images": images,
                    "latents": latents,
                    "review_id": review_id,
                    "timeout": timeout
                }
                
                # Send review request to frontend via WebSocket
                message_data = {
                    "unique_id": unique_id,
                    "review_id": review_id,
                    "images": preview_result["ui"]["images"],
                    "count": len(images),
                    "timeout": timeout
                }
                
                # Use ComfyUI's message dispatch system
                try:
                    PromptServer.instance.send_sync("nf_preview_request", message_data)
                    pass  # Request sent
                except Exception as e:
                    pass  # Fallback to direct WebSocket
                    # Fallback to direct WebSocket
                    message = {
                        "type": "nf_preview_request", 
                        "data": message_data
                    }
                    
                    async def send_message():
                        for ws in PromptServer.instance.sockets.values():
                            try:
                                await ws.send_str(json.dumps(message))
                            except Exception as e:
                                pass  # Send failed
                    
                    if PromptServer.instance.loop:
                        asyncio.run_coroutine_threadsafe(send_message(), PromptServer.instance.loop)
                
                pass  # Request sent
                
                # Wait for response from frontend
                result = self.wait_for_response(review_id, timeout)
                if result == "CANCELLED":
                    pass  # Cancelled
                    raise InterruptProcessingException()
                elif result == "TIMEOUT":
                    pass  # Timed out 
                    raise InterruptProcessingException()
                else:
                    selected_indices = result
            else:
                selected_indices = [0] if len(images) > 0 else []
        else:
            selected_indices = [0] if len(images) > 0 else []

        # Process selection
        if not selected_indices:
            # For timeout or other cases, return empty tensors
            pass  # No selection
            empty_image = torch.zeros((1, images.shape[1], images.shape[2], images.shape[3]))
            empty_latent = {"samples": torch.zeros((1, 4, 64, 64))} if latents is None else {"samples": torch.zeros((1, latents["samples"].shape[1], latents["samples"].shape[2], latents["samples"].shape[3]))}
            return (empty_image, empty_latent, "")

        # Get selected images
        selected_images = torch.stack([images[i] for i in selected_indices])
        
        # Handle latents
        selected_latents = None
        if latents is not None:
            selected_latents = {"samples": torch.stack([latents["samples"][i] for i in selected_indices])}
        else:
            # Create placeholder latents
            selected_latents = {"samples": torch.zeros((len(selected_indices), 4, 64, 64))}

        indices_str = ",".join(str(i) for i in selected_indices)
        
        pass  # Selection made
        
        return {
            "result": (selected_images, selected_latents, indices_str),
            "ui": preview_result.get("ui", {})
        }
    
    def wait_for_response(self, review_id, timeout):
        """Wait for user response from frontend"""
        import time
        
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            if review_id in review_responses:
                response = review_responses.pop(review_id)
                
                if response['cancelled']:
                    pass  # Review cancelled
                    return "CANCELLED"
                else:
                    selection = response['selection']
                    pass  # Review completed
                    return selection
            
            time.sleep(0.1)  # Poll every 100ms
        
        pass  # Review timed out
        return "TIMEOUT"  # Indicate timeout occurred

# Node registration
NODE_CLASS_MAPPINGS = {
    "NFPreviewSelector": NFPreviewSelector,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "NFPreviewSelector": "NF Preview Selector",
}