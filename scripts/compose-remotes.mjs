import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const remotes = [
  {
    nom: 'cv',
    source: 'apps/cv/dist/cv/browser',
    destination: 'apps/web/dist/web/browser/remotes/cv',
  },
];

for (const remote of remotes) {
  const source = resolve(racine, remote.source);
  const destination = resolve(racine, remote.destination);

  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  await cp(source, destination, { recursive: true });

  console.log(`[latelier] remote ${remote.nom} -> ${remote.destination}`);
}
