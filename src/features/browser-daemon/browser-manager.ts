/**
 * Browser lifecycle manager
 *
 * Chromium crash handling:
 *   browser.on('disconnected') → log error → process.exit(1)
 *   CLI detects dead server → auto-restarts on next command
 *   We do NOT try to self-heal — don't hide failure.
 *
 * Dialog handling:
 *   page.on('dialog') → auto-accept by default → store in dialog buffer
 *   Prevents browser lockup from alert/confirm/prompt
 *
 * Context recreation (useragent):
 *   recreateContext() saves cookies/storage/URLs, creates new context,
 *   restores state. Falls back to clean slate on any failure.
 */

import {
  chromium,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type Cookie,
  type Locator,
  type Page,
} from 'playwright';
import {
  addConsoleEntry,
  addDialogEntry,
  addNetworkEntry,
  networkBuffer,
  type DialogEntry,
} from './buffers.ts';
import { log } from '../../shared/logger.ts';

export interface RefEntry {
  locator: Locator;
  role: string;
  name: string;
}

export interface BrowserState {
  cookies: Cookie[];
  pages: Array<{
    url: string;
    isActive: boolean;
    storage: {
      localStorage: Record<string, string>;
      sessionStorage: Record<string, string>;
    } | null;
  }>;
}

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private pages: Map<number, Page> = new Map();
  private activeTabId: number = 0;
  private nextTabId: number = 1;
  private extraHeaders: Record<string, string> = {};
  private customUserAgent: string | null = null;

  /** Server port — set after server starts, used by cookie-import-browser command */
  public serverPort: number = 0;

  // ─── Ref Map (snapshot → @e1, @e2, @c1, @c2, ...) ────────
  private refMap: Map<string, RefEntry> = new Map();

  // ─── Snapshot Diffing ─────────────────────────────────────
  // NOT cleared on navigation — it's a text baseline for diffing
  private lastSnapshot: string | null = null;

  // ─── Dialog Handling ──────────────────────────────────────
  private dialogAutoAccept: boolean = true;
  private dialogPromptText: string | null = null;

  // ─── Handoff State ─────────────────────────────────────────
  private isHeaded: boolean = false;
  private consecutiveFailures: number = 0;

  async launch(): Promise<void> {
    this.browser = await chromium.launch({ headless: true });

    this.browser.on('disconnected', () => {
      log('[browse] FATAL: Chromium process crashed or was killed. Server exiting.');
      log('[browse] Console/network logs flushed to .gstack/browser/*.log');
      process.exit(1);
    });

    const contextOptions: BrowserContextOptions = {
      viewport: { width: 1280, height: 720 },
    };
    if (this.customUserAgent) {
      contextOptions.userAgent = this.customUserAgent;
    }
    this.context = await this.browser.newContext(contextOptions);

    if (Object.keys(this.extraHeaders).length > 0) {
      await this.context.setExtraHTTPHeaders(this.extraHeaders);
    }

    await this.newTab();
  }

  async close(): Promise<void> {
    if (this.browser) {
      this.browser.removeAllListeners('disconnected');
      await Promise.race([
        this.browser.close(),
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ]).catch((err: unknown) => {
        log('[browse] cleanup: browser close failed (may already be disconnected)', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
      this.browser = null;
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.browser || !this.browser.isConnected()) return false;
    try {
      const page = this.pages.get(this.activeTabId);
      if (!page) return true;
      await Promise.race([
        page.evaluate('1'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  // ─── Tab Management ────────────────────────────────────────
  async newTab(url?: string): Promise<number> {
    if (!this.context) throw new Error('Browser not launched');

    const page = await this.context.newPage();
    const id = this.nextTabId++;
    this.pages.set(id, page);
    this.activeTabId = id;
    this.wirePageEvents(page);

    if (url) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    }

    return id;
  }

  async closeTab(id?: number): Promise<void> {
    const tabId = id ?? this.activeTabId;
    const page = this.pages.get(tabId);
    if (!page) throw new Error(`Tab ${tabId} not found`);

    await page.close();
    this.pages.delete(tabId);

    if (tabId === this.activeTabId) {
      const remaining = [...this.pages.keys()];
      if (remaining.length > 0) {
        this.activeTabId = remaining[remaining.length - 1];
      } else {
        await this.newTab();
      }
    }
  }

  switchTab(id: number): void {
    if (!this.pages.has(id)) throw new Error(`Tab ${id} not found`);
    this.activeTabId = id;
  }

  getTabCount(): number {
    return this.pages.size;
  }

  async getTabListWithTitles(): Promise<
    Array<{ id: number; url: string; title: string; active: boolean }>
  > {
    const tabs: Array<{ id: number; url: string; title: string; active: boolean }> = [];
    for (const [id, page] of this.pages) {
      tabs.push({
        id,
        url: page.url(),
        title: await page.title().catch(() => ''),
        active: id === this.activeTabId,
      });
    }
    return tabs;
  }

  // ─── Page Access ───────────────────────────────────────────
  getPage(): Page {
    const page = this.pages.get(this.activeTabId);
    if (!page) throw new Error('No active page. Use "browse goto <url>" first.');
    return page;
  }

  getCurrentUrl(): string {
    try {
      return this.getPage().url();
    } catch {
      return 'about:blank';
    }
  }

  // ─── Ref Map ──────────────────────────────────────────────
  setRefMap(refs: Map<string, RefEntry>): void {
    this.refMap = refs;
  }

  clearRefs(): void {
    this.refMap.clear();
  }

  /**
   * Resolve a selector that may be a @ref (e.g., "@e3", "@c1") or a CSS selector.
   * Returns { locator } for refs or { selector } for CSS selectors.
   */
  async resolveRef(selector: string): Promise<{ locator: Locator } | { selector: string }> {
    if (selector.startsWith('@e') || selector.startsWith('@c')) {
      const ref = selector.slice(1); // "e3" or "c1"
      const entry = this.refMap.get(ref);
      if (!entry) {
        throw new Error(`Ref ${selector} not found. Run 'snapshot' to get fresh refs.`);
      }
      const count = await entry.locator.count();
      if (count === 0) {
        throw new Error(
          `Ref ${selector} (${entry.role} "${entry.name}") is stale — element no longer exists. ` +
            `Run 'snapshot' for fresh refs.`
        );
      }
      return { locator: entry.locator };
    }
    return { selector };
  }

  /** Get the ARIA role for a ref selector, or null for CSS selectors / unknown refs. */
  getRefRole(selector: string): string | null {
    if (selector.startsWith('@e') || selector.startsWith('@c')) {
      const entry = this.refMap.get(selector.slice(1));
      return entry?.role ?? null;
    }
    return null;
  }

  getRefCount(): number {
    return this.refMap.size;
  }

  // ─── Snapshot Diffing ─────────────────────────────────────
  setLastSnapshot(text: string | null): void {
    this.lastSnapshot = text;
  }

  getLastSnapshot(): string | null {
    return this.lastSnapshot;
  }

  // ─── Dialog Control ───────────────────────────────────────
  setDialogAutoAccept(accept: boolean): void {
    this.dialogAutoAccept = accept;
  }

  getDialogAutoAccept(): boolean {
    return this.dialogAutoAccept;
  }

  setDialogPromptText(text: string | null): void {
    this.dialogPromptText = text;
  }

  getDialogPromptText(): string | null {
    return this.dialogPromptText;
  }

  // ─── Viewport ──────────────────────────────────────────────
  async setViewport(width: number, height: number): Promise<void> {
    await this.getPage().setViewportSize({ width, height });
  }

  // ─── Extra Headers ─────────────────────────────────────────
  async setExtraHeader(name: string, value: string): Promise<void> {
    this.extraHeaders[name] = value;
    if (this.context) {
      await this.context.setExtraHTTPHeaders(this.extraHeaders);
    }
  }

  // ─── User Agent ────────────────────────────────────────────
  setUserAgent(ua: string): void {
    this.customUserAgent = ua;
  }

  getUserAgent(): string | null {
    return this.customUserAgent;
  }

  // ─── State Save/Restore (shared by recreateContext + handoff) ─
  async saveState(): Promise<BrowserState> {
    if (!this.context) throw new Error('Browser not launched');

    const cookies = await this.context.cookies();
    const pages: BrowserState['pages'] = [];

    for (const [id, page] of this.pages) {
      const url = page.url();
      let storage: {
        localStorage: Record<string, string>;
        sessionStorage: Record<string, string>;
      } | null = null;
      try {
        storage = await page.evaluate(() => ({
          localStorage: { ...localStorage } as Record<string, string>,
          sessionStorage: { ...sessionStorage } as Record<string, string>,
        }));
      } catch {
        // Storage unavailable for this page (e.g., about:blank)
      }
      pages.push({
        url: url === 'about:blank' ? '' : url,
        isActive: id === this.activeTabId,
        storage,
      });
    }

    return { cookies, pages };
  }

  async restoreState(state: BrowserState): Promise<void> {
    if (!this.context) throw new Error('Browser not launched');

    if (state.cookies.length > 0) {
      await this.context.addCookies(state.cookies);
    }

    let activeId: number | null = null;
    for (const saved of state.pages) {
      const page = await this.context.newPage();
      const id = this.nextTabId++;
      this.pages.set(id, page);
      this.wirePageEvents(page);

      if (saved.url) {
        await page
          .goto(saved.url, { waitUntil: 'domcontentloaded', timeout: 15000 })
          .catch((err: unknown) => {
            log('[browse] restore: navigation failed during state restore', {
              url: saved.url,
              error: err instanceof Error ? err.message : String(err),
            });
          });
      }

      if (saved.storage) {
        try {
          await page.evaluate(
            (s: {
              localStorage: Record<string, string>;
              sessionStorage: Record<string, string>;
            }) => {
              if (s.localStorage) {
                for (const [k, v] of Object.entries(s.localStorage)) {
                  localStorage.setItem(k, v);
                }
              }
              if (s.sessionStorage) {
                for (const [k, v] of Object.entries(s.sessionStorage)) {
                  sessionStorage.setItem(k, v);
                }
              }
            },
            saved.storage
          );
        } catch {
          // Storage restore failed for this page — continue
        }
      }

      if (saved.isActive) activeId = id;
    }

    if (this.pages.size === 0) {
      await this.newTab();
    } else {
      this.activeTabId = activeId ?? [...this.pages.keys()][0];
    }

    this.clearRefs();
  }

  async recreateContext(): Promise<string | null> {
    if (!this.browser || !this.context) {
      throw new Error('Browser not launched');
    }

    try {
      const state = await this.saveState();

      for (const page of this.pages.values()) {
        await page.close().catch((err: unknown) => {
          log('[browse] cleanup: page close failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }
      this.pages.clear();
      await this.context.close().catch((err: unknown) => {
        log('[browse] cleanup: context close failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      });

      const contextOptions: BrowserContextOptions = {
        viewport: { width: 1280, height: 720 },
      };
      if (this.customUserAgent) {
        contextOptions.userAgent = this.customUserAgent;
      }
      this.context = await this.browser.newContext(contextOptions);

      if (Object.keys(this.extraHeaders).length > 0) {
        await this.context.setExtraHTTPHeaders(this.extraHeaders);
      }

      await this.restoreState(state);

      return null;
    } catch (err: unknown) {
      try {
        this.pages.clear();
        if (this.context)
          await this.context.close().catch((err: unknown) => {
            log('[browse] cleanup: context close failed during fallback', {
              error: err instanceof Error ? err.message : String(err),
            });
          });

        const contextOptions: BrowserContextOptions = {
          viewport: { width: 1280, height: 720 },
        };
        if (this.customUserAgent) {
          contextOptions.userAgent = this.customUserAgent;
        }
        this.context = await this.browser!.newContext(contextOptions);
        await this.newTab();
        this.clearRefs();
      } catch {
        // If even the fallback fails, browser is still alive
      }
      return `Context recreation failed: ${err instanceof Error ? err.message : String(err)}. Browser reset to blank tab.`;
    }
  }

  // ─── Handoff: Headless → Headed ─────────────────────────────
  async handoff(message: string): Promise<string> {
    if (this.isHeaded) {
      return `HANDOFF: Already in headed mode at ${this.getCurrentUrl()}`;
    }
    if (!this.browser || !this.context) {
      throw new Error('Browser not launched');
    }

    const state = await this.saveState();
    const currentUrl = this.getCurrentUrl();

    let newBrowser: Browser;
    try {
      newBrowser = await chromium.launch({ headless: false, timeout: 15000 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return `ERROR: Cannot open headed browser — ${msg}. Headless browser still running.`;
    }

    try {
      const contextOptions: BrowserContextOptions = {
        viewport: { width: 1280, height: 720 },
      };
      if (this.customUserAgent) {
        contextOptions.userAgent = this.customUserAgent;
      }
      const newContext = await newBrowser.newContext(contextOptions);

      if (Object.keys(this.extraHeaders).length > 0) {
        await newContext.setExtraHTTPHeaders(this.extraHeaders);
      }

      const oldBrowser = this.browser;

      this.browser = newBrowser;
      this.context = newContext;
      this.pages.clear();

      this.browser.on('disconnected', () => {
        log('[browse] FATAL: Chromium process crashed or was killed. Server exiting.');
        log('[browse] Console/network logs flushed to .gstack/browser/*.log');
        process.exit(1);
      });

      await this.restoreState(state);
      this.isHeaded = true;

      oldBrowser.removeAllListeners('disconnected');
      oldBrowser.close().catch((err: unknown) => {
        log('[browse] cleanup: old headless browser close failed during handoff', {
          error: err instanceof Error ? err.message : String(err),
        });
      });

      return [
        `HANDOFF: Browser opened at ${currentUrl}`,
        `MESSAGE: ${message}`,
        `STATUS: Waiting for user. Run 'resume' when done.`,
      ].join('\n');
    } catch (err: unknown) {
      await newBrowser.close().catch((err: unknown) => {
        log('[browse] cleanup: new headed browser close failed after handoff error', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
      const msg = err instanceof Error ? err.message : String(err);
      return `ERROR: Handoff failed during state restore — ${msg}. Headless browser still running.`;
    }
  }

  resume(): void {
    this.clearRefs();
    this.resetFailures();
  }

  getIsHeaded(): boolean {
    return this.isHeaded;
  }

  // ─── Auto-handoff Hint ───────────────────────────────────
  incrementFailures(): void {
    this.consecutiveFailures++;
  }

  resetFailures(): void {
    this.consecutiveFailures = 0;
  }

  getFailureHint(): string | null {
    if (this.consecutiveFailures >= 3 && !this.isHeaded) {
      return `HINT: ${this.consecutiveFailures} consecutive failures. Consider using 'handoff' to let the user help.`;
    }
    return null;
  }

  private wirePageEvents(page: Page): void {
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        this.clearRefs();
      }
    });

    page.on('dialog', async (dialog) => {
      const entry: DialogEntry = {
        timestamp: Date.now(),
        type: dialog.type(),
        message: dialog.message(),
        defaultValue: dialog.defaultValue() || undefined,
        action: this.dialogAutoAccept ? 'accepted' : 'dismissed',
        response: this.dialogAutoAccept ? (this.dialogPromptText ?? undefined) : undefined,
      };
      addDialogEntry(entry);

      try {
        if (this.dialogAutoAccept) {
          await dialog.accept(this.dialogPromptText ?? undefined);
        } else {
          await dialog.dismiss();
        }
      } catch {
        return;
      }
    });

    page.on('console', (msg) => {
      addConsoleEntry({
        timestamp: Date.now(),
        level: msg.type(),
        text: msg.text(),
      });
    });

    page.on('request', (req) => {
      addNetworkEntry({
        timestamp: Date.now(),
        method: req.method(),
        url: req.url(),
      });
    });

    page.on('response', (res) => {
      const url = res.url();
      const status = res.status();
      for (let i = networkBuffer.length - 1; i >= 0; i--) {
        const entry = networkBuffer.get(i);
        if (entry && entry.url === url && !entry.status) {
          networkBuffer.set(i, { ...entry, status, duration: Date.now() - entry.timestamp });
          break;
        }
      }
    });

    page.on('requestfinished', async (req) => {
      try {
        const res = await req.response();
        if (!res) return;
        const url = req.url();
        const body = await res.body().catch(() => null);
        const size = body ? body.length : 0;

        for (let i = networkBuffer.length - 1; i >= 0; i--) {
          const entry = networkBuffer.get(i);
          if (entry && entry.url === url && !entry.size) {
            networkBuffer.set(i, { ...entry, size });
            break;
          }
        }
      } catch {
        return;
      }
    });
  }
}
