// npm run claude:instalar     →  añade el servidor "staffing" a Claude Desktop
// npm run claude:desinstalar  →  lo quita (para empezar la formación sin él)
//
// Solo toca la entrada "staffing" de claude_desktop_config.json; el resto de tu
// configuración se queda igual. La primera vez guarda una copia de seguridad.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const accion = process.argv[2];
if (accion !== 'instalar' && accion !== 'desinstalar') {
  console.error('Uso: node scripts/claude-desktop.mjs instalar|desinstalar');
  process.exit(1);
}

const carpetaClaude =
  process.platform === 'win32' ? join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), 'Claude')
  : process.platform === 'darwin' ? join(homedir(), 'Library', 'Application Support', 'Claude')
  : join(homedir(), '.config', 'Claude');
const rutaConfig = join(carpetaClaude, 'claude_desktop_config.json');
const rutaCopia = rutaConfig + '.antes-de-la-formacion';

const config = existsSync(rutaConfig) ? JSON.parse(readFileSync(rutaConfig, 'utf8')) : {};
if (existsSync(rutaConfig) && !existsSync(rutaCopia)) copyFileSync(rutaConfig, rutaCopia);

config.mcpServers ??= {};

if (accion === 'instalar') {
  // Rutas absolutas: Claude Desktop lanza el proceso sin saber en qué carpeta estás
  config.mcpServers.staffing = {
    command: process.execPath,
    args: [fileURLToPath(new URL('../src/server.ts', import.meta.url))],
  };
} else {
  delete config.mcpServers.staffing;
}

mkdirSync(dirname(rutaConfig), { recursive: true });
writeFileSync(rutaConfig, JSON.stringify(config, null, 2) + '\n');

console.log(`✔ Servidor "staffing" ${accion === 'instalar' ? 'añadido a' : 'quitado de'} Claude Desktop.`);
console.log(`  Fichero: ${rutaConfig}`);
if (accion === 'instalar') {
  console.log('  Entrada añadida:');
  console.log(JSON.stringify({ mcpServers: { staffing: config.mcpServers.staffing } }, null, 2).replace(/^/gm, '    '));
}
console.log('  Ahora cierra Claude Desktop DEL TODO (icono de la bandeja → Salir) y vuelve a abrirlo.');
