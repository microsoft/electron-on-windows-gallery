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
        
        // Add copy buttons to all pre elements
        docContainer.querySelectorAll('pre').forEach(pre => {
          // Create wrapper div for positioning
          const wrapper = document.createElement('div');
          wrapper.className = 'code-block-wrapper';
          pre.parentNode.insertBefore(wrapper, pre);
          wrapper.appendChild(pre);
          
          // Create copy button
          const copyBtn = document.createElement('button');
          copyBtn.className = 'code-copy-btn';
          copyBtn.innerHTML = '&#xE8C8;'; // Segoe Fluent Icons copy icon
          copyBtn.title = 'Copy to clipboard';
          copyBtn.addEventListener('click', () => {
            const code = pre.textContent;
            navigator.clipboard.writeText(code).then(() => {
              // Show checkmark briefly to indicate success
              copyBtn.innerHTML = '&#xE73E;'; // Checkmark icon
              setTimeout(() => {
                copyBtn.innerHTML = '&#xE8C8;'; // Back to copy icon
              }, 1500);
            }).catch(err => {
              console.error('Failed to copy:', err);
            });
          });
          wrapper.appendChild(copyBtn);
        });
        
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
        
        // Process all images to resolve relative paths
        // Get the base path from the markdown URL (directory containing the .md file)
        const markdownBaseUrl = markdownUrl.substring(0, markdownUrl.lastIndexOf('/') + 1);
        docContainer.querySelectorAll('img[src]').forEach(img => {
          const src = img.getAttribute('src');
          if (!src) return;
          
          // Check if it's a relative path (doesn't start with http:// or https:// or data:)
          if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
            // For GitHub raw content, we need to use the raw URL base
            // Convert relative path to absolute using the markdown file's directory
            let resolvedSrc = src;
            
            // Handle ../ relative paths
            if (src.startsWith('../') || src.startsWith('./')) {
              // Use URL constructor to properly resolve relative paths
              try {
                const resolved = new URL(src, markdownBaseUrl);
                resolvedSrc = resolved.href;
              } catch (e) {
                resolvedSrc = markdownBaseUrl + src;
              }
            } else {
              // Simple relative path
              resolvedSrc = markdownBaseUrl + src;
            }
            
            img.setAttribute('src', resolvedSrc);
          }
          
          // Add styling for responsive images
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
        });
      } else {
        docContainer.textContent = 'Markdown parser not loaded.';
      }
    })
    .catch((err) => {
      docContainer.textContent = 'Failed to load documentation.';
    });
}
