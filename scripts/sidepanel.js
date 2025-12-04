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
    const homeButton = this.shadowRoot.getElementById('home-button');
    if (homeButton) {
      homeButton.addEventListener('click', () => {
        if (window.showHome) {
          window.showHome();
        }
      });
    }

    const contributeButton = this.shadowRoot.getElementById('contribute-button');
    if (contributeButton) {
      contributeButton.addEventListener('click', () => {
        window.open('https://github.com/microsoft/electron-gallery', '_blank');
      });
    }

    const settingsButton = this.shadowRoot.getElementById('settings-button');
    if (settingsButton) {
      settingsButton.addEventListener('click', () => {
        if (window.openSample) {
          window.openSample('Settings');
        }
      });
    }
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
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
          font-family: 'Segoe Fluent Icons', sans-serif;
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
