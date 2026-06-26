// Shared model-download gate for Windows AI sample pages.
// Mirrors AI Dev Gallery's WcrModelDownloader.xaml: NotDownloaded → progress → Error.
//
// Usage:
//   <script src="../scripts/wcr-model-downloader.js"></script>
//   renderModelGate(container, {
//     getReadyState: () => externalWindowsAI.getXxxReadyState(),
//     ensureReady:   (onProgress) => externalWindowsAI.ensureXxxReady(onProgress),
//     onReady:       (container) => { /* render the working sample UI */ },
//   });
(function () {
  'use strict';

  const SUPPORT_URL = 'https://learn.microsoft.com/windows/ai/apis/model-setup#prerequisites';
  const GET_STARTED = 'https://learn.microsoft.com/windows/ai/apis/get-started';

  window.AI_FEATURE_READY_STATE = Object.freeze({
    Ready: 0,
    NotReady: 1,
    NotSupportedOnCurrentSystem: 2,
    DisabledByUser: 3,
    CapabilityMissing: 4,
    NotCompatibleWithSystemHardware: 5,
    OSUpdateNeeded: 6,
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function openWindowsUpdate(e) {
    if (e) e.preventDefault();
    window.open('ms-settings:windowsupdate');
  }

  async function renderModelGate(container, opts) {
    if (!container) return;
    const { getReadyState, ensureReady, onReady, learnMoreUrl } = opts || {};
    const S = window.AI_FEATURE_READY_STATE;

    let state;
    try {
      state = await getReadyState();
    } catch (e) {
      console.error('Error checking readiness:', e);
      state = S.NotSupportedOnCurrentSystem;
    }

    if (state === S.Ready) {
      if (onReady) onReady(container);
      return;
    }
    if (state === S.NotReady) {
      renderNotDownloaded();
      return;
    }
    if (state === S.DisabledByUser) {
      renderUnavailable('Disabled by user',
        'This Windows AI API has been disabled in Windows settings.');
      return;
    }
    // NotSupportedOnCurrentSystem / CapabilityMissing /
    // NotCompatibleWithSystemHardware / OSUpdateNeeded — collapse into the
    // "Copilot+ PC required" card; differentiating further would mostly
    // confuse end users in a samples gallery.
    renderUnavailable('Copilot+ PC required',
      'This Windows AI API requires a Copilot+ PC and Windows Insider Preview Build 26120.3073 (Dev or Beta Channel).');

    // ──────────────────────────────────────────────────────────────

    function renderUnavailable(title, subtitle) {
      container.innerHTML =
        '<div class="requirement-card">' +
          '<div class="requirement-icon">' +
            '<img src="../assets/WCRAPI.svg" alt="Copilot+ PC" style="width:40px;height:40px;object-fit:contain;" />' +
          '</div>' +
          '<div class="requirement-title">' + escapeHtml(title) + '</div>' +
          '<div class="requirement-subtitle">' + escapeHtml(subtitle) + '</div>' +
          '<div class="requirement-description">' +
            '<a href="' + GET_STARTED + '" class="learn-more-link" target="_blank">Learn more</a>' +
          '</div>' +
          '<p class="requirement-description">You can still view the code for the sample.</p>' +
        '</div>';
    }

    function renderNotDownloaded() {
      container.innerHTML =
        '<div class="requirement-card">' +
          '<div class="requirement-icon">' +
            '<img src="../assets/WCRAPI.svg" alt="Model download" style="width:40px;height:40px;object-fit:contain;" />' +
          '</div>' +
          '<div class="requirement-title">Model download required</div>' +
          '<div class="requirement-subtitle">This Windows AI API requires a one-time model download via Windows Update.</div>' +
          '<div class="requirement-description">' +
            '<a href="' + (learnMoreUrl || SUPPORT_URL) + '" class="learn-more-link" target="_blank">A Copilot+ PC with Windows 11 Build 26120.3073 or higher is required</a>' +
          '</div>' +
          '<div class="wcr-actions" style="display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:8px;">' +
            '<fluent-button appearance="accent" class="wcr-request-btn">Request model</fluent-button>' +
          '</div>' +
          '<div class="wcr-progress" style="display:none;flex-direction:column;align-items:center;gap:8px;margin-top:8px;">' +
            '<fluent-progress class="wcr-progress-bar" min="0" max="100" value="0" style="width:240px;"></fluent-progress>' +
            '<div class="requirement-description" style="margin:0;">Requesting model…</div>' +
            '<div class="requirement-description" style="margin:0;font-size:var(--font-size-base-200);">' +
              'Download progress can also be tracked in <a href="#" class="wcr-open-wu learn-more-link">Windows Update</a>.' +
            '</div>' +
          '</div>' +
        '</div>';

      const btn = container.querySelector('.wcr-request-btn');
      const actions = container.querySelector('.wcr-actions');
      const progressBlock = container.querySelector('.wcr-progress');
      const progressBar = container.querySelector('.wcr-progress-bar');
      const openWU = container.querySelector('.wcr-open-wu');
      if (openWU) openWU.addEventListener('click', openWindowsUpdate);
      if (!btn) return;
      btn.addEventListener('click', async () => {
        if (actions) actions.style.display = 'none';
        if (progressBlock) progressBlock.style.display = 'flex';
        try {
          const result = await ensureReady((p) => {
            if (progressBar) {
              progressBar.value = Math.max(0, Math.min(100, Math.round(Number(p) * 100)));
            }
          });
          if (result && result.success) {
            renderModelGate(container, opts); // re-check; should be Ready now
          } else {
            renderError((result && result.errorMessage) || 'Model download failed. Please try again.');
          }
        } catch (err) {
          renderError((err && (err.message != null ? err.message : String(err))) || 'Model download failed. Please try again.');
        }
      });
    }

    // Match AI Dev Gallery WcrModelDownloader.xaml errorContent exactly:
    // 36px FontIcon E783 (default fg color) + semibold title + Copilot+ PC
    // link + Consolas first-line of the error. No buttons.
    function renderError(errorMessage) {
      const firstLine = String(errorMessage).split(/\r?\n/)[0] || '';
      container.innerHTML =
        '<div class="requirement-card" style="padding:24px;">' +
          '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;">' +
            '<span aria-hidden="true" style="font-family:\'Segoe Fluent Icons\',\'Segoe UI Symbol\',sans-serif;font-size:36px;line-height:1;color:var(--color-neutral-foreground-1);">&#xE783;</span>' +
            '<div class="requirement-title" style="font-weight:600;margin:0;">Model download error</div>' +
            '<div style="font-size:12px;text-align:center;margin:0;">' +
              '<a href="' + (learnMoreUrl || SUPPORT_URL) + '" class="learn-more-link" target="_blank">A Copilot+ PC with Windows 11 Build 26120.3073 or higher is required</a>' +
            '</div>' +
            '<div style="font-family:Consolas,\'Courier New\',monospace;font-size:12px;text-align:center;word-break:break-word;user-select:text;">' + escapeHtml(firstLine) + '</div>' +
          '</div>' +
        '</div>';
    }
  }

  window.renderModelGate = renderModelGate;
})();
