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

  // ── PASO 2 · Tools con parámetros ───────────────────────────
  server.registerTool(
    'buscar_consultores',
    {
      title: 'Buscar consultores',
      description:
        'Busca consultores por skill, seniority y disponibilidad. Úsala para preguntas como ' +
        '"¿quién sabe Kafka y está libre en noviembre?". Devuelve los resultados ordenados ' +
        'por la fecha en la que quedan libres.',
      inputSchema: z.object({
        skill: z.string().optional()
          .describe('Tecnología a buscar, por ejemplo "Kafka" o "React". No distingue mayúsculas.'),
        seniority: z.enum(['Junior', 'Mid', 'Senior']).optional(),
        libreAntesDe: z.string().optional()
          .describe('Fecha YYYY-MM-DD. Solo devuelve a quien esté libre ese día o antes.'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ skill, seniority, libreAntesDe }) => {
      const encontrados = datos.leerConsultores()
        .filter((c) => !skill || c.skills.some((s) => s.toLowerCase().includes(skill.toLowerCase())))
        .filter((c) => !seniority || c.seniority === seniority)
        .filter((c) => !libreAntesDe || c.libreDesde <= libreAntesDe)
        .sort((a, b) => a.libreDesde.localeCompare(b.libreDesde));

      return {
        content: [{ type: 'text', text: JSON.stringify(encontrados, null, 2) }],
      };
    },
  );

  server.registerTool(
    'listar_proyectos',
    {
      title: 'Listar proyectos',
      description:
        'Devuelve los proyectos de la consultora: cliente, sector, fechas, modalidad, stack, ' +
        'equipo actual (ids de consultores) y los perfiles que necesita cubrir.',
      annotations: { readOnlyHint: true },
    },
    async () => ({
      content: [{ type: 'text', text: JSON.stringify(datos.leerProyectos(), null, 2) }],
    }),
  );

  return server;
}

// Arrancamos por stdio: el cliente (Claude, VS Code...) lanza este proceso
// y se hablan por stdin/stdout con mensajes JSON-RPC.
// ⚠️ Por eso NUNCA uses console.log aquí: ensuciarías el canal. Usa console.error.
serveStdio(crearServidor);
