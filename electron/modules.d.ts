declare module 'archiver' {
  import type { Transform } from 'stream';

  interface Archiver extends Transform {
    directory(dirpath: string, destpath: string | false): this;
    file(filepath: string, data: { name: string }): this;
    finalize(): Promise<void>;
  }

  function archiver(format: 'zip', options?: { zlib?: { level?: number } }): Archiver;

  export = archiver;
}
