export type BrowseConfig = {
  projectDir: string;
  stateDir: string;
  stateFile: string;
  consoleLog: string;
  networkLog: string;
  dialogLog: string;
};

export type ServerState = {
  pid: number;
  port: number;
  token: string;
  startedAt: string;
  serverPath: string;
  binaryVersion?: string;
};

export type HealthResponse = {
  status: 'healthy' | 'unhealthy';
  uptime: number;
  pageCount: number;
};

export type CommandRequest = {
  command: string;
  args: string[];
};

export type CommandResponse = {
  ok: boolean;
  data?: string;
  error?: string;
  hint?: string;
};
