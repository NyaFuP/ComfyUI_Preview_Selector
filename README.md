# NF Review Selector

A floating dialog-based image review and selection system for ComfyUI. Inspired by cg-image-filter but designed as a simpler, more focused solution for image review workflows.

## Features

- **Floating Dialog Interface**: Non-intrusive dialog window instead of full-screen overlay
- **Drag & Drop Positioning**: Move the review window anywhere on screen
- **Multi-Selection**: Click images to select/deselect multiple images
- **Timeout Support**: Configurable timeout with visual countdown
- **Multiple Modes**: Review mode, pass-through, take first/last
- **Latent Support**: Optional latent passthrough for efficiency
- **Memory**: Window position and settings are remembered

## Usage

1. Add the "NF Review Selector" node to your workflow
2. Connect image input (and optionally latent input)
3. Choose a mode:
   - **review_and_select**: Opens floating dialog for manual selection
   - **pass_through**: Passes all images without review
   - **take_first**: Automatically selects first image
   - **take_last**: Automatically selects last image
4. Set timeout value (10-300 seconds)

## Dialog Interface

When in review mode, a floating dialog will appear showing:
- Grid of images to review
- Click images to select/deselect (green border indicates selection)
- Selection counter
- Countdown timer
- Confirm/Cancel buttons

## Settings

Access via ComfyUI Settings menu:
- **Remember window position**: Saves dialog position between uses
- **Use compact mode**: Smaller layout for limited screen space
- **Auto-select first image**: Automatically selects first image when dialog opens

## Outputs

- **selected_images**: IMAGE batch of selected images
- **selected_latents**: LATENT batch of corresponding latents (if input provided)
- **selection_indices**: STRING of selected indices (e.g., "0,2,4")

## Installation

1. Place this folder in `ComfyUI/custom_nodes/`
2. Restart ComfyUI
3. The "NF Review Selector" node will appear in the "image/review" category

## Technical Details

- Built with modern JavaScript ES6 modules
- CSS-styled floating window system
- WebSocket communication with ComfyUI backend
- Supports both image and latent workflows
- Minimal dependencies (uses ComfyUI's built-in APIs)

## Comparison to Alternatives

Unlike full-screen solutions, NF Review Selector:
- Doesn't take over the entire interface
- Allows interaction with other parts of ComfyUI while reviewing
- Provides a cleaner, more focused review experience
- Maintains workflow visibility

## License

This implementation is provided as-is for educational and development purposes.