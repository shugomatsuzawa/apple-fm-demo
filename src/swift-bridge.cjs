const { EventEmitter } = require('node:events');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

class SwiftBridge extends EventEmitter {
  constructor({ packagePath }) {
    super();
    this.packagePath = packagePath;
    this.proc = null;
    this.requestId = 0;
    this.pending = new Map();
    this.buffer = '';
    this.startPromise = null;
  }

  async ensureStarted() {
    if (this.proc) {
      return;
    }

    if (!this.startPromise) {
      this.startPromise = new Promise((resolve, reject) => {
        const builtExecutable = path.join(this.packagePath, '.build', 'debug', 'FoundationModelsBridge');
        const useBuiltExecutable = fs.existsSync(builtExecutable) && !process.env.APPLE_FM_SWIFT_COMMAND;
        const executable = process.env.APPLE_FM_SWIFT_COMMAND || (useBuiltExecutable ? builtExecutable : 'swift');
        const args = process.env.APPLE_FM_SWIFT_COMMAND
          ? process.env.APPLE_FM_SWIFT_ARGS?.split(' ').filter(Boolean) || []
          : useBuiltExecutable
            ? []
            : ['run', '--package-path', this.packagePath, 'FoundationModelsBridge'];

        this.proc = spawn(executable, args, {
          cwd: path.dirname(this.packagePath),
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        this.proc.stdout.setEncoding('utf8');
        this.proc.stdout.on('data', (chunk) => this.handleStdout(chunk));

        this.proc.stderr.setEncoding('utf8');
        this.proc.stderr.on('data', (chunk) => {
          this.emit('status', {
            phase: 'swift-stderr',
            message: chunk.trim(),
          });
        });

        this.proc.on('error', (error) => {
          this.emit('error', { message: error.message });
          reject(error);
        });

        this.proc.on('exit', (code, signal) => {
          const error = new Error(`Swift sidecar exited (code=${code}, signal=${signal})`);
          for (const { reject } of this.pending.values()) {
            reject(error);
          }
          this.pending.clear();
          this.proc = null;
          this.startPromise = null;
          this.emit('status', {
            phase: 'stopped',
            message: error.message,
          });
        });

        const timeout = setTimeout(() => {
          reject(new Error('Timed out waiting for Swift sidecar to become ready.'));
        }, 15000);

        this.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }

    return this.startPromise;
  }

  handleStdout(chunk) {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      let message;
      try {
        message = JSON.parse(line);
      } catch (error) {
        this.emit('error', { message: `Invalid JSON from Swift sidecar: ${line}` });
        continue;
      }

      if (message.type === 'ready') {
        this.emit('ready');
        this.emit('status', { phase: 'ready', message: 'Swift sidecar is ready.' });
        continue;
      }

      if (message.type === 'event') {
        this.emit('response', message.payload);
        continue;
      }

      if (message.type === 'result' || message.type === 'error') {
        const pending = this.pending.get(message.id);
        if (!pending) {
          continue;
        }

        this.pending.delete(message.id);

        if (message.type === 'error') {
          pending.reject(new Error(message.error?.message || 'Swift sidecar error'));
        } else {
          pending.resolve(message.payload);
        }
      }
    }
  }

  async send(command, payload = {}) {
    await this.ensureStarted();

    const id = ++this.requestId;
    const message = JSON.stringify({ id, command, payload });

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.proc.stdin.write(`${message}\n`, (error) => {
        if (error) {
          this.pending.delete(id);
          reject(error);
        }
      });
    });
  }

  async checkAvailability() {
    return this.send('checkAvailability');
  }

  async generate(payload) {
    return this.send('generate', payload);
  }

  async cancel() {
    return this.send('cancel');
  }

  async dispose() {
    if (!this.proc) {
      return;
    }

    this.proc.kill();
    this.proc = null;
    this.startPromise = null;
  }
}

module.exports = { SwiftBridge };
