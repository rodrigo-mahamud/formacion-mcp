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

  // ── PASO 3 · Una tool que CAMBIA cosas ──────────────────────
  server.registerTool(
    'asignar_consultor',
    {
      title: 'Asignar consultor a proyecto',
      description:
        'Asigna un consultor a un proyecto. Pide confirmación al usuario antes de usarla. ' +
        'Falla si el consultor no está libre el día que arranca el proyecto.',
      inputSchema: z.object({
        consultorId: z.string().describe('Id del consultor, por ejemplo "C01"'),
        proyectoId: z.string().describe('Id del proyecto, por ejemplo "PRJ-05"'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ consultorId, proyectoId }) => {
      const consultores = datos.leerConsultores();
      const proyectos = datos.leerProyectos();
      const consultor = consultores.find((c) => c.id === consultorId);
      const proyecto = proyectos.find((p) => p.id === proyectoId);

      // Los errores también son para el MODELO: dile cómo corregir el rumbo
      if (!consultor || !proyecto) {
        return {
          isError: true,
          content: [{
            type: 'text',
            text: `No existe el consultor "${consultorId}" o el proyecto "${proyectoId}". ` +
              'Consulta los ids con buscar_consultores y listar_proyectos.',
          }],
        };
      }

      if (consultor.proyecto === proyecto.id) {
        return { content: [{ type: 'text', text: `${consultor.nombre} ya estaba en ${proyecto.nombre}.` }] };
      }

      if (consultor.libreDesde > proyecto.inicio) {
        const alternativas = consultores
          .filter((c) => c.rol === consultor.rol && c.id !== consultor.id && c.libreDesde <= proyecto.inicio)
          .map((c) => `${c.id} ${c.nombre} (${c.seniority}, libre desde ${c.libreDesde})`);
        return {
          isError: true,
          content: [{
            type: 'text',
            text: `${consultor.nombre} no está libre hasta el ${consultor.libreDesde} y el proyecto ` +
              `empieza el ${proyecto.inicio}. Alternativas con rol ${consultor.rol}: ` +
              `${alternativas.join('; ') || 'ninguna'}.`,
          }],
        };
      }

      consultor.proyecto = proyecto.id;
      consultor.libreDesde = proyecto.fin;
      proyecto.equipo.push(consultor.id);
      datos.guardarConsultores(consultores);
      datos.guardarProyectos(proyectos);

      return {
        content: [{
          type: 'text',
          text: `Hecho: ${consultor.nombre} asignado a "${proyecto.nombre}" (${proyecto.cliente}) ` +
            `del ${proyecto.inicio} al ${proyecto.fin}.`,
        }],
      };
    },
  );

  // ── PASO 4 · Resources: contexto que adjunta la app o el usuario ──
  server.registerResource(
    'politica-staffing',
    'staffing://politica',
    {
      title: 'Política de staffing',
      description: 'Normas internas para montar equipos en los proyectos',
      mimeType: 'text/markdown',
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'text/markdown', text: datos.leerPolitica() }],
    }),
  );

  // ── PASO 4 · Prompts: plantillas que lanza el usuario (comando /) ──
  server.registerPrompt(
    'proponer_equipo',
    {
      title: 'Proponer equipo para un proyecto',
      description: 'Propone el equipo de un proyecto aplicando la política de staffing',
      argsSchema: z.object({
        proyectoId: z.string().describe('Id del proyecto, por ejemplo PRJ-05'),
      }),
    },
    ({ proyectoId }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text:
            `Propón el equipo para el proyecto ${proyectoId}. Usa las tools de staffing para ver ` +
            'el proyecto y buscar candidatos, aplica la política de abajo y justifica cada elección ' +
            'en una tabla. No asignes a nadie hasta que yo lo confirme.\n\n' +
            datos.leerPolitica(),
        },
      }],
    }),
  );

  return server;
}

// Arrancamos por stdio: el cliente (Claude, VS Code...) lanza este proceso
// y se hablan por stdin/stdout con mensajes JSON-RPC.
// ⚠️ Por eso NUNCA uses console.log aquí: ensuciarías el canal. Usa console.error.
serveStdio(crearServidor);
