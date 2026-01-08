// Custom Titlebar Web Component
class CustomTitlebar extends HTMLElement {
  // Static flag to ensure we only set up window listeners once
  static _focusListenersInitialized = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Define all available samples
    this.samples = [
      { name: 'Model Context Protocol', value: 'Model Context Protocol' },
      { name: 'Windows SDK', value: 'Windows SDK' },
      { name: 'Setup Developer Environment', value: 'Setup Developer Environment' },
      { name: 'Create Native Addons', value: 'Create Native Addons' },
      { name: 'Debugging', value: 'Debugging' },
      { name: 'Packaging Your App', value: 'Packaging Your App' },
      { name: 'Phi Silica Text Generation', value: 'Phi Silica Text Generation' },
      { name: 'Phi Silica Text Summarization', value: 'Phi Silica Text Summarization' },
      { name: 'Phi Silica Rewrite Text', value: 'Phi Silica Rewrite Text' },
      { name: 'Phi Silica Convert Text to Table', value: 'Phi Silica Convert Text to Table' },
      { name: 'Optical Character Recognition (OCR)', value: 'Optical Character Recognition (OCR)' },
      { name: 'Image Description', value: 'Image Description' }
    ];
    
    this._render();
  }

  connectedCallback() {
    // Set up dark mode support for fluent-search
    this._updateSearchTheme();
    
    // Listen for theme changes
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeQuery.addEventListener('change', () => {
      this._updateSearchTheme();
    });

    // Wait for fluent-search to be defined
    customElements.whenDefined('fluent-search').then(() => {
      const search = this.shadowRoot.querySelector('#sample-search');
      const resultsList = this.shadowRoot.querySelector('#search-results');
      
      if (search) {
        // Handle input changes for search
        search.addEventListener('input', (e) => {
          const query = e.target.value.toLowerCase().trim();
          
          if (query.length === 0) {
            resultsList.style.display = 'none';
            resultsList.innerHTML = '';
            return;
          }
          
          // Filter samples based on query
          const filteredSamples = this.samples.filter(sample => 
            sample.name.toLowerCase().includes(query)
          );
          
          if (filteredSamples.length > 0) {
            resultsList.innerHTML = filteredSamples.map(sample => `
              <div class="search-result-item" data-value="${sample.value}">
                ${sample.name}
              </div>
            `).join('');
            resultsList.style.display = 'block';
            
            // Add click handlers to results
            resultsList.querySelectorAll('.search-result-item').forEach(item => {
              item.addEventListener('click', () => {
                const value = item.getAttribute('data-value');
                if (value && window.openSample) {
                  window.openSample(value);
                  search.value = '';
                  resultsList.style.display = 'none';
                }
              });
            });
          } else {
            resultsList.innerHTML = '<div class="search-no-results">No samples found</div>';
            resultsList.style.display = 'block';
          }
        });
        
        // Show results when search box is focused (if there's content)
        search.addEventListener('focus', () => {
          if (search.value.trim().length > 0 && resultsList.innerHTML) {
            resultsList.style.display = 'block';
          }
        });
        
        // Hide results when search box loses focus
        search.addEventListener('blur', () => {
          // Use setTimeout to allow click events on results to fire first
          setTimeout(() => {
            resultsList.style.display = 'none';
          }, 200);
        });
        
        // Clear results when search is cleared
        search.addEventListener('change', (e) => {
          if (!e.target.value) {
            resultsList.style.display = 'none';
            resultsList.innerHTML = '';
          }
        });
      }
    });

    // Add home button click handler
    const homeButton = this.shadowRoot.getElementById('home-button');
    if (homeButton) {
      homeButton.addEventListener('click', () => {
        if (window.showHome) {
          window.showHome();
        }
      });
    }

    // Add back button click handler
    const backButton = this.shadowRoot.getElementById('back-button');
    if (backButton) {
      backButton.addEventListener('click', () => {
        if (window.goBack) {
          window.goBack();
        }
      });
    }

    // Setup focus/blur handlers for visual feedback - only once globally
    if (!CustomTitlebar._focusListenersInitialized) {
      CustomTitlebar._focusListenersInitialized = true;
      
      // Store reference to titlebar container
      const titlebarContainer = this.shadowRoot.querySelector('.titlebar-container');
      
      // Listen to IPC events from main process for reliable focus detection
      if (window.electronUtils && window.electronUtils.onWindowFocusChanged) {
        window.electronUtils.onWindowFocusChanged((isFocused) => {
          if (titlebarContainer) {
            if (isFocused) {
              titlebarContainer.classList.remove('unfocused');
            } else {
              titlebarContainer.classList.add('unfocused');
            }
          }
        });
      }
    }
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: var(--titlebar-height);
          background-color: transparent;
          -webkit-app-region: drag;
          z-index: 9999;
        }

        .titlebar-container {
          display: flex;
          align-items: center;
          height: 100%;
          padding-left: 16px;
          padding-right: 150px; /* Space for window controls */
          color: var(--color-neutral-foreground-1);
          font-size: 14px;
          gap: 10px;
          opacity: 1;
        }

        .titlebar-container.unfocused {
          opacity: 0.6;
        }

        .back-button {
          width: 32px;
          height: 32px;
          border: none;
          background-color: transparent;
          color: var(--color-neutral-foreground-1);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--border-radius-medium);
          -webkit-app-region: no-drag;
          transition: background-color 0.1s;
          font-size: 14px;
          font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets';
        }

        .back-button:hover {
          background-color: var(--color-subtle-background-hover);
        }

        .back-button:active {
          background-color: var(--color-subtle-background-pressed);
        }

        .back-button.hidden {
          display: none;
        }

        .titlebar-logo {
          height: 20px;
          width: 20px;
        }

        .titlebar-title {
          white-space: nowrap;
        }

        .titlebar-search {
          flex: 1;
          max-width: 400px;
          margin: 0 auto;
          -webkit-app-region: no-drag;
          position: relative;
        }

        .titlebar-search fluent-search {
          width: 100%;
        }

        #search-results {
          display: none;
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          background-color: var(--color-neutral-background-1);
          border: 1px solid var(--color-neutral-stroke-1);
          border-radius: var(--border-radius-medium);
          box-shadow: var(--shadow-8);
          max-height: 300px;
          overflow-y: auto;
          z-index: 10000;
        }

        .search-result-item {
          padding: 8px 12px;
          cursor: pointer;
          color: var(--color-neutral-foreground-1);
          font-size: 14px;
          transition: background-color 0.1s;
        }

        .search-result-item:hover {
          background-color: var(--color-subtle-background-hover);
        }

        .search-no-results {
          padding: 8px 12px;
          color: var(--color-neutral-foreground-3);
          font-size: 14px;
        }
      </style>
      <div class="titlebar-container">
        <button class="back-button hidden" id="back-button" title="Go back">
          <span class="icon">&#xE72B;</span>
        </button>
        <img src="assets/electron logo.svg" alt="Electron" class="titlebar-logo">
        <span class="titlebar-title" style="cursor: pointer;" id="home-button" title="Go to home">Electron on Windows Gallery</span>
        <div class="titlebar-search">
          <fluent-search id="sample-search" placeholder="Search samples"></fluent-search>
          <div id="search-results"></div>
        </div>
      </div>
    `;
  }

  // Method to update search theme based on system preference
  _updateSearchTheme() {
    import('https://unpkg.com/@fluentui/web-components').then(({ baseLayerLuminance, StandardLuminance }) => {
      const search = this.shadowRoot.querySelector('#sample-search');
      if (search) {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        baseLayerLuminance.setValueFor(search, isDark ? StandardLuminance.DarkMode : StandardLuminance.LightMode);
      }
    });
  }

  // Method to update back button visibility
  updateBackButton(show) {
    const backButton = this.shadowRoot.getElementById('back-button');
    if (backButton) {
      if (show) {
        backButton.classList.remove('hidden');
      } else {
        backButton.classList.add('hidden');
      }
    }
  }
}

customElements.define('custom-titlebar', CustomTitlebar);
