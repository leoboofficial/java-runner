import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const runnerPath = path.join(__dirname, 'java-runner', 'server.js');

if (fs.existsSync(runnerPath)) {
  require(runnerPath);
} else {
  console.log('Root server proxy active.');
}
