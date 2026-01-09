// github-markdown-render.js
// Usage: import { renderGithubMarkdownDoc } from './github-markdown-render.js';
// renderGithubMarkdownDoc(containerId, markdownUrl, [startHeaderRegex])

/**
 * Fetches and renders markdown from a URL into a container, with GitHub-like styles and [!IMPORTANT] handling.
 * @param {string} containerId - The id of the container element to render into.
 * @param {string} markdownUrl - The URL to fetch the markdown from.
 * @param {RegExp} [startHeaderRegex] - Optional regex to find the header to start rendering from.
 */
export function renderGithubMarkdownDoc(containerId, markdownUrl, startHeaderRegex) {
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
      } else {
        docContainer.textContent = 'Markdown parser not loaded.';
      }
    })
    .catch((err) => {
      docContainer.textContent = 'Failed to load documentation.';
    });
}
