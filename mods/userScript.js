import './features/popupBlocker.js';
import { initVirtualMouse } from './utils/virtualMouse.js';

// Initialize virtual mouse for TV remote/mouse control
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVirtualMouse);
} else {
  initVirtualMouse();
}
