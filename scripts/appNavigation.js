// appNavigation.js
// Centralized navigation logic for Electron Gallery

// Navigation history stack
const navigationHistory = [];

// Map sample names to their HTML file paths
const samplePaths = {
  'WinAppSDK': 'samples/winappsdk.html',
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
  
  contentArea.innerHTML = '';
  contentArea.appendChild(iframe);
}

export function showHome() {
  const contentArea = document.getElementById('content-area');
  if (!contentArea) return;
  
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
  
  contentArea.innerHTML = '';
  contentArea.appendChild(iframe);
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
  
  const contentArea = document.getElementById('content-area');
  if (!contentArea) return;
  
  // Create and load the iframe with fade-in animation
  const iframe = document.createElement('iframe');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  
  if (navigationHistory.length === 0) {
    // No more history, go to home
    iframe.src = 'samples/home-page.html';
  } else {
    // Go to previous page
    const previousPage = navigationHistory[navigationHistory.length - 1];
    iframe.src = previousPage.path;
  }
  
  // Wait for iframe to load before showing it
  iframe.addEventListener('load', () => {
    iframe.classList.add('loaded');
  });
  
  contentArea.innerHTML = '';
  contentArea.appendChild(iframe);
  updateBackButton();
}

// Function to update back button visibility
function updateBackButton() {
  const titlebar = document.querySelector('custom-titlebar');
  if (titlebar && titlebar.updateBackButton) {
    titlebar.updateBackButton(navigationHistory.length > 0);
  }
}