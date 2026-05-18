// appNavigation.js
// Centralized navigation logic for Electron on Windows Gallery

// Navigation history stack
const navigationHistory = [];

// Navigation state to prevent rapid-fire navigation issues
let isNavigating = false;
let pendingNavigation = null;
const NAVIGATION_DEBOUNCE_MS = 100;

// Map sample names to their HTML file paths
const samplePaths = {
  'Model Context Protocol': 'samples/mcp.html',
  'Windows SDK': 'samples/winsdk.html',
  'Setup Developer Environment': 'samples/setup-developer-environment.html',
  'Create Native Addons': 'samples/create-native-addon.html',
  'Calling Windows APIs with dynwinrt': 'samples/use-dynwinrt.html',
  'Packaging Your App': 'samples/packaging-your-app.html',
  'Phi Silica Text Generation': 'samples/phi-silica-text-generation.html',
  'Text Generation': 'samples/phi-silica-text-generation.html',
  'Phi Silica Text Summarization': 'samples/phi-silica-text-summarization.html',
  'Text Summarization': 'samples/phi-silica-text-summarization.html',
  'Phi Silica Rewrite Text': 'samples/phi-silica-rewrite-text.html',
  'Rewrite Text': 'samples/phi-silica-rewrite-text.html',
  'Phi Silica Convert Text to Table': 'samples/phi-silica-text-to-table.html',
  'Convert Text to Table': 'samples/phi-silica-text-to-table.html',
  'Optical Character Recognition (OCR)': 'samples/ocr.html',
  'OCR': 'samples/ocr.html',
  'Image Description': 'samples/img-description.html',
  'Image Super Resolution': 'samples/image-scaler.html',
  'Image Object Extractor': 'samples/image-object-extractor.html',
  'Object Extractor': 'samples/image-object-extractor.html',
  'Image Object Remover': 'samples/image-object-remover.html',
  'Object Remover': 'samples/image-object-remover.html',
  'AI APIs': 'samples/ai-apis.html',
  'Settings': 'samples/settings.html'
};

// Side-panel nav mapping. Settings is its own footer item; the home-page
// guide tiles (Setup / addons / packaging / WinRT bindings / MCP / WinSDK)
// stay under Home; everything else (the AI APIs landing page + the
// individual model samples) lives under the "AI" nav button.
const HOME_GUIDE_SAMPLES = new Set([
  'Setup Developer Environment',
  'Create Native Addons',
  'Calling Windows APIs with dynwinrt',
  'Packaging Your App',
  'Model Context Protocol',
  'Windows SDK',
]);

function navTargetForSample(sample) {
  if (sample === 'Settings') return 'settings-button';
  if (HOME_GUIDE_SAMPLES.has(sample)) return 'home-button';
  return 'ai-button';
}

function dispatchNavChange(activeId) {
  document.dispatchEvent(new CustomEvent('app-nav-change', { detail: { activeId } }));
}

export async function openSample(sample) {
  try {
    console.log(`Opening ${sample} sample`);

    dispatchNavChange(navTargetForSample(sample));

    // Debounce rapid navigation to prevent race conditions
    if (isNavigating) {
      pendingNavigation = sample;
      return;
    }

    const contentArea = document.getElementById('content-area');
    if (!contentArea) {
      console.error('Content area not found');
      return;
    }

    const samplePath = samplePaths[sample];
    if (!samplePath) {
      console.error(`Unknown sample: ${sample}`);
      return;
    }

    isNavigating = true;

    // Get the current iframe and trigger unload event before destroying it
    const currentIframe = contentArea.querySelector('iframe');
    if (currentIframe && currentIframe.contentWindow) {
      try {
        // Dispatch a custom event to notify the iframe it's being unloaded
        currentIframe.contentWindow.dispatchEvent(new Event('pagehide'));
      } catch (e) {
        // Iframe may already be in an invalid state
      }
    }

    // Add current state to history
    navigationHistory.push({ type: 'sample', sample, path: samplePath });
    updateBackButton();

    // Create and load the iframe with fade-in animation
    const iframe = document.createElement('iframe');
    iframe.src = samplePath;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    
    // Wait for iframe to load before showing it
    iframe.addEventListener('load', () => {
      iframe.classList.add('loaded');
    });
    
    // Handle iframe load errors
    iframe.addEventListener('error', (e) => {
      console.error('Iframe load error:', e);
    });
    
    contentArea.innerHTML = '';
    contentArea.appendChild(iframe);

    // Reset navigation state after debounce period
    setTimeout(() => {
      isNavigating = false;
      // Process any pending navigation that came in during debounce
      if (pendingNavigation) {
        const nextSample = pendingNavigation;
        pendingNavigation = null;
        openSample(nextSample);
      }
    }, NAVIGATION_DEBOUNCE_MS);
  } catch (error) {
    console.error('Error in openSample:', error);
    isNavigating = false;
  }
}

export function showHome() {
  try {
    // Highlight the Home nav button.
    dispatchNavChange('home-button');

    // Debounce rapid navigation
    if (isNavigating) {
      pendingNavigation = '__HOME__';
      return;
    }

    const contentArea = document.getElementById('content-area');
    if (!contentArea) return;

    isNavigating = true;

    // Get the current iframe and trigger unload event before destroying it
    const currentIframe = contentArea.querySelector('iframe');
    if (currentIframe && currentIframe.contentWindow) {
      try {
        currentIframe.contentWindow.dispatchEvent(new Event('pagehide'));
      } catch (e) {
        // Iframe may already be in an invalid state
      }
    }
    
    // Clear history when going home
    navigationHistory.length = 0;
    updateBackButton();
    
    // Create and load the iframe with fade-in animation
    const iframe = document.createElement('iframe');
    iframe.src = 'samples/home-page.html';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    
    // Wait for iframe to load before showing it
    iframe.addEventListener('load', () => {
      iframe.classList.add('loaded');
    });
    
    // Handle iframe load errors
    iframe.addEventListener('error', (e) => {
      console.error('Iframe load error:', e);
    });
    
    contentArea.innerHTML = '';
    contentArea.appendChild(iframe);

    // Reset navigation state after debounce period
    setTimeout(() => {
      isNavigating = false;
      if (pendingNavigation) {
        const next = pendingNavigation;
        pendingNavigation = null;
        if (next === '__HOME__') {
          showHome();
        } else {
          openSample(next);
        }
      }
    }, NAVIGATION_DEBOUNCE_MS);
  } catch (error) {
    console.error('Error in showHome:', error);
    isNavigating = false;
  }
}

// Function to navigate back to home
export function goHome() {
  showHome();
}

// Function to navigate back in history
export function goBack() {
  try {
    if (navigationHistory.length === 0) return;

    // Debounce rapid navigation
    if (isNavigating) {
      pendingNavigation = '__BACK__';
      return;
    }
    
    // Remove current page from history
    navigationHistory.pop();
    
    const contentArea = document.getElementById('content-area');
    if (!contentArea) return;

    isNavigating = true;

    // Get the current iframe and trigger unload event before destroying it
    const currentIframe = contentArea.querySelector('iframe');
    if (currentIframe && currentIframe.contentWindow) {
      try {
        currentIframe.contentWindow.dispatchEvent(new Event('pagehide'));
      } catch (e) {
        // Iframe may already be in an invalid state
      }
    }
    
    // Create and load the iframe with fade-in animation
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    
    if (navigationHistory.length === 0) {
      // No more history, go to home
      iframe.src = 'samples/home-page.html';
      dispatchNavChange('home-button');
    } else {
      // Go to previous page
      const previousPage = navigationHistory[navigationHistory.length - 1];
      iframe.src = previousPage.path;
      dispatchNavChange(navTargetForSample(previousPage.sample));
    }
    
    // Wait for iframe to load before showing it
    iframe.addEventListener('load', () => {
      iframe.classList.add('loaded');
    });
    
    // Handle iframe load errors
    iframe.addEventListener('error', (e) => {
      console.error('Iframe load error:', e);
    });
    
    contentArea.innerHTML = '';
    contentArea.appendChild(iframe);
    updateBackButton();

    // Reset navigation state after debounce period
    setTimeout(() => {
      isNavigating = false;
      if (pendingNavigation) {
        const next = pendingNavigation;
        pendingNavigation = null;
        if (next === '__HOME__') {
          showHome();
        } else if (next === '__BACK__') {
          goBack();
        } else {
          openSample(next);
        }
      }
    }, NAVIGATION_DEBOUNCE_MS);
  } catch (error) {
    console.error('Error in goBack:', error);
    isNavigating = false;
  }
}

// Function to update back button visibility
function updateBackButton() {
  const titlebar = document.querySelector('custom-titlebar');
  if (titlebar && titlebar.updateBackButton) {
    titlebar.updateBackButton(navigationHistory.length > 0);
  }
}