import * as fs from 'fs';
import * as path from 'path';

import archiver from 'archiver';
import extract from 'extract-zip';

export interface BackupEntry {
  name: string;
  size: number;
  /** Creation time, ms since epoch. */
  createdAt: number;
}

export interface BackupResult {
  ok: boolean;
  backups?: BackupEntry[];
  error?: string;
}

const BACKUPS_DIR = 'backups';

export const backupsDirOf = (gameDir: string): string => path.join(gameDir, BACKUPS_DIR);

const two = (value: number): string => String(value).padStart(2, '0');

const timestamp = (date: Date): string =>
  `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}_${two(date.getHours())}-${two(date.getMinutes())}-${two(date.getSeconds())}`;

/** Newest first. */
export const listBackups = async (gameDir: string): Promise<BackupEntry[]> => {
  let names: string[];

  try {
    names = await fs.promises.readdir(backupsDirOf(gameDir));
  } catch {
    return [];
  }

  const entries = await Promise.all(
    names
      .filter((name) => name.toLowerCase().endsWith('.zip'))
      .map(async (name) => {
        const stat = await fs.promises.stat(path.join(backupsDirOf(gameDir), name));

        return { name, size: stat.size, createdAt: stat.mtimeMs };
      }),
  );

  return entries.sort((a, b) => b.createdAt - a.createdAt);
};

/** Zips the saves folder (or single file) into `<game>/backups/<prefix>_<timestamp>.zip`. */
export const createBackup = async (gameDir: string, savesAbs: string, prefix = 'saves'): Promise<string> => {
  const stat = await fs.promises.stat(savesAbs);
  const dir = backupsDirOf(gameDir);
  await fs.promises.mkdir(dir, { recursive: true });

  const name = `${prefix}_${timestamp(new Date())}.zip`;
  const output = fs.createWriteStream(path.join(dir, name));
  const archive = archiver('zip', { zlib: { level: 6 } });

  const finished = new Promise<void>((resolve, reject) => {
    output.once('close', resolve);
    output.once('error', reject);
    archive.once('error', reject);
  });

  archive.pipe(output);

  if (stat.isDirectory()) {
    archive.directory(savesAbs, false);
  } else {
    archive.file(savesAbs, { name: path.basename(savesAbs) });
  }

  await archive.finalize();
  await finished;

  return name;
};

/** Backup file names come from the renderer — only accept plain `*.zip` names inside the backups folder. */
export const resolveBackup = (gameDir: string, name: unknown): string | null => {
  if (typeof name !== 'string' || name !== path.basename(name) || !name.toLowerCase().endsWith('.zip')) {
    return null;
  }

  return path.join(backupsDirOf(gameDir), name);
};

/** Unpacks a backup over the saves folder; files that aren't in the backup are left alone. */
export const restoreBackup = async (zipPath: string, savesAbs: string): Promise<void> => {
  const target = (await fs.promises.stat(savesAbs)).isDirectory() ? savesAbs : path.dirname(savesAbs);

  await extract(zipPath, { dir: target });
};
