// appNavigation.js
// Centralized navigation logic for Electron on Windows Gallery

// Navigation history stack (restore from sessionStorage if available)
const navigationHistory = JSON.parse(sessionStorage.getItem('navigationHistory') || '[]');

// Current page tracking for hot reload
let currentPage = sessionStorage.getItem('currentPage') || null;

// Helper to save navigation history
function saveNavigationHistory() {
  sessionStorage.setItem('navigationHistory', JSON.stringify(navigationHistory));
}

// Helper to load a page in the content area
function loadPage(src) {
  const contentArea = document.getElementById('content-area');
  if (!contentArea) return;

  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';

  iframe.addEventListener('load', () => {
    iframe.classList.add('loaded');
  });

  contentArea.innerHTML = '';
  contentArea.appendChild(iframe);
}

// Map sample names to their HTML file paths
const samplePaths = {
  'Model Context Protocol': 'samples/mcp.html',
  'Windows SDK': 'samples/winsdk.html',
  'Setup Developer Environment': 'samples/setup-developer-environment.html',
  'Create Native Addons': 'samples/create-native-addon.html',
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
  'Settings': 'samples/settings.html'
};

export async function openSample(sample) {
  console.log(`Opening ${sample} sample`);

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

  // Save current page for hot reload recovery
  currentPage = samplePath;
  sessionStorage.setItem('currentPage', samplePath);

  // Add current state to history
  navigationHistory.push({ type: 'sample', sample, path: samplePath });
  saveNavigationHistory();
  updateBackButton();

  loadPage(samplePath);
}

export function showHome() {
  // Clear current page and history when going home
  currentPage = null;
  sessionStorage.removeItem('currentPage');
  navigationHistory.length = 0;
  saveNavigationHistory();
  updateBackButton();

  loadPage('samples/home-page.html');
}

// Function to restore page after hot reload
export function restorePageOrShowHome() {
  const savedPage = sessionStorage.getItem('currentPage');
  if (savedPage) {
    updateBackButton();
    loadPage(savedPage);
  } else {
    showHome();
  }
}

// Function to navigate back to home
export function goHome() {
  showHome();
}

// Function to navigate back in history
export function goBack() {
  if (navigationHistory.length === 0) return;

  // Remove current page from history
  navigationHistory.pop();
  saveNavigationHistory();

  if (navigationHistory.length === 0) {
    // No more history, go to home
    loadPage('samples/home-page.html');
  } else {
    // Go to previous page
    const previousPage = navigationHistory[navigationHistory.length - 1];
    loadPage(previousPage.path);
  }

  updateBackButton();
}

// Function to update back button visibility
function updateBackButton() {
  const titlebar = document.querySelector('custom-titlebar');
  if (titlebar && titlebar.updateBackButton) {
    titlebar.updateBackButton(navigationHistory.length > 0);
  }
}