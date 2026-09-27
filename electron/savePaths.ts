import * as os from 'os';
import * as path from 'path';

import { app } from 'electron';

const tokens = (): Record<string, string | undefined> => ({
  DOCUMENTS: app.getPath('documents'),
  APPDATA: app.getPath('appData'),
  LOCALAPPDATA: process.env.LOCALAPPDATA,
  USERPROFILE: os.homedir(),
});

/** Expands `%DOCUMENTS%`, `%APPDATA%`, `%LOCALAPPDATA%`, `%USERPROFILE%` and any other `%ENV_VAR%`. */
export const expandPathTokens = (value: string): string => {
  const known = tokens();

  return value.replace(/%([^%]+)%/g, (whole, name: string) => known[name.toUpperCase()] ?? process.env[name] ?? whole);
};

/**
 * Turns an absolute path into a portable one (`%DOCUMENTS%/My Games/Skyrim`), so a config
 * copied to another PC or user profile still resolves. Paths outside those roots stay absolute.
 */
export const toPortablePath = (absolute: string): string => {
  const normalized = path.normalize(absolute);
  const match = Object.entries(tokens())
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([name, root]) => ({ name, root: path.normalize(root) }))
    .filter(({ root }) => normalized.toLowerCase() === root.toLowerCase() || normalized.toLowerCase().startsWith(root.toLowerCase() + path.sep))
    .sort((a, b) => b.root.length - a.root.length)[0];

  if (!match) {
    return normalized.split(path.sep).join('/');
  }

  return `%${match.name}%${normalized.slice(match.root.length).split(path.sep).join('/')}`;
};
