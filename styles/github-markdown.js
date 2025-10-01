// github-markdown.js
// This file injects GitHub-like markdown styles for documentation sections.

const githubMarkdownStyles = `
.markdown-doc {
  font-family: 'Segoe UI', 'Segoe UI Web', Arial, sans-serif;
  color: var(--color-neutral-foreground-1);
  background: none;
  padding: 0;
  font-size: 15px;
  line-height: 1.7;
}
.markdown-doc h1,
.markdown-doc h2,
.markdown-doc h3,
.markdown-doc h4,
.markdown-doc h5,
.markdown-doc h6 {
  font-weight: 600;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  color: var(--color-neutral-foreground-1);
  line-height: 1.25;
}
.markdown-doc h1 {
  font-size: 2em;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 0.3em;
}
.markdown-doc h2 {
  font-size: 1.5em;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 0.3em;
}
.markdown-doc h3 {
  font-size: 1.25em;
}
.markdown-doc h4 {
  font-size: 1.1em;
}
.markdown-doc p {
  margin: 1em 0;
}
.markdown-doc ul,
.markdown-doc ol {
  margin: 1em 0 1em 2em;
}
.markdown-doc li {
  margin: 0.3em 0;
}
.markdown-doc code {
  background: #f6f8fa;
  color: #24292f;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.97em;
  border-radius: 4px;
  padding: 0.2em 0.4em;
}
.markdown-doc pre {
  background: #f6f8fa;
  color: #24292f;
  border-radius: 6px;
  padding: 1em;
  overflow-x: auto;
  font-size: 0.97em;
  margin: 1em 0;
}
.markdown-doc blockquote {
  border-left: 4px solid #d0d7de;
  color: #6a737d;
  padding: 0.5em 1em;
  margin: 1em 0;
  background: #f6f8fa;
}
.markdown-doc table {
  border-collapse: collapse;
  margin: 1em 0;
  width: 100%;
}
.markdown-doc th,
.markdown-doc td {
  border: 1px solid #d0d7de;
  padding: 0.5em 1em;
  text-align: left;
}
.markdown-doc th {
  background: #f6f8fa;
  font-weight: 600;
}
.markdown-doc a {
  color: var(--color-communication-foreground);
  text-decoration: underline;
}
.markdown-doc hr {
  border: none;
  border-top: 1px solid #eaecef;
  margin: 2em 0;
}
.markdown-doc img {
  max-width: 100%;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  margin: 1em 0;
}
`;

export function injectGithubMarkdownStyles() {
  if (document.getElementById('github-markdown-style')) return;
  const style = document.createElement('style');
  style.id = 'github-markdown-style';
  style.textContent = githubMarkdownStyles;
  document.head.appendChild(style);
}
