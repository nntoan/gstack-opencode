const LOG_FILE = '/tmp/gstack.log';

let buffer: string[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL_MS = 500;
const BUFFER_SIZE_LIMIT = 50;

function flush(): void {
  if (buffer.length === 0) return;
  const data = buffer.join('');
  buffer = [];
  try {
    const file = Bun.file(LOG_FILE);
    Bun.write(file, data);
  } catch {
    // Silent fail on write errors
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
}

export function log(message: string, data?: unknown): void {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [GSTACK] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
    buffer.push(logEntry);
    if (buffer.length >= BUFFER_SIZE_LIMIT) {
      flush();
    } else {
      scheduleFlush();
    }
  } catch {
    // Silent fail
  }
}

export function getLogFilePath(): string {
  return LOG_FILE;
}
