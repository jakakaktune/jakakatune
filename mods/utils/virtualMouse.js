/**
 * Virtual Mouse Control System
 * Provides a visible cursor and mouse-like interaction for TV remote/keyboard
 */

export class VirtualMouse {
  constructor() {
    this.enabled = false;
    this.cursorX = window.innerWidth / 2;
    this.cursorY = window.innerHeight / 2;
    this.cursorSize = 20;
    this.speed = 15;
    this.cursorElement = null;
    this.scrollSpeed = 50;
    
    // Key codes
    this.KEYS = {
      UP: 38,
      DOWN: 40,
      LEFT: 37,
      RIGHT: 39,
      ENTER: 13,
      BACK: 27,
      // Tizen specific
      RETURN: 10009,
      EXIT: 10182
    };
  }

  init() {
    if (this.enabled) return;
    this.enabled = true;

    this.createCursor();
    this.setupEventListeners();
    this.updateCursorPosition();
    
    console.log('[VirtualMouse] Initialized');
  }

  createCursor() {
    this.cursorElement = document.createElement('div');
    this.cursorElement.id = 'virtual-mouse-cursor';
    this.cursorElement.style.cssText = `
      position: fixed;
      width: ${this.cursorSize}px;
      height: ${this.cursorSize}px;
      background: rgba(255, 255, 255, 0.8);
      border: 2px solid rgba(0, 0, 0, 0.5);
      border-radius: 50%;
      pointer-events: none;
      z-index: 999999;
      transition: none;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
    `;
    document.body.appendChild(this.cursorElement);
  }

  setupEventListeners() {
    // Keyboard controls
    this.keyHandler = (e) => this.handleKeyDown(e);
    document.addEventListener('keydown', this.keyHandler, true);

    // Real mouse movement (if mouse is available)
    this.mouseMoveHandler = (e) => this.handleMouseMove(e);
    document.addEventListener('mousemove', this.mouseMoveHandler, true);

    // Real mouse click
    this.mouseClickHandler = (e) => this.handleMouseClick(e);
    document.addEventListener('click', this.mouseClickHandler, true);

    // Real mouse wheel for scrolling
    this.wheelHandler = (e) => this.handleWheel(e);
    document.addEventListener('wheel', this.wheelHandler, { passive: false });

    // Prevent default back behavior
    this.popStateHandler = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', this.popStateHandler);
    window.history.pushState(null, '', window.location.href);
  }

  handleKeyDown(e) {
    const key = e.keyCode || e.which;

    // Check if we should handle this key
    if (![this.KEYS.UP, this.KEYS.DOWN, this.KEYS.LEFT, this.KEYS.RIGHT, 
          this.KEYS.ENTER, this.KEYS.BACK, this.KEYS.RETURN, this.KEYS.EXIT].includes(key)) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    switch (key) {
      case this.KEYS.UP:
        this.cursorY -= this.speed;
        this.updateCursorPosition();
        break;

      case this.KEYS.DOWN:
        this.cursorY += this.speed;
        this.updateCursorPosition();
        break;

      case this.KEYS.LEFT:
        this.cursorX -= this.speed;
        this.updateCursorPosition();
        break;

      case this.KEYS.RIGHT:
        this.cursorX += this.speed;
        this.updateCursorPosition();
        break;

      case this.KEYS.ENTER:
        this.clickAtCursor();
        break;

      case this.KEYS.BACK:
      case this.KEYS.RETURN:
      case this.KEYS.EXIT:
        this.handleBack();
        break;
    }
  }

  handleMouseMove(e) {
    this.cursorX = e.clientX;
    this.cursorY = e.clientY;
    this.updateCursorPosition();
  }

  handleMouseClick(e) {
    // Let real mouse clicks through normally
    // This handler is just for tracking if needed
  }

  handleWheel(e) {
    // Let native scrolling work
    // No need to prevent default
  }

  updateCursorPosition() {
    if (!this.cursorElement) return;

    // Clamp to screen bounds
    this.cursorX = Math.max(0, Math.min(window.innerWidth - this.cursorSize, this.cursorX));
    this.cursorY = Math.max(0, Math.min(window.innerHeight - this.cursorSize, this.cursorY));

    this.cursorElement.style.left = this.cursorX + 'px';
    this.cursorElement.style.top = this.cursorY + 'px';
  }

  clickAtCursor() {
    // Find element at cursor position
    const element = document.elementFromPoint(
      this.cursorX + this.cursorSize / 2,
      this.cursorY + this.cursorSize / 2
    );

    if (element) {
      // Visual feedback
      this.cursorElement.style.transform = 'scale(0.8)';
      setTimeout(() => {
        this.cursorElement.style.transform = 'scale(1)';
      }, 100);

      // Dispatch click event
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: this.cursorX + this.cursorSize / 2,
        clientY: this.cursorY + this.cursorSize / 2
      });
      
      element.dispatchEvent(clickEvent);

      // Also trigger focus if it's an interactive element
      if (element.tagName === 'A' || element.tagName === 'BUTTON' || 
          element.tagName === 'INPUT' || element.tagName === 'SELECT' ||
          element.tagName === 'TEXTAREA') {
        element.focus();
      }
    }
  }

  handleBack() {
    // Try to go back in history
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // If no history, maybe close app or do nothing
      // For Tizen, you could call tizen.application.getCurrentApplication().exit()
      if (typeof tizen !== 'undefined' && tizen.application) {
        // Optional: exit the app
        // tizen.application.getCurrentApplication().exit();
      }
    }
  }

  destroy() {
    if (!this.enabled) return;
    this.enabled = false;

    // Remove cursor element
    if (this.cursorElement && this.cursorElement.parentNode) {
      this.cursorElement.parentNode.removeChild(this.cursorElement);
    }

    // Remove event listeners
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler, true);
    }
    if (this.mouseMoveHandler) {
      document.removeEventListener('mousemove', this.mouseMoveHandler, true);
    }
    if (this.mouseClickHandler) {
      document.removeEventListener('click', this.mouseClickHandler, true);
    }
    if (this.wheelHandler) {
      document.removeEventListener('wheel', this.wheelHandler);
    }
    if (this.popStateHandler) {
      window.removeEventListener('popstate', this.popStateHandler);
    }

    console.log('[VirtualMouse] Destroyed');
  }
}

// Auto-initialize when DOM is ready
let virtualMouseInstance = null;

export function initVirtualMouse() {
  if (!virtualMouseInstance) {
    virtualMouseInstance = new VirtualMouse();
    virtualMouseInstance.init();
  }
  return virtualMouseInstance;
}

// Export for use in other modules
export { virtualMouseInstance as virtualMouse };
