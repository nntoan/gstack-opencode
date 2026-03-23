import * as os from 'node:os';
import * as path from 'node:path';

export const IS_WINDOWS = process.platform === 'win32';
export const TEMP_DIR = IS_WINDOWS ? os.tmpdir() : '/tmp';

export function isPathWithin(resolvedPath: string, dir: string): boolean {
  return resolvedPath === dir || resolvedPath.startsWith(dir + path.sep);
}
