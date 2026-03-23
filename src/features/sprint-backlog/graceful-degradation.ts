import { log } from '../../shared/logger.ts';

export async function withBacklogFallback<T>(
  operation: () => Promise<T>,
  fallback: T,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    log(`[WARN] Backlog MCP operation failed: ${context}`, { reason });
    return fallback;
  }
}
