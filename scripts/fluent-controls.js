// HomePageSampleButton Web Component
class HomePageSampleButton extends HTMLElement {
  static get observedAttributes() {
    return ['title', 'description', 'sample'];
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
      const sample = this.getAttribute('sample');
      if (sample && window.openSample) {
        window.openSample(sample);
      }
    });
    this.setAttribute('tabindex', '0');
    this.setAttribute('role', 'button');
    this.setAttribute('aria-label', `Open ${this.getAttribute('title') || ''} sample`);
  }

  _render() {
    const title = this.getAttribute('title') || '';
    const description = this.getAttribute('description') || '';
    this.shadowRoot.innerHTML = `
      <style>
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
        }
        .component-item:focus {
          outline: none;
        }
        .component-item:hover {
          border-color: var(--color-neutral-foreground-4);
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
        }
        .indicator {
          content: '';
          position: absolute;
          top: 12px;
          right: 12px;
          width: 8px;
          height: 8px;
          background: var(--color-brand-background-1);
          border-radius: var(--border-radius-circular);
          z-index: 2;
        }
      </style>
      <div class="component-item">
        <span class="indicator"></span>
        <div class="component-title">${title}</div>
        <div class="component-description">${description}</div>
      </div>
    `;
  }
}
customElements.define('home-page-sample-button', HomePageSampleButton);
import { openSample } from './appNavigation.js';
window.openSample = openSample;
// HomePageTile Web Component

class HomePageTile extends HTMLElement {
  static get observedAttributes() {
    return ['icon', 'title', 'description', 'link'];
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
      const link = this.getAttribute('link');
      if (link) {
        if (link.startsWith('http')) {
          window.open(link, '_blank');
        } else if (window.openSample) {
          window.openSample(link);
        }
      }
    });
  }

  _render() {
    const icon = this.getAttribute('icon');
    const title = this.getAttribute('title') || '';
    const description = this.getAttribute('description') || '';
    // Use <img> if icon is a path, otherwise render as Fluent icon
    let iconHtml = '';
    if (icon) {
      if (icon.startsWith('assets/') || icon.endsWith('.svg') || icon.endsWith('.png')) {
        iconHtml = `<img src="${icon}" alt="Tile Icon" />`;
      } else {
        iconHtml = `<span class="fluent-icon">${icon}</span>`;
      }
    }
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
        <div class="tile-icon-content">${iconHtml}</div>
        <div class="header-tile-title">${title}</div>
        <div class="header-tile-description">${description}</div>
        <span class="tile-link-icon">&#xE8A7;</span>
      </div>
    `;
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
      const label = this.getAttribute('label') || '';
      if (window.openSample && typeof window.openSample === 'function') {
        window.openSample(label);
      }
      this.dispatchEvent(new Event('click', { bubbles: true, composed: true }));
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
