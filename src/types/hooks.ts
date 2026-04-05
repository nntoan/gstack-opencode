export type HookEventName =
  | 'tool.execute.before'
  | 'tool.execute.after'
  | 'system.transform'
  | 'chat.message';

export interface ToolExecuteBeforeInput {
  tool: string;
  sessionID: string;
  callID: string;
}

export interface ToolExecuteBeforeOutput {
  args: unknown;
}

export interface ToolExecuteAfterInput {
  tool: string;
  sessionID: string;
  callID: string;
  args: unknown;
}

export interface ToolExecuteAfterOutput {
  title: string;
  output: string;
  metadata: unknown;
}

export interface SystemTransformInput {
  sessionID?: string;
}

export interface SystemTransformOutput {
  system: string[];
}

export interface ChatMessageInput {
  sessionID: string;
  text?: string;
}

export interface ChatMessageOutput {
  parts: unknown[];
}

export type HookHandler<I, O> = (input: I, output: O) => Promise<void>;

export interface HookDefinition {
  name: string;
  event: HookEventName;
  toolFilter?: string | string[];
  handler: HookHandler<unknown, unknown>;
}

export interface HookRegistry {
  register(hook: HookDefinition): void;
  dispatch(event: HookEventName, input: unknown, output: unknown): Promise<void>;
  getHandlerCount(event: HookEventName): number;
}
