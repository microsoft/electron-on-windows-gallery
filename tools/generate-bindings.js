import { execFileSync } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Configuration — override via environment variables
const AI_VERSION = process.env.AI_SDK_VERSION || '1.8.39';
const NUGET_CACHE = process.env.NUGET_PACKAGES || path.join(os.homedir(), '.nuget', 'packages');
const OUTPUT_DIR = './generated-js';

const AI_META = path.join(NUGET_CACHE, 'microsoft.windowsappsdk.ai', AI_VERSION, 'metadata');

// Verify metadata exists
if (!fs.existsSync(AI_META)) {
  console.error(`AI metadata not found at: ${AI_META}`);
  console.error(`Run 'npx winapp restore' first, or set AI_SDK_VERSION / NUGET_PACKAGES env vars.`);
  process.exit(1);
}

const WINRT_META = process.env.WINRT_META || 'npx winrt-meta';

const run = (args) => {
  const cmd = `${WINRT_META} ${args.join(' ')}`;
  console.log(`> ${cmd}`);
  execFileSync(WINRT_META.split(' ')[0], [...WINRT_META.split(' ').slice(1), ...args], { stdio: 'inherit', shell: true });
};

// Clean and recreate output directory
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// 1. Generate JS bindings from AI metadata
run(['generate', '--folder', AI_META, '--output', OUTPUT_DIR, '--lang', 'js']);

// 2. Generate Windows SDK system types
const systemTypes = [
  { namespace: 'Windows.ApplicationModel', className: 'LimitedAccessFeatures' },
  { namespace: 'Windows.Storage', className: 'StorageFile' },
  { namespace: 'Windows.Graphics.Imaging', className: 'BitmapDecoder' },
  { namespace: 'Windows.Graphics.Imaging', className: 'BitmapEncoder' },
];

for (const { namespace, className } of systemTypes) {
  run(['generate', '--namespace', namespace, '--class-name', className, '--output', OUTPUT_DIR, '--lang', 'js']);
}

console.log('\nDone. Generated bindings in', OUTPUT_DIR);
