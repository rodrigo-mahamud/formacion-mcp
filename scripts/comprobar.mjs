// npm run comprobar   →  ensayo automático antes de la formación.
// Arranca cada paso como lo haría un cliente MCP real, llama a sus tools y
// revisa que todo esté en su sitio para empezar (datos limpios, paso 0, Claude Desktop).
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const ok = (m) => console.log(`  ✔ ${m}`);
const aviso = (m) => { console.log(`  ⚠ ${m}`); avisos++; };
const fallo = (m) => { console.log(`  ✖ ${m}`); fallos++; };
let fallos = 0;
let avisos = 0;

console.log('\nEntorno');
const [mayor, menor] = process.versions.node.split('.').map(Number);
if (mayor > 22 || (mayor === 22 && menor >= 19)) ok(`Node ${process.versions.node}`);
else fallo(`Node ${process.versions.node}: hace falta 22.19 o superior (recomendado 24)`);

if (!existsSync(join(raiz, 'node_modules', '@modelcontextprotocol', 'server'))) {
  fallo('Faltan dependencias: ejecuta npm install');
  process.exit(1);
}
ok('Dependencias instaladas');

const { Client } = await import('@modelcontextprotocol/client');
const { StdioClientTransport } = await import('@modelcontextprotocol/client/stdio');

async function conectar(fichero) {
  const client = new Client({ name: 'comprobar', version: '1.0.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(raiz, fichero)], stderr: 'pipe' }));
  return client;
}

const esperado = {
  1: ['listar_consultores'],
  2: ['listar_consultores', 'buscar_consultores', 'listar_proyectos'],
  3: ['listar_consultores', 'buscar_consultores', 'listar_proyectos', 'asignar_consultor'],
  4: ['listar_consultores', 'buscar_consultores', 'listar_proyectos', 'asignar_consultor'],
};

console.log('\nCheckpoints (cada paso arrancado como lo arranca Claude o VS Code)');
for (const n of [1, 2, 3, 4]) {
  let client;
  try {
    client = await conectar(`pasos/paso-${n}.ts`);
    const tools = (await client.listTools()).tools.map((t) => t.name);
    if (JSON.stringify(tools) !== JSON.stringify(esperado[n])) throw new Error(`tools inesperadas: ${tools.join(', ')}`);
    const detalles = [`${tools.length} tool${tools.length > 1 ? "s" : ""}`];

    if (n >= 2) {
      const r = await client.callTool({ name: 'buscar_consultores', arguments: { skill: 'kafka', libreAntesDe: '2026-11-30' } });
      const nombres = JSON.parse(r.content[0].text).map((c) => c.nombre.split(' ')[0]);
      detalles.push(`Kafka en noviembre → ${nombres.join(', ')}`);
    }
    if (n >= 3) {
      const r = await client.callTool({ name: 'asignar_consultor', arguments: { consultorId: 'C02', proyectoId: 'PRJ-05' } });
      if (!r.isError) throw new Error('asignar Marcos a PRJ-05 debería fallar');
      detalles.push('error de negocio OK');
    }
    if (n === 4) {
      const recursos = (await client.listResources()).resources.length;
      const prompts = (await client.listPrompts()).prompts.length;
      if (recursos !== 1 || prompts !== 1) throw new Error(`resources=${recursos} prompts=${prompts}`);
      detalles.push('1 resource y 1 prompt');
    }
    ok(`Paso ${n}: ${detalles.join(' · ')}`);
  } catch (e) {
    fallo(`Paso ${n}: ${e.message}`);
  } finally {
    await client?.close().catch(() => {});
  }
}

console.log('\nEstado para empezar');
const actual = readFileSync(join(raiz, 'src', 'server.ts'), 'utf8');
const pasoActual = [0, 1, 2, 3, 4].find((n) =>
  readFileSync(join(raiz, 'pasos', `paso-${n}.ts`), 'utf8').replace("from '../src/datos.ts'", "from './datos.ts'") === actual);
if (pasoActual === 0) ok('src/server.ts está en el paso 0 (listo para el live coding)');
else if (pasoActual !== undefined) aviso(`src/server.ts está en el paso ${pasoActual}. Para empezar: npm run paso 0`);
else aviso('src/server.ts tiene cambios propios. Para empezar: npm run paso 0');

const limpios = ['consultores.json', 'proyectos.json'].every((f) =>
  readFileSync(join(raiz, 'data', f), 'utf8') === readFileSync(join(raiz, 'data', 'semilla', f), 'utf8'));
if (limpios) ok('Datos limpios (nadie asignado a Banco Meridiano)');
else aviso('Hay asignaciones de ensayos en los datos. Para limpiarlas: npm run reset');

const carpetaClaude =
  process.platform === 'win32' ? join(process.env.APPDATA ?? '', 'Claude')
  : process.platform === 'darwin' ? join(homedir(), 'Library', 'Application Support', 'Claude')
  : join(homedir(), '.config', 'Claude');
const rutaConfig = join(carpetaClaude, 'claude_desktop_config.json');
if (!existsSync(rutaConfig)) {
  aviso(`No encuentro la configuración de Claude Desktop (${rutaConfig}). ¿Está instalado?`);
} else {
  const servidor = JSON.parse(readFileSync(rutaConfig, 'utf8')).mcpServers?.staffing;
  if (!servidor) ok('Claude Desktop sin el servidor "staffing" (bien: el gancho inicial necesita que NO lo tenga)');
  else aviso('Claude Desktop YA tiene el servidor "staffing". Para el gancho inicial: npm run claude:desinstalar');
}

console.log(
  fallos ? `\n✖ ${fallos} problema(s) que arreglar antes de la formación.\n`
  : avisos ? `\n⚠ Todo funciona, pero revisa ${avisos} aviso(s) antes de empezar.\n`
  : '\n✔ Todo listo para la formación.\n',
);
process.exit(fallos ? 1 : 0);
