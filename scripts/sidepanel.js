// Custom Side Panel Web Component
class CustomSidePanel extends HTMLElement {
  // Static flag to ensure we only set up IPC listener once
  static _focusListenersInitialized = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._render();
  }

  connectedCallback() {
    // Setup focus/blur handlers for visual feedback - only once globally
    if (!CustomSidePanel._focusListenersInitialized) {
      CustomSidePanel._focusListenersInitialized = true;
      
      // Store reference to panel container
      const panelContainer = this.shadowRoot.querySelector('.sidepanel-container');
      
      // Listen to IPC events from main process for reliable focus detection
      if (window.electronUtils && window.electronUtils.onWindowFocusChanged) {
        window.electronUtils.onWindowFocusChanged((isFocused) => {
          if (panelContainer) {
            if (isFocused) {
              panelContainer.classList.remove('unfocused');
            } else {
              panelContainer.classList.add('unfocused');
            }
          }
        });
      }
    }

    // Setup button click handlers
    // Helper to mark a single nav button as active (mirrors WinUI
    // NavigationView's SelectedItem behavior). Contribute is excluded
    // because it opens an external URL and doesn't represent a page.
    const navButtonIds = ['home-button', 'ai-button', 'settings-button'];
    const setActive = (activeId) => {
      for (const id of navButtonIds) {
        const btn = this.shadowRoot.getElementById(id);
        if (btn) btn.classList.toggle('active', id === activeId);
      }
    };

    // Sync with app-level navigation so the selected nav item stays in
    // sync when navigation is triggered from outside the side panel
    // (e.g. clicking an AI sample card on the home page).
    document.addEventListener('app-nav-change', (e) => {
      const id = e && e.detail && e.detail.activeId;
      if (id) setActive(id);
    });

    const homeButton = this.shadowRoot.getElementById('home-button');
    if (homeButton) {
      homeButton.addEventListener('click', () => {
        setActive('home-button');
        if (window.showHome) {
          window.showHome();
        }
      });
    }

    const contributeButton = this.shadowRoot.getElementById('contribute-button');
    if (contributeButton) {
      contributeButton.addEventListener('click', () => {
        window.open('https://github.com/microsoft/electron-on-windows-gallery', '_blank');
      });
    }

    const aiButton = this.shadowRoot.getElementById('ai-button');
    if (aiButton) {
      aiButton.addEventListener('click', () => {
        setActive('ai-button');
        if (window.openSample) {
          window.openSample('AI APIs');
        }
      });
    }

    const settingsButton = this.shadowRoot.getElementById('settings-button');
    if (settingsButton) {
      settingsButton.addEventListener('click', () => {
        setActive('settings-button');
        if (window.openSample) {
          window.openSample('Settings');
        }
      });
    }
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        /* Force Chromium to look up Segoe Fluent Icons / Segoe MDL2 Assets
           by exact name. Shadow DOM does not inherit @font-face from the
           outer document, so we redeclare it here. */
        @font-face {
          font-family: 'Segoe Fluent Icons Local';
          src: local('Segoe Fluent Icons'), local('Segoe MDL2 Assets');
          font-display: block;
        }

        :host {
          display: block;
          position: fixed;
          top: calc(var(--titlebar-height) + var(--spacing-vertical-m)); /* Below titlebar */
          left: 0;
          bottom: 0;
          width: var(--sidebar-width);
          background-color: transparent;
          z-index: 9998; /* Below titlebar but above content */
        }

        .sidepanel-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
        }

        .sidepanel-container.unfocused {
          opacity: 0.5;
        }

        .panel-button {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--color-neutral-foreground-3);
          font-family: var(--font-family-base);
          font-size: var(--font-size-base-100);
          line-height: var(--line-height-base-100);
          -webkit-app-region: no-drag;
          position: relative;
          outline: none;
          padding-bottom: var(--spacing-vertical-l);
          transition: color var(--duration-faster) var(--curve-easy-ease);
        }

        .panel-button:hover {
          color: var(--color-neutral-foreground-1);
        }

        .panel-button:active {
          color: var(--color-neutral-foreground-3);
        }

        /* Selected / current-page indicator — mirrors WinUI
           NavigationViewItem selected state: accent text, persistent
           background pill, and a left-side accent bar. */
        .panel-button.active {
          color: var(--color-neutral-foreground-1);
        }
        .panel-button.active::before {
          background-color: var(--color-subtle-background-pressed, rgba(0, 0, 0, 0.06));
        }
        .panel-button.active::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 6px;
          transform: translateY(calc(-50% - var(--spacing-vertical-l) / 2));
          width: 3px;
          height: 16px;
          border-radius: 1.5px;
          background-color: #0078d4;
        }
        @media (prefers-color-scheme: dark) {
          .panel-button.active::after { background-color: #4cc2ff; }
        }
        .panel-button.active .panel-icon-text {
          color: #0078d4;
        }
        @media (prefers-color-scheme: dark) {
          .panel-button.active .panel-icon-text { color: #4cc2ff; }
        }

        .panel-button::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, calc(-50% - var(--spacing-vertical-l) / 2));
          width: 48px;
          height: 48px;
          background-color: transparent;
          border-radius: var(--border-radius-medium);
          transition: background-color var(--duration-faster) var(--curve-easy-ease);
          z-index: -1;
        }

        .panel-button:hover::before {
          background-color: var(--color-subtle-background-pressed);
        }

        .panel-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .panel-icon img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        @media (prefers-color-scheme: dark) {
          .panel-icon img[src*="Header-Github"] {
            content: url('assets/Header-Github.dark.png');
          }
        }

        .panel-icon-text {
          font-family: 'Segoe Fluent Icons Local', 'Segoe Fluent Icons', 'Segoe MDL2 Assets', sans-serif;
          font-size: 20px;
        }

        .panel-label {
          font-weight: var(--font-weight-regular);
          text-align: center;
          white-space: nowrap;
        }

        .spacer {
          flex: 1;
        }
      </style>
      <div class="sidepanel-container">
        <button class="panel-button active" id="home-button" title="Home">
          <div class="panel-icon">
            <span class="panel-icon-text">&#xE80F;</span>
          </div>
          <div class="panel-label">Home</div>
        </button>
        <button class="panel-button" id="ai-button" title="AI APIs">
          <div class="panel-icon">
            <!-- Segoe MDL2 / Fluent Icons "AzureLogo" (U+E81E) — matches
                 AIDevGallery/MainWindow.xaml's AI APIs NavigationViewItem -->
            <span class="panel-icon-text">&#xE81E;</span>
          </div>
          <div class="panel-label">AI</div>
        </button>
        <div class="spacer"></div>
        <button class="panel-button" id="contribute-button" title="Contribute">
          <div class="panel-icon">
            <img src="assets/Header-Github.light.png" alt="GitHub">
          </div>
          <div class="panel-label">Contribute</div>
        </button>
        <button class="panel-button" id="settings-button" title="Settings">
          <div class="panel-icon">
            <span class="panel-icon-text">&#xE713;</span>
          </div>
          <div class="panel-label">Settings</div>
        </button>
      </div>
    `;
  }
}

customElements.define('custom-sidepanel', CustomSidePanel);
