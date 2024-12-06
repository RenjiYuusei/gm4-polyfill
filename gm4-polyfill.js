/**
 * GM4-Polyfill - Compatibility layer for Greasemonkey 4 API
 * This script provides compatibility between Greasemonkey 4 and legacy APIs,
 * allowing scripts to use modern GM.* APIs while maintaining backwards compatibility.
 * 
 * Usage:
 * // @grant GM.getValue
 * // @grant GM_getValue 
 * // @require https://raw.githubusercontent.com/RenjiYuusei/gm4-polyfill/refs/heads/master/gm4-polyfill.js
 */

(() => {
  'use strict';

  // Initialize GM object if it doesn't exist
  if (!window.GM) {
    window.GM = {};
  }

  // Utility functions
  const utils = {
    /**
     * Safely executes a function and wraps it in a promise
     * @param {Function} fn - Function to execute
     * @param {...*} args - Arguments to pass to the function
     * @returns {Promise}
     */
    promisify(fn, ...args) {
      return new Promise((resolve, reject) => {
        try {
          resolve(fn.apply(this, args)); 
        } catch (error) {
          reject(error);
        }
      });
    },

    /**
     * Waits for document.body to be available
     * @returns {Promise<HTMLElement>}
     */
    waitForBody() {
      return new Promise(resolve => {
        if (document.body) {
          return resolve(document.body);
        }

        if (document.readyState === 'loading' && document.documentElement) {
          const observer = new MutationObserver((_, observer) => {
            if (document.body) {
              observer.disconnect();
              resolve(document.body);
            }
          });
          observer.observe(document.documentElement, { childList: true });
        }
      });
    }
  };

  // Polyfill implementations
  const polyfills = {
    // Polyfill for adding styles
    GM_addStyle(css) {
      const head = document.head;
      if (!head) return null;

      const style = document.createElement('style');
      style.type = 'text/css';
      style.textContent = css;
      head.appendChild(style);
      return style;
    },

    // Polyfill for registering menu commands
    async GM_registerMenuCommand(caption, commandFunc, accessKey) {
      try {
        const body = await utils.waitForBody();
        
        const menuId = 'gm-registered-menu';
        let menu = document.getElementById(menuId);

        if (!menu) {
          menu = document.createElement('menu');
          menu.id = menuId;
          menu.type = 'context';
          body.appendChild(menu);
          body.contextMenu = menuId;
        }

        const menuItem = document.createElement('menuitem');
        menuItem.textContent = caption;
        menuItem.addEventListener('click', commandFunc, { once: true });
        menu.appendChild(menuItem);

        return menuItem;
      } catch (error) {
        console.error('Error registering menu command:', error);
        return null;
      }
    },

    // Polyfill for getting resource content
    async GM_getResourceText(resourceId) {
      try {
        const url = await GM.getResourceUrl(resourceId);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
      } catch (error) {
        console.error('Error getting resource text:', error);
        return null;
      }
    }
  };

  // Direct API mappings
  const directMappings = {
    log: console.log.bind(console),
    info: GM_info
  };

  // Apply direct mappings
  for (const [newKey, old] of Object.entries(directMappings)) {
    if (old && !GM[newKey]) {
      GM[newKey] = old;
    }
  }

  // Map legacy APIs to Promise-based APIs
  const promiseMappings = {
    GM_addStyle: 'addStyle',
    GM_deleteValue: 'deleteValue', 
    GM_getResourceURL: 'getResourceUrl',
    GM_getValue: 'getValue',
    GM_listValues: 'listValues',
    GM_notification: 'notification',
    GM_openInTab: 'openInTab',
    GM_registerMenuCommand: 'registerMenuCommand',
    GM_setClipboard: 'setClipboard',
    GM_setValue: 'setValue',
    GM_xmlhttpRequest: 'xmlHttpRequest',
    GM_getResourceText: 'getResourceText'
  };

  // Apply polyfills first
  for (const [key, implementation] of Object.entries(polyfills)) {
    if (typeof window[key] === 'undefined') {
      window[key] = implementation;
    }
  }

  // Convert legacy functions to Promise-based API
  for (const [oldKey, newKey] of Object.entries(promiseMappings)) {
    const old = window[oldKey];
    if (old && !GM[newKey]) {
      GM[newKey] = (...args) => utils.promisify(old, ...args);
    }
  }
})();
