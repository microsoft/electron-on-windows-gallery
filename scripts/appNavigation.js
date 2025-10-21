// appNavigation.js
// Centralized navigation logic for Electron Gallery

export function openSample(sample) {
  console.log(`Opening ${sample} sample`);

  // Helper to resolve sample file path relative to current location
  function resolveSamplePath(filename) {
    // If already in /samples/, just use the filename
    if (window.location.pathname.includes('/samples/')) {
      return filename;
    }
    // If in root or elsewhere, prefix with samples/
    return 'samples/' + filename;
  }

  // Navigate to specific sample pages
  if (sample === 'App Actions') {
    window.location.href = resolveSamplePath('app-actions.html');
    return;
  }

  if (sample === 'WinAppSDK') {
    window.location.href = resolveSamplePath('winappsdk.html');
    return;
  }

  if (sample === 'Phi Silica Text Generation' || sample === 'Text Generation') {
    window.location.href = resolveSamplePath('phi-silica-text-generation.html');
    return;
  }

  if (sample === 'Phi Silica Text Summarization' || sample === 'Text Summarization') {
    window.location.href = resolveSamplePath('phi-silica-text-summarization.html');
    return;
  }

  if (sample === 'Phi Silica Rewrite Text' || sample === 'Text Rewrite') {
    window.location.href = resolveSamplePath('phi-silica-rewrite-text.html');
    return;
  }

  // Navigate to OCR sample page
  if (sample === 'Optical Character Recognition (OCR)' || sample === 'OCR') {
    window.location.href = resolveSamplePath('ocr.html');
    return;
  }

  // Navigate to Image Description sample page
  if (sample === 'Image Description') {
    window.location.href = resolveSamplePath('img-description.html');
    return;
  }

  document.dispatchEvent(new CustomEvent('fluent-sample-open', {
    detail: { sample: sample }
  }));
}