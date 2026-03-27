import path from 'path';
import os from 'os';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Determine the correct architecture
const arch = os.arch(); // Returns 'arm64', 'x64', etc.

// Map Node.js architecture names to our bin directory structure
const archMap = {
  'arm64': 'arm64',
  'x64': 'x64'
};

const targetArch = archMap[arch] || 'x64';
const addonPath = path.join(import.meta.dirname, 'bin', targetArch, 'myAddon.node');

let addon;
try {
  addon = require(addonPath);
} catch (error) {
  throw new Error(
    `Failed to load myAddon for architecture ${arch} (${targetArch}). ` +
    `Expected path: ${addonPath}. ` +
    `Error: ${error.message}`
  );
}

export default addon;
