// github-markdown-render.js
// Usage: import { renderGithubMarkdownDoc } from './github-markdown-render.js';
// renderGithubMarkdownDoc(containerId, markdownUrl, [startHeaderRegex])

/**
 * Fetches and renders markdown from a URL into a container, with GitHub-like styles and [!IMPORTANT] handling.
 * @param {string} containerId - The id of the container element to render into.
 * @param {string} markdownUrl - The URL to fetch the markdown from.
 * @param {RegExp|string} [startHeaderRegex] - Optional regex to find the header to start rendering from.
 * @param {string} [docsBaseUrl] - Optional base URL for resolving relative links (e.g., https://learn.microsoft.com/windows/ai/apis/)
 * @param {boolean} [stripMdExtension] - Optional flag to strip .md extension from relative link paths (default: false)
 * @param {boolean} [useRawImageUrls] - Optional flag to convert GitHub web URLs to raw URLs for images (default: true if docsBaseUrl is a GitHub web URL)
 */
export function renderGithubMarkdownDoc(containerId, markdownUrl, startHeaderRegex, docsBaseUrl, stripMdExtension = false, useRawImageUrls = null) {
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
        
        // Make all links open in a new window
        const links = docContainer.querySelectorAll('a');
        links.forEach((link) => {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            let href = link.getAttribute('href');
            if (href) {
              // Remove leading "./" from relative paths
              if (href.startsWith('./')) {
                href = href.substring(2);
              }
              
              // Strip .md extension if requested
              if (stripMdExtension && href.endsWith('.md')) {
                href = href.replace(/\.md$/, '');
              }
              
              // Handle relative links from the markdown document
              if (docsBaseUrl) {
                if (href.startsWith('index.md')) {
                  // Replace index.md with the docs base URL
                  href = docsBaseUrl;
                } else if (!href.startsWith('http') && !href.startsWith('/')) {
                  // For other relative links, resolve them relative to the docs base URL
                  // Ensure there's a slash between docsBaseUrl and the relative path
                  const slash = docsBaseUrl.endsWith('/') ? '' : '/';
                  href = docsBaseUrl + slash + href;
                }
              }
              
              // Convert relative Microsoft Learn links to absolute URLs
              if (href.startsWith('/windows') || href.startsWith('/uwp')) {
                href = 'https://learn.microsoft.com' + href;
              }
              
              window.open(href, '_blank');
            }
          });
        });
        
        // Add copy buttons to code blocks
        const codeBlocks = docContainer.querySelectorAll('pre');
        codeBlocks.forEach((pre) => {
          const codeElement = pre.querySelector('code');
          if (codeElement) {
            // Make pre position relative for absolute positioning of copy button
            pre.style.position = 'relative';
            
            // Create copy button
            const copyBtn = document.createElement('button');
            copyBtn.innerHTML = '&#xE8C8;';
            copyBtn.style.position = 'absolute';
            copyBtn.style.top = '8px';
            copyBtn.style.right = '12px';
            copyBtn.style.fontFamily = "'Segoe Fluent Icons', sans-serif";
            copyBtn.style.fontSize = '16px';
            copyBtn.style.backgroundColor = 'transparent';
            copyBtn.style.border = 'none';
            copyBtn.style.color = 'var(--color-neutral-foreground-3)';
            copyBtn.style.cursor = 'pointer';
            copyBtn.style.padding = '4px 8px';
            copyBtn.style.borderRadius = '4px';
            copyBtn.style.transition = 'all 0.2s';
            copyBtn.style.zIndex = '10';
            
            // Hover effects
            copyBtn.addEventListener('mouseenter', () => {
              copyBtn.style.backgroundColor = 'var(--color-neutral-background-3)';
              copyBtn.style.color = 'var(--color-neutral-foreground-1)';
            });
            
            copyBtn.addEventListener('mouseleave', () => {
              copyBtn.style.backgroundColor = 'transparent';
              copyBtn.style.color = 'var(--color-neutral-foreground-3)';
            });
            
            // Press/Active state effects
            copyBtn.addEventListener('pointerdown', () => {
              copyBtn.style.color = 'var(--color-communication-foreground)';
            });
            
            copyBtn.addEventListener('pointerup', () => {
              // Return to hover state if mouse is still over button, otherwise return to default
              if (copyBtn.matches(':hover')) {
                copyBtn.style.color = 'var(--color-neutral-foreground-1)';
              } else {
                copyBtn.style.color = 'var(--color-neutral-foreground-3)';
              }
            });
            
            // Copy functionality
            copyBtn.addEventListener('click', () => {
              const text = codeElement.textContent;
              navigator.clipboard.writeText(text).catch(err => {
                console.error('Failed to copy:', err);
              });
            });
            
            // Append copy button directly to pre
            pre.appendChild(copyBtn);
          }
        });

        // Handle relative image paths
        if (docsBaseUrl) {
          // Convert GitHub web URL to raw URL for images if needed
          let imageBaseUrl = docsBaseUrl;
          if (useRawImageUrls !== false && docsBaseUrl.includes('github.com')) {
            imageBaseUrl = docsBaseUrl
              .replace('github.com', 'raw.githubusercontent.com')
              .replace('/blob/main/', '/refs/heads/main/');
          }
          
          const images = docContainer.querySelectorAll('img');
          images.forEach((img) => {
            let src = img.getAttribute('src');
            if (src && !src.startsWith('http') && !src.startsWith('data:')) {
              // Remove leading "./" from relative paths
              if (src.startsWith('./')) {
                src = src.substring(2);
              }
              
              // Resolve relative image path
              const slash = imageBaseUrl.endsWith('/') ? '' : '/';
              const newSrc = imageBaseUrl + slash + src;
              img.setAttribute('src', newSrc);
            }
          });
        }
      } else {
        docContainer.textContent = 'Markdown parser not loaded.';
      }
    })
    .catch((err) => {
      docContainer.textContent = 'Failed to load documentation.';
    });
}
