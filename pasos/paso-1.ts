// ─────────────────────────────────────────────────────────────
//  Servidor MCP de staffing · Formación MCP
//  Se ejecuta tal cual con Node 24 (sin compilar):  node src/server.ts
// ─────────────────────────────────────────────────────────────
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import * as datos from '../src/datos.ts';

function crearServidor() {
  const server = new McpServer({ name: 'staffing', version: '1.0.0' });

  // ── PASO 1 · Nuestra primera tool ───────────────────────────
  server.registerTool(
    'listar_consultores',
    {
      title: 'Listar consultores',
      description:
        'Devuelve todos los consultores de la consultora con su rol, seniority, skills, ' +
        'ubicación, proyecto actual y la fecha desde la que están libres.',
    },
    async () => ({
      content: [{ type: 'text', text: JSON.stringify(datos.leerConsultores(), null, 2) }],
    }),
  );

  return server;
}

// Arrancamos por stdio: el cliente (Claude, VS Code...) lanza este proceso
// y se hablan por stdin/stdout con mensajes JSON-RPC.
// ⚠️ Por eso NUNCA uses console.log aquí: ensuciarías el canal. Usa console.error.
serveStdio(crearServidor);
