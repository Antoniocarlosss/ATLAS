import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFile(resolve(root, file), 'utf8');

const [html, script, publicScript, firebase, manifestText, serviceWorker] = await Promise.all([
  read('index.html'),
  read('script.js'),
  read('atlas-publico.js'),
  read('firebase-atlas.js'),
  read('manifest.json'),
  read('sw.js')
]);

const ids = [...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map(match => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
assert.deepEqual([...new Set(duplicates)], [], 'index.html possui IDs duplicados');

const localAssets = [...html.matchAll(/(?:src|href)\s*=\s*["']([^"'?#]+)[^"']*["']/g)]
  .map(match => match[1])
  .filter(path => !/^(?:https?:|data:|#)/.test(path));
await Promise.all(localAssets.map(path => access(resolve(root, path))));

assert.doesNotMatch(publicScript, /senha:\s*["']1234["']|password\.value[^;]*1234/);
assert.doesNotMatch(script, /senha:\s*["']123["']/);
assert.doesNotMatch(firebase, /senha:\s*["']123["']/);
assert.doesNotMatch(script, /Senha:\s*\$\{textoSeguroPermissoes\(u\.senha/);
assert.match(script, /const atual = dispositivos\[id\] \|\| \{\};/);
assert.doesNotMatch(script, /usuarioLogado\?\.id \|\| atual\.usuario/);
assert.match(html, /if \(!atlasTemRotaInterna\)/);
assert.match(serviceWorker, /event\.request\.mode === 'navigate'/);

const manifest = JSON.parse(manifestText);
assert.equal(manifest.id, './');
assert.equal(manifest.orientation, 'any');
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2);
await Promise.all(manifest.icons.map(icon => access(resolve(root, icon.src))));

console.log(`Smoke audit OK: ${ids.length} IDs únicos, ${localAssets.length} referências locais e ${manifest.icons.length} ícones PWA.`);
