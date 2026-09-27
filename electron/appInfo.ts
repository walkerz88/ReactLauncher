import * as fs from 'fs';
import * as path from 'path';

import { app } from 'electron';

const pkg: { name: string } = JSON.parse(
  fs.readFileSync(path.join(app.getAppPath(), 'package.json'), 'utf8'),
);

/** Name of the env var that overrides the content dir: `<PACKAGE_NAME>_CONTENT_DIR`. */
export const contentDirEnvName = (): string =>
  `${pkg.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_CONTENT_DIR`;
