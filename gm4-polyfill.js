/**
 * GM4-Polyfill - Enhanced compatibility layer for Greasemonkey 4 API
 * This script provides comprehensive compatibility between Greasemonkey 4 and legacy APIs,
 * allowing scripts to use modern GM.* APIs while maintaining backwards compatibility.
 * It also adds additional utility functions and enhanced error handling.
 * 
 * Usage:
 * // @grant GM.getValue
 * // @grant GM_getValue
 * // @grant GM.xmlHttpRequest 
 * // @grant GM_xmlhttpRequest
 * // @grant GM.addStyle
 * // @grant GM_addStyle
 * // @grant GM.notification
 * // @grant GM_notification
 * // @require https://raw.githubusercontent.com/RenjiYuusei/gm4-polyfill/refs/heads/master/gm4-polyfill.js
 */

(() => {
  'use strict';

  // Initialize GM object with enhanced features
  if (!window.GM) {
    window.GM = {
      info: GM_info || {}, // Ensure GM_info is available
      version: '4.0.0'
    };
  }

  // Enhanced utility functions
  const utils = {
    /**
     * Safely executes a function and wraps it in a promise with timeout
     * @param {Function} fn - Function to execute
     * @param {number} timeout - Timeout in milliseconds
     * @param {...*} args - Arguments to pass to the function
     * @returns {Promise}
     */
    promisify(fn, timeout = 5000, ...args) {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Operation timed out'));
        }, timeout);

        try {
          const result = fn.apply(this, args);
          clearTimeout(timeoutId);
          resolve(result);
        } catch (error) {
          clearTimeout(timeoutId);
          reject(error);
        }
      });
    },

    /**
     * Waits for document.body to be available with timeout
     * @param {number} timeout - Maximum wait time in milliseconds
     * @returns {Promise<HTMLElement>}
     */
    waitForBody(timeout = 10000) {
      return new Promise((resolve, reject) => {
        if (document.body) {
          return resolve(document.body);
        }

        const timeoutId = setTimeout(() => {
          observer.disconnect();
          reject(new Error('Timeout waiting for body'));
        }, timeout);

        const observer = new MutationObserver((_, observer) => {
          if (document.body) {
            clearTimeout(timeoutId);
            observer.disconnect();
            resolve(document.body);
          }
        });

        if (document.readyState === 'loading' && document.documentElement) {
          observer.observe(document.documentElement, { 
            childList: true,
            subtree: true 
          });
        }
      });
    },

    /**
     * Debounce function to limit rate of execution
     * @param {Function} fn - Function to debounce
     * @param {number} delay - Delay in milliseconds
     */
    debounce(fn, delay = 100) {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
      };
    }
  };

  // Enhanced polyfill implementations
  const polyfills = {
    // Enhanced style injection with error handling
    GM_addStyle(css) {
      try {
        const head = document.head || document.getElementsByTagName('head')[0];
        if (!head) throw new Error('Unable to find document head');

        const style = document.createElement('style');
        style.type = 'text/css';
        style.setAttribute('data-source', 'GM_addStyle');
        style.textContent = css;
        head.appendChild(style);
        return style;
      } catch (error) {
        console.error('GM_addStyle error:', error);
        return null;
      }
    },

    // Enhanced menu command registration
    async GM_registerMenuCommand(caption, commandFunc, accessKey) {
      try {
        const body = await utils.waitForBody();
        
        const menuId = 'gm-registered-menu';
        let menu = document.getElementById(menuId);

        if (!menu) {
          menu = document.createElement('menu');
          menu.id = menuId;
          menu.type = 'context';
          menu.setAttribute('data-gm-version', GM.version);
          body.appendChild(menu);
          body.contextMenu = menuId;
        }

        const menuItem = document.createElement('menuitem');
        menuItem.textContent = caption;
        if (accessKey) menuItem.accessKey = accessKey;
        
        // Wrap command function with error handling
        const wrappedCommand = async (...args) => {
          try {
            await commandFunc.apply(this, args);
          } catch (error) {
            console.error('Menu command error:', error);
          }
        };

        menuItem.addEventListener('click', wrappedCommand, { once: true });
        menu.appendChild(menuItem);

        return menuItem;
      } catch (error) {
        console.error('GM_registerMenuCommand error:', error);
        return null;
      }
    },

    // Enhanced resource text fetching with retries
    async GM_getResourceText(resourceId, maxRetries = 3) {
      let attempts = 0;
      while (attempts < maxRetries) {
        try {
          const url = await GM.getResourceUrl(resourceId);
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return await response.text();
        } catch (error) {
          attempts++;
          if (attempts === maxRetries) {
            console.error('GM_getResourceText final error:', error);
            return null;
          }
          // Exponential backoff
          await new Promise(r => setTimeout(r, Math.pow(2, attempts) * 1000));
        }
      }
    }
  };

  // Extended direct API mappings
  const directMappings = {
    log: console.log.bind(console),
    info: GM_info,
    error: console.error.bind(console),
    warn: console.warn.bind(console)
  };

  // Apply enhanced direct mappings
  for (const [newKey, old] of Object.entries(directMappings)) {
    if (old && !GM[newKey]) {
      GM[newKey] = old;
    }
  }

  // Extended Promise-based API mappings
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
    GM_getResourceText: 'getResourceText',
    GM_download: 'download',
    GM_cookie: 'cookie'
  };

  // Apply polyfills with validation
  for (const [key, implementation] of Object.entries(polyfills)) {
    if (typeof window[key] === 'undefined') {
      window[key] = implementation;
    }
  }

  // Convert legacy functions to enhanced Promise-based API
  for (const [oldKey, newKey] of Object.entries(promiseMappings)) {
    const old = window[oldKey];
    if (old && !GM[newKey]) {
      GM[newKey] = (...args) => utils.promisify(old, ...args);
    }
  }
})();
