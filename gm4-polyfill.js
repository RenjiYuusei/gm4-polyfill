/**
 * GM4-Polyfill - A compatibility layer for Greasemonkey 4 APIs
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

  // Initialize GM object if not exists
  if (typeof GM === 'undefined') {
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
        } catch (e) {
          reject(e);
        }
      });
    },

    /**
     * Waits for document.body to be available
     * @returns {Promise}
     */
    waitForBody() {
      return new Promise((resolve) => {
        if (document.body) {
          resolve(document.body);
          return;
        }

        if (document.readyState === 'loading' && document.documentElement) {
          new MutationObserver((mutations, observer) => {
            if (document.body) {
              observer.disconnect();
              resolve(document.body);
            }
          }).observe(document.documentElement, { childList: true });
        }
      });
    }
  };

  // Polyfill implementations
  const polyfills = {
    // Style injection polyfill
    GM_addStyle(css) {
      const head = document.getElementsByTagName('head')[0];
      if (!head) return null;

      const style = document.createElement('style');
      style.setAttribute('type', 'text/css');
      style.textContent = css;
      head.appendChild(style);
      return style;
    },

    // Menu command registration polyfill
    async GM_registerMenuCommand(caption, commandFunc, accessKey) {
      try {
        const body = await utils.waitForBody();
        
        let contextMenu = body.getAttribute('contextmenu');
        let menu = contextMenu ? document.querySelector(`menu#${contextMenu}`) : null;

        if (!menu) {
          menu = document.createElement('menu');
          menu.setAttribute('id', 'gm-registered-menu');
          menu.setAttribute('type', 'context');
          body.appendChild(menu);
          body.setAttribute('contextmenu', 'gm-registered-menu');
        }

        const menuItem = document.createElement('menuitem');
        menuItem.textContent = caption;
        menuItem.addEventListener('click', commandFunc, true);
        menu.appendChild(menuItem);
      } catch (error) {
        console.error('Failed to register menu command:', error);
      }
    },

    // Resource text retrieval polyfill
    async GM_getResourceText(resourceId) {
      try {
        const url = await GM.getResourceUrl(resourceId);
        const response = await fetch(url);
        return await response.text();
      } catch (error) {
        console.error('Failed to get resource text:', error);
        return null;
      }
    }
  };

  // Direct property mappings
  const directMappings = {
    'log': console.log.bind(console),
    'info': GM_info
  };

  // Apply direct mappings
  Object.entries(directMappings).forEach(([newKey, old]) => {
    if (old && typeof GM[newKey] === 'undefined') {
      GM[newKey] = old;
    }
  });

  // Legacy to Promise-based API mappings
  const promiseMappings = {
    'GM_addStyle': 'addStyle',
    'GM_deleteValue': 'deleteValue',
    'GM_getResourceURL': 'getResourceUrl',
    'GM_getValue': 'getValue',
    'GM_listValues': 'listValues',
    'GM_notification': 'notification',
    'GM_openInTab': 'openInTab',
    'GM_registerMenuCommand': 'registerMenuCommand',
    'GM_setClipboard': 'setClipboard',
    'GM_setValue': 'setValue',
    'GM_xmlhttpRequest': 'xmlHttpRequest',
    'GM_getResourceText': 'getResourceText'
  };

  // Apply polyfills first
  Object.entries(polyfills).forEach(([key, implementation]) => {
    if (typeof window[key] === 'undefined') {
      window[key] = implementation;
    }
  });

  // Convert legacy functions to promise-based API
  Object.entries(promiseMappings).forEach(([oldKey, newKey]) => {
    const old = window[oldKey];
    if (old && typeof GM[newKey] === 'undefined') {
      GM[newKey] = (...args) => utils.promisify(old, ...args);
    }
  });
})();
