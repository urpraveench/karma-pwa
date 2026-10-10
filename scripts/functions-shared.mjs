// Copies the app's backlog rules into functions/src/shared/ (see scripts/shared-code.ts): `npm run functions:shared`.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { forFunctions, SHARED } from './shared-code.ts';

const root = new URL('..', import.meta.url);
mkdirSync(new URL('functions/src/shared/', root), { recursive: true });
for (const name of SHARED)
  writeFileSync(new URL(`functions/src/shared/${name}.ts`, root), forFunctions(name, readFileSync(new URL(`src/lib/${name}.ts`, root), 'utf8')));
console.log(`wrote functions/src/shared/: ${SHARED.join(', ')}`);
