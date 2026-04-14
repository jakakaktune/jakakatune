import { configRead } from '../config.js';

function initPopupBlocker() {
  if (!configRead('enablePopupBlocker')) {
    console.info('Popup blocker disabled, not loading.');
    return;
  }

  // 1. Overwrite window.open
  const originalWindowOpen = window.open;
  window.open = function(url, target, features) {
    console.warn(`Blocked window.open call to: ${url}`);
    return null;
  };

  // 2. Overwrite HTMLAnchorElement.prototype.click
  // This blocks the "Hidden Link" hack
  const originalAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function() {
    if (this.target === '_blank' || (this.href && this.href.includes('http'))) {
      console.warn(`Blocked hidden link click to: ${this.href}`);
      return;
    }
    return originalAnchorClick.apply(this, arguments);
  };

  // 3. Overwrite HTMLFormElement.prototype.submit
  // This blocks the "Hidden Form" hack
  const originalFormSubmit = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function() {
    if (this.target === '_blank') {
      console.warn(`Blocked hidden form submission to: ${this.action}`);
      return;
    }
    return originalFormSubmit.apply(this, arguments);
  };

  // 4. Intercept PostMessage
  // This stops the "handshake" before the parent can even act on it
  const adKeywords = ['popup', 'ad', 'trigger', 'click'];
  window.addEventListener('message', function(event) {
    const messageString = JSON.stringify(event.data).toLowerCase();

    if (adKeywords.some(keyword => messageString.includes(keyword))) {
      console.warn('Intercepted suspicious postMessage:', event.data);
      event.stopImmediatePropagation();
    }
  }, true);

  console.log("Popup blocking script initialized.");
}

initPopupBlocker();
