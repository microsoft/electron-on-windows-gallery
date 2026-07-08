// <copy-button> — Copy to clipboard button, customizable
class CopyButton extends HTMLElement {
  static get observedAttributes() {
    return ['copy-text', 'label'];
  }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }
        button {
          background: none;
          border: none;
          color: var(--color-brand-background-1);
          cursor: pointer;
          font-size: var(--font-size-base-200, 15px);
          display: flex;
          align-items: center;
          gap: var(--spacing-horizontal-xs, 6px);
          transition: color 0.15s;
          padding: 0;
        }
        button:active {
          color: #3aa0f7;
        }
        .icon {
          font-family: 'Segoe Fluent Icons', sans-serif;
          font-size: 16px;
          color: var(--color-communication-foreground);
        }
        .label {
          color: var(--color-communication-foreground);
        }
      </style>
      <button id="copy-btn" title="Copy to clipboard">
        <span class="icon">&#xe8c8;</span>
        <span class="label"></span>
      </button>
    `;
    this._onClick = this._onClick.bind(this);
  }
  connectedCallback() {
    this.shadowRoot.getElementById('copy-btn').addEventListener('click', this._onClick);
    this._updateLabel();
  }
  disconnectedCallback() {
    this.shadowRoot.getElementById('copy-btn').removeEventListener('click', this._onClick);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'label') {
      this._updateLabel();
    }
  }
  _updateLabel() {
    const label = this.getAttribute('label') || 'Copy';
    this.shadowRoot.querySelector('.label').textContent = label;
  }
  _onClick() {
    let text = this.getAttribute('copy-text');
    if (!text) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  }
}
customElements.define('copy-button', CopyButton);
// ViewDocumentationButton Web Component
class ViewDocumentationButton extends HTMLElement {
  static get observedAttributes() {
    return ['href', 'label'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._render();
  }

  attributeChangedCallback() {
    this._render();
  }

  _render() {
    const href = this.getAttribute('href') || '#';
    const label = this.getAttribute('label') || 'View documentation →';
    this.shadowRoot.innerHTML = `
      <style>
        .view-doc-button {
          text-decoration: none;
          color: var(--color-communication-foreground);
          background: none;
          border: none;
          cursor: pointer;
          font-size: var(--font-size-base-200);
          display: flex;
          align-items: center;
          gap: var(--spacing-horizontal-xs);
        }
        .view-doc-button span {
          color: var(--color-communication-foreground);
        }
        .view-doc-button:hover {
          text-decoration: underline;
        }
      </style>
      <a class="view-doc-button" target="_blank" rel="noopener noreferrer">
        <span></span>
      </a>
    `;
    const link = this.shadowRoot.querySelector('.view-doc-button');
    link.setAttribute('href', href);
    link.querySelector('span').textContent = label;
  }
}
customElements.define('view-documentation-button', ViewDocumentationButton);
// ExportSampleButton Web Component
class ExportSampleButton extends HTMLElement {
  static get observedAttributes() {
    return ['href', 'label'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._render();
  }

  attributeChangedCallback() {
    this._render();
  }

  _render() {
    const href = this.getAttribute('href') || '#';
    const label = this.getAttribute('label') || 'Sample Source Code';
    
    this.shadowRoot.innerHTML = `
      <style>
        .export-button {
          display: flex;
          align-items: center;
          gap: var(--spacing-horizontal-s);
          font-size: var(--font-size-base-200);
          color: var(--color-brand-background-1);
          text-decoration: none;
          cursor: pointer;
        }
        .export-button:hover {
          text-decoration: underline;
        }
        .icon {
          font-family: 'Segoe Fluent Icons', sans-serif;
          font-size: 16px;
          color: var(--color-communication-foreground);
        }
        .label {
          color: var(--color-communication-foreground);
        }
      </style>
      <a class="export-button" target="_blank" rel="noopener noreferrer">
        <span class="icon">&#xe8e5;</span>
        <span class="label"></span>
      </a>
    `;
    const link = this.shadowRoot.querySelector('.export-button');
    link.setAttribute('href', href);
    link.querySelector('.label').textContent = label;
  }

  connectedCallback() {
    // If no href is provided, fall back to the old event-based behavior
    if (!this.getAttribute('href') || this.getAttribute('href') === '#') {
      this.shadowRoot.querySelector('.export-button').addEventListener('click', e => {
        e.preventDefault();
        this.dispatchEvent(new Event('export', { bubbles: true, composed: true }));
      });
    }
  }
}
customElements.define('export-sample-button', ExportSampleButton);
// HomePageSampleButton Web Component
class HomePageSampleButton extends HTMLElement {
  static get observedAttributes() {
    return ['title', 'description', 'sample', 'icon'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._render();
  }

  attributeChangedCallback() {
    this._render();
  }

  connectedCallback() {
    this.shadowRoot.addEventListener('click', () => {
      try {
        const link = this.getAttribute('link');
        if (link) {
          // Open external link in new window
          window.open(link, '_blank');
        } else {
          const sample = this.getAttribute('sample');
          // Check if we're in an iframe, if so use parent window's openSample
          const targetWindow = window.parent || window;
          if (sample && targetWindow && targetWindow.openSample) {
            targetWindow.openSample(sample);
          }
        }
      } catch (e) {
        // Parent window context may be invalid during navigation
        console.log('Click ignored - context destroyed');
      }
    });
    this.setAttribute('tabindex', '0');
    this.setAttribute('role', 'button');
    this.setAttribute('aria-label', `Open ${this.getAttribute('title') || ''} sample`);
    
    // Handle dark mode variant for GitHub icon, including Windows high contrast modes
    const icon = this.getAttribute('icon') || '';
    if (icon.includes('Header-Github')) {
      const updateGithubIcon = () => {
        const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isHighContrast = window.matchMedia('(forced-colors: active)').matches;
        
        // Use dark icon in dark mode or high contrast mode, light icon otherwise
        const useDarkIcon = isDarkMode || isHighContrast;
        const newIcon = useDarkIcon ? '../assets/Header-Github.dark.png' : '../assets/Header-Github.light.png';
        
        if (this.getAttribute('icon') !== newIcon) {
          this.setAttribute('icon', newIcon);
        }
      };
      
      updateGithubIcon();
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const highContrastQuery = window.matchMedia('(forced-colors: active)');
      darkModeQuery.addEventListener('change', updateGithubIcon);
      highContrastQuery.addEventListener('change', updateGithubIcon);
    }
  }

  _render() {
    const title = this.getAttribute('title') || '';
    const description = this.getAttribute('description') || '';
    const link = this.getAttribute('link') || '';
    const icon = this.getAttribute('icon') || '';
    this.setAttribute('aria-label', `Open ${title} sample`);
    
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
        }
        .component-item {
          background: var(--color-neutral-background-1);
          border: 1px solid var(--color-neutral-stroke-1);
          border-radius: var(--border-radius-large);
          padding: var(--spacing-vertical-m) var(--spacing-horizontal-m);
          transition: all var(--duration-faster) var(--curve-easy-ease);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          outline: none;
          box-sizing: border-box;
          width: 320px;
          height: 100%;
        }
        :host(.fill-width) .component-item {
          width: 100%;
        }
        :host(.link-style) .component-item {
          background: transparent;
          border: none;
          padding: var(--spacing-vertical-m) var(--spacing-horizontal-s);
          width: auto;
          min-width: 200px;
          /* Vertically center the single-line title in the card. */
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        :host(.link-style) .component-item:hover {
          background: transparent;
          border: none;
        }
        :host(.link-style) .component-title {
          color: var(--color-brand-background-1);
          font-weight: var(--font-weight-semibold);
          /* Use the body font for letters; the trailing chevron is
             rendered via ::after below using the icon font. */
          font-family: var(--font-family-base, sans-serif);
          gap: 6px;
          /* Shrink the title to its text width so the hover background
             only covers the "Explore samples >" text rather than the
             full tile-sized card. Padding + matching negative margins
             keep the visible text in its original position. */
          align-self: flex-start;
          padding: var(--spacing-vertical-sNudge) var(--spacing-horizontal-sNudge);
          margin-top: calc(-1 * var(--spacing-vertical-sNudge));
          margin-left: calc(-1 * var(--spacing-horizontal-sNudge));
          margin-right: calc(-1 * var(--spacing-horizontal-sNudge));
          border-radius: var(--border-radius-medium);
          transition: background var(--duration-faster) var(--curve-easy-ease);
        }
        :host(.link-style) .component-title::after {
          /* ChevronRight (U+E76C) from Segoe Fluent Icons / MDL2 Assets.
             Rendered as a pseudo-element so the host's title attribute
             (used by the browser as a native tooltip) doesn't contain
             an icon-font codepoint that would render as a "?" tofu in
             the OS tooltip. */
          content: '\\E76C';
          font-family: 'Segoe Fluent Icons Local', 'Segoe Fluent Icons', 'Segoe MDL2 Assets', sans-serif;
          margin-left: 6px;
        }
        :host(.link-style) .component-item:hover .component-title {
          background: var(--color-neutral-background-1);
        }
        :host(.link-style) .component-description {
          color: var(--color-neutral-foreground-3);
        }
        .component-item:focus {
          outline: none;
        }
        .component-item:hover {
          border-color: var(--color-neutral-foreground-4);
        }
        .component-icon {
          width: 32px;
          height: 32px;
          margin-bottom: var(--spacing-vertical-m);
          object-fit: contain;
        }
        .component-icon.fluent-icon {
          font-family: 'Segoe Fluent Icons Local', 'Segoe Fluent Icons', 'Segoe MDL2 Assets', sans-serif;
          font-size: 32px;
          color: var(--color-brand-background-1);
          display: block;
          line-height: 1;
        }
        .component-title {
          font-size: var(--font-size-base-400);
          line-height: var(--line-height-base-400);
          font-weight: var(--font-weight-semibold);
          color: var(--color-neutral-foreground-1);
          margin-bottom: var(--spacing-vertical-sNudge);
          display: flex;
          align-items: center;
        }
        .component-description {
          font-size: var(--font-size-base-200);
          line-height: var(--line-height-base-200);
          color: var(--color-neutral-foreground-3);
          padding-right: var(--spacing-horizontal-m);
        }
        .link-icon {
          font-family: 'Segoe Fluent Icons Local', 'Segoe Fluent Icons', 'Segoe MDL2 Assets', sans-serif;
          font-size: var(--font-size-base-400);
          color: var(--color-neutral-foreground-1);
          position: absolute;
          bottom: 12px;
          right: 12px;
        }
      </style>
      <div class="component-item">
        <div class="component-title"></div>
        <div class="component-description"></div>
      </div>
    `;
    const item = this.shadowRoot.querySelector('.component-item');
    const titleEl = this.shadowRoot.querySelector('.component-title');
    const descriptionEl = this.shadowRoot.querySelector('.component-description');

    titleEl.textContent = title;
    descriptionEl.textContent = description;

    if (icon) {
      let iconEl;
      if (icon.includes('.svg') || icon.includes('.png')) {
        iconEl = document.createElement('img');
        iconEl.setAttribute('src', icon);
        iconEl.setAttribute('alt', '');
        iconEl.className = 'component-icon';
      } else {
        iconEl = document.createElement('span');
        iconEl.className = 'component-icon fluent-icon';
        iconEl.textContent = icon;
      }
      item.insertBefore(iconEl, titleEl);
    }

    if (link) {
      const linkIcon = document.createElement('span');
      linkIcon.className = 'link-icon';
      linkIcon.textContent = '\uE8A7';
      item.appendChild(linkIcon);
    }
  }
}
customElements.define('home-page-sample-button', HomePageSampleButton);
import { openSample } from './appNavigation.js';
window.openSample = openSample;
// HomePageTile Web Component

class HomePageTile extends HTMLElement {
  static get observedAttributes() {
    return ['icon', 'title', 'description', 'link', 'sample'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._render();
  }

  attributeChangedCallback() {
    this._render();
  }

  connectedCallback() {
    this.shadowRoot.addEventListener('click', (e) => {
      try {
        const sample = this.getAttribute('sample');
        const link = this.getAttribute('link');
        if (sample && window.parent && window.parent.openSample) {
          window.parent.openSample(sample);
        } else if (link) {
          if (link.startsWith('http')) {
            window.open(link, '_blank');
          } else if (window.parent && window.parent.openSample) {
            window.parent.openSample(link);
          }
        }
      } catch (e) {
        // Parent window context may be invalid during navigation
        console.log('Card click ignored - context destroyed');
      }
    });
  }

  _render() {
    const icon = this.getAttribute('icon');
    const title = this.getAttribute('title') || '';
    const description = this.getAttribute('description') || '';
    const link = this.getAttribute('link');
    const sample = this.getAttribute('sample');
    this.shadowRoot.innerHTML = `
      <style>
        .header-tile {
          background: var(--color-subtle-background);
          border: 1px solid var(--color-neutral-stroke-1);
          border-radius: var(--border-radius-xlarge);
          padding: var(--spacing-vertical-mNudge);
          width: 160px;
          min-height: 180px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          cursor: pointer;
          transition: all var(--duration-normal) var(--curve-easy-ease);
          position: relative;
          flex-shrink: 0;
          box-sizing: border-box;
          font-family: var(--font-family-base);
        }
        .header-tile:hover {
          background: var(--color-subtle-background-hover);
        }
        .header-tile:active {
          transform: none;
        }
        .header-tile:focus {
          outline: none;
        }
        .tile-icon-content {
          height: 40px;
          margin-bottom: var(--spacing-vertical-sNudge);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tile-icon-content img {
          width: 40px;
          height: 40px;
          object-fit: contain;
        }
        @media (prefers-color-scheme: dark) {
          .tile-icon-content img.github-logo {
            content: url('../assets/Header-Github.dark.png');
          }
        }
        .tile-icon-content .fluent-icon {
          font-family: 'Segoe Fluent Icons', sans-serif;
          font-size: 32px;
          color: var(--color-brand-background-1);
        }
        .header-tile-title {
          font-size: var(--font-size-base-400);
          line-height: var(--line-height-base-400);
          font-weight: var(--font-weight-semibold);
          color: var(--color-neutral-foreground-1);
          margin-bottom: var(--spacing-vertical-xs);
          padding-top: var(--spacing-vertical-m);
        }
        .header-tile-description {
          font-size: var(--font-size-base-100);
          line-height: var(--line-height-base-100);
          color: var(--color-neutral-foreground-3);
          flex-grow: 1;
          margin-bottom: var(--spacing-vertical-sNudge);
        }
        .tile-link-icon {
          font-family: 'Segoe Fluent Icons', sans-serif;
          font-size: var(--font-size-base-400);
          color: var(--color-neutral-foreground-1);
          align-self: flex-end;
        }
      </style>
      <div class="header-tile" tabindex="0" role="button">
        <div class="tile-icon-content"></div>
        <div class="header-tile-title"></div>
        <div class="header-tile-description"></div>
      </div>
    `;
    const tile = this.shadowRoot.querySelector('.header-tile');
    const iconContainer = this.shadowRoot.querySelector('.tile-icon-content');
    const titleEl = this.shadowRoot.querySelector('.header-tile-title');
    const descriptionEl = this.shadowRoot.querySelector('.header-tile-description');

    titleEl.textContent = title;
    descriptionEl.textContent = description;

    if (icon) {
      if (icon.startsWith('assets/') || icon.endsWith('.svg') || icon.endsWith('.png')) {
        const img = document.createElement('img');
        img.setAttribute('src', icon);
        img.setAttribute('alt', 'Tile Icon');
        if (icon.includes('Header-Github')) {
          img.className = 'github-logo';
        }
        iconContainer.appendChild(img);
      } else {
        const iconEl = document.createElement('span');
        iconEl.className = 'fluent-icon';
        iconEl.textContent = icon;
        iconContainer.appendChild(iconEl);
      }
    }

    if (link && !sample) {
      const linkIcon = document.createElement('span');
      linkIcon.className = 'tile-link-icon';
      linkIcon.textContent = '\uE8A7';
      tile.appendChild(linkIcon);
    }
  }
}
customElements.define('home-page-tile', HomePageTile);


// OtherSamplesButton Web Component
class OtherSamplesButton extends HTMLElement {
  static get observedAttributes() {
    return ['icon', 'label'];
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        @import url('../styles/fluent-components.css');
        button {
          all: unset;
          box-sizing: border-box;
        }
        .fluent-button {
          padding: var(--spacing-vertical-xs) var(--spacing-horizontal-m);
          font-family: var(--font-family-base);
          font-size: var(--font-size-base-300);
          font-weight: var(--font-weight-regular);
          cursor: pointer;
          transition: background var(--duration-normal) var(--curve-easy-ease);
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-horizontal-xs);
          position: relative;
          overflow: hidden;
          outline: none;
          background: var(--color-neutral-background-2);
          color: var(--color-neutral-foreground-1);
          border-radius: 20px;
          border: 1px solid var(--color-neutral-stroke-2);
          min-height: 36px;
          min-width: 36px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.06);
          margin: var(--spacing-vertical-xs) var(--spacing-horizontal-xs);
        }
        .fluent-button:hover {
          background: var(--color-neutral-background-3);
        }
        .fluent-button:active {
          background: var(--color-neutral-background-4);
          transform: none;
        }
        .icon {
          font-family: 'Segoe Fluent Icons', sans-serif;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-neutral-foreground-1);
        }
        .label {
          font-size: var(--font-size-base-300);
          font-weight: 400;
          margin-left: 4px;
          color: var(--color-neutral-foreground-1);
        }
      </style>
      <button class="fluent-button">
        <span class="icon"></span>
        <span class="label"></span>
      </button>
    `;
    this._iconEl = shadow.querySelector('.icon');
    this._labelEl = shadow.querySelector('.label');
    this._button = shadow.querySelector('button');
  }

  connectedCallback() {
    this._update();
    this._button.addEventListener('click', e => {
      try {
        const label = this.getAttribute('label') || '';
        // Check if we're in an iframe, if so use parent window's openSample
        const targetWindow = window.parent || window;
        if (targetWindow && targetWindow.openSample && typeof targetWindow.openSample === 'function') {
          targetWindow.openSample(label);
        }
        this.dispatchEvent(new Event('click', { bubbles: true, composed: true }));
      } catch (e) {
        // Parent window context may be invalid during navigation
        console.log('Navigation click ignored - context destroyed');
      }
    });
  }

  attributeChangedCallback() {
    this._update();
  }

  _update() {
    this._iconEl.textContent = this.getAttribute('icon') || '';
    this._labelEl.textContent = this.getAttribute('label') || '';
    this._labelEl.style.display = this.getAttribute('label') ? '' : 'none';
  }
}
customElements.define('other-samples-button', OtherSamplesButton);
