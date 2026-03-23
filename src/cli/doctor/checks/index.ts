import { configChecks } from './config.ts';
import { mcpChecks } from './mcp.ts';
import { systemChecks } from './system.ts';
import { toolChecks } from './tools.ts';

export const doctorChecks = [...systemChecks, ...configChecks, ...toolChecks, ...mcpChecks];
