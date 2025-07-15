"""
NF Preview Selector - A floating dialog image review and selection system for ComfyUI
Based on cg-image-filter architecture but simplified for review purposes
"""

from .nf_preview_selector import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

WEB_DIRECTORY = "./js"

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']

print("NF Preview Selector: Loaded with floating dialog implementation")