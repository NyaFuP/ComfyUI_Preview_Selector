/**
 * NF Preview Selector - Floating Window Component
 * Based on cg-image-filter FloatingWindow but simplified
 */


export class NFFloatingWindow extends HTMLDivElement {
    constructor(title, x = 100, y = 100, parent = null, moveCallback = null, resizeCallback = null) {
        super();
        this.moveCallback = moveCallback;
        this.resizeCallback = resizeCallback;
        
        // Setup window structure
        this.classList.add('nf-float');
        
        // Header
        this.header = document.createElement('div');
        this.header.classList.add('nf-float-header');
        this.header.innerText = title;
        this.appendChild(this.header);
        
        // Body
        this.body = document.createElement('div');
        this.body.classList.add('nf-float-body');
        this.appendChild(this.body);
        
        // Setup dragging
        this.dragging = false;
        this.position = { x: x, y: y };
        
        this.header.addEventListener('mousedown', this.startDrag.bind(this));
        document.addEventListener('mouseup', this.stopDrag.bind(this));
        document.addEventListener('mousemove', this.drag.bind(this));
        document.addEventListener('mouseleave', this.stopDrag.bind(this));
        
        // Position window
        this.moveTo(x, y);
        
        // Add to parent or body
        if (parent) {
            parent.appendChild(this);
        } else {
            document.body.appendChild(this);
        }
        
        // Setup resize observer for size changes
        this.setupResizeObserver();
    }
    
    show() {
        this.style.display = 'block';
    }
    
    hide() {
        this.style.display = 'none';
    }
    
    setTitle(title) {
        this.header.innerText = title;
    }
    
    moveTo(x, y) {
        this.position = { x: x, y: y };
        this.style.left = `${this.position.x}px`;
        this.style.top = `${this.position.y}px`;
        
        if (this.moveCallback) {
            this.moveCallback(x, y);
        }
    }
    
    startDrag(e) {
        this.dragging = true;
        e.stopPropagation();
        e.preventDefault();
    }
    
    stopDrag(e) {
        this.dragging = false;
    }
    
    drag(e) {
        if (this.dragging) {
            this.moveTo(
                this.position.x + e.movementX,
                this.position.y + e.movementY
            );
            e.stopPropagation();
            e.preventDefault();
        }
    }
    
    setupResizeObserver() {
        if (this.resizeCallback && window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    const { width, height } = entry.contentRect;
                    this.resizeCallback(width, height);
                }
            });
            this.resizeObserver.observe(this);
        }
    }
    
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        this.remove();
    }
}

// Register custom element
customElements.define('nf-floating-window', NFFloatingWindow, { extends: 'div' });