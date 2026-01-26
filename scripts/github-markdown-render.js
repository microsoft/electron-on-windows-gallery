// github-markdown-render.js
// Usage: import { renderGithubMarkdownDoc } from './github-markdown-render.js';
// renderGithubMarkdownDoc(containerId, markdownUrl, [startHeaderRegex], [baseUrl], [keepMdExtension])

/**
 * Fetches and renders markdown from a URL into a container, with GitHub-like styles and [!IMPORTANT] handling.
 * @param {string} containerId - The id of the container element to render into.
 * @param {string} markdownUrl - The URL to fetch the markdown from.
 * @param {RegExp} [startHeaderRegex] - Optional regex to find the header to start rendering from.
 * @param {string} [baseUrl] - Base URL for resolving relative links. Relative links will be appended to this URL.
 * @param {boolean} [removeMdExtension=false] - If true, remove .md extension from resolved URLs; if false, keep it.
 */
export function renderGithubMarkdownDoc(containerId, markdownUrl, startHeaderRegex, baseUrl, removeMdExtension = false) {
  const docContainer = document.getElementById(containerId);
  if (!docContainer) return;
  fetch(markdownUrl)
    .then((response) =>
      response.ok ? response.text() : Promise.reject('Failed to load documentation')
    )
    .then((md) => {
      let filtered = md;
      if (startHeaderRegex) {
        const startMatch = md.match(startHeaderRegex);
        if (startMatch) {
          filtered = md.substring(md.indexOf(startMatch[1]));
        }
      }
      // Replace [!IMPORTANT] and [!NOTE] with E946 icon (info) in Fluent UI deep blue
      filtered = filtered.replace(
        /\[!(IMPORTANT|NOTE)\]/g,
        "<span style=\"font-family: 'Segoe fluent Icons', sans-serif; color: var(--color-communication-foreground); font-size: 1em; vertical-align: middle; display: inline; margin-right: 4px;\">&#xE946;</span>"
      );
      if (window.marked) {
        docContainer.innerHTML = window.marked.parse(filtered.trim());
        
        // Process all links to open externally in browser
        docContainer.querySelectorAll('a[href]').forEach(link => {
          const href = link.getAttribute('href');
          if (!href) return;
          
          let finalUrl = href;
          
          // Check if it's a relative link (doesn't start with http:// or https:// or #)
          if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('#')) {
            // Special case: /windows or /uwp links go to learn.microsoft.com
            if (href.startsWith('/windows') || href.startsWith('/uwp')) {
              finalUrl = `https://learn.microsoft.com${href}`;
            } else if (baseUrl) {
              // Resolve relative link using baseUrl
              // Remove .md extension if removeMdExtension is true
              let relativePath = (removeMdExtension && href.endsWith('.md')) ? href.slice(0, -3) : href;
              // Ensure baseUrl doesn't end with slash and relativePath handling
              const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
              finalUrl = `${cleanBaseUrl}/${relativePath}`;
            }
          }
          
          // Make all non-anchor links open in external browser
          if (!href.startsWith('#')) {
            link.addEventListener('click', (e) => {
              e.preventDefault();
              window.open(finalUrl, '_blank');
            });
          }
        });
      } else {
        docContainer.textContent = 'Markdown parser not loaded.';
      }
    })
    .catch((err) => {
      docContainer.textContent = 'Failed to load documentation.';
    });
}
