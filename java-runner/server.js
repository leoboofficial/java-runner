const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Lightweight zero-dependency async queue (concurrency: 1)
// Essential for staying within 512MB RAM free tier limits on Render/Cloud hosts
class SimpleQueue {
  constructor(concurrency = 1) {
    this.concurrency = concurrency;
    this.active = 0;
    this.queue = [];
  }

  add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.next();
    });
  }

  next() {
    if (this.active >= this.concurrency || this.queue.length === 0) return;
    this.active++;
    const { fn, resolve, reject } = this.queue.shift();
    Promise.resolve()
      .then(fn)
      .then(resolve, reject)
      .finally(() => {
        this.active--;
        this.next();
      });
  }
}

const executionQueue = new SimpleQueue(1);
const API_SECRET = process.env.API_SECRET || 'MY_SECURE_LAB_KEY_123';

// Render / Cloud Health Check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'JavaLabPro Execution Runner',
    jdk: 'Eclipse Temurin OpenJDK 17',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Authentication middleware for /execute
function checkAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_SECRET) {
    return res.status(403).json({ error: 'Unauthorized: Invalid API key' });
  }
  next();
}

app.post('/execute', checkAuth, async (req, res) => {
  const { code, input, expectedOutput } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'No Java code provided' });
  }

  // Queue tasks sequentially to prevent memory exhaustion and race conditions
  executionQueue.add(async () => {
    return new Promise((resolve) => {
      const runId = Date.now() + '_' + Math.floor(Math.random() * 10000);
      const workDir = path.join('/tmp', runId);

      try {
        fs.mkdirSync(workDir, { recursive: true });

        // Match public class name or fallback to Main
        const classMatch = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
        const className = classMatch ? classMatch[1] : 'Main';
        const codePath = path.join(workDir, `${className}.java`);
        const inputPath = path.join(workDir, 'input.txt');

        fs.writeFileSync(codePath, code, 'utf-8');
        fs.writeFileSync(inputPath, input || '', 'utf-8');

        // Grant sandbox user permissions to this temporary run directory
        try {
          exec(`chown -R sandbox:sandbox ${workDir}`);
        } catch (e) {}

        // Execute inside non-root 'sandbox' user with a 5-second hard timeout
        const command = `su - sandbox -c "cd ${workDir} && javac ${className}.java && timeout 5s java ${className} < input.txt"`;

        exec(command, { timeout: 8000 }, (error, stdout, stderr) => {
          const actualOutput = (stdout || '').trim();
          const compileErr = (stderr || '').trim();

          // Clean up temp directory
          try {
            fs.rmSync(workDir, { recursive: true, force: true });
          } catch (e) {}

          if (compileErr) {
            resolve(
              res.json({
                passed: false,
                log: 'Compilation / Runtime Error:\n' + compileErr,
                actualOutput: '',
              })
            );
            return;
          }

          const expected = (expectedOutput || '').trim();
          const passed = expected.length > 0 ? actualOutput === expected : true;

          resolve(
            res.json({
              passed: passed,
              actualOutput: actualOutput,
              log: passed
                ? 'PASSED'
                : `FAILED\nExpected:\n${expected}\nGot:\n${actualOutput}`,
            })
          );
        });
      } catch (err) {
        try {
          fs.rmSync(workDir, { recursive: true, force: true });
        } catch (e) {}
        resolve(res.status(500).json({ error: 'Execution environment error: ' + err.message }));
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Java execution runner listening on port ${PORT}`);
});
