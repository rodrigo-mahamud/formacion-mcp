// npm run paso 3   →  deja src/server.ts exactamente como queda al final del paso 3.
// Es el "botón de rescate" del live coding: si algo se tuerce, saltas a un estado que funciona.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const n = process.argv[2];
const origen = new URL(`../pasos/paso-${n}.ts`, import.meta.url);

if (!n || !existsSync(origen)) {
  console.error('Uso: npm run paso <0|1|2|3|4>');
  process.exit(1);
}

const codigo = readFileSync(origen, 'utf8').replace("from '../src/datos.ts'", "from './datos.ts'");
writeFileSync(new URL('../src/server.ts', import.meta.url), codigo);

console.log(`✔ src/server.ts ahora es el paso ${n}.`);
console.log('  Reinicia el servidor en el cliente que estés usando:');
console.log('   · Inspector  → pestaña Servers: apaga y enciende el interruptor');
console.log('   · VS Code    → se reinicia solo (dev.watch) o "Restart" en .vscode/mcp.json');
console.log('   · Claude Desktop → salir del todo (icono de la bandeja → Salir) y volver a abrir');
