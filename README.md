# Servidor MCP de staffing

Proyecto de la formación sobre **MCP (Model Context Protocol)**. Es un servidor MCP pequeño que deja a un modelo de IA consultar y modificar el staffing de una consultora ficticia: quién sabe qué, quién está libre y en qué proyecto encaja cada persona.

El objetivo no es el staffing: es ver, con un caso que se entiende en un minuto, **cómo se le da a un modelo acceso a datos y acciones que no conoce**, y por qué hacerlo con un estándar en vez de con integraciones a medida.

## Requisitos

- **Node.js 22.19 o superior** (recomendado 24). Ejecuta TypeScript directamente, sin compilar.
- Un cliente MCP: Claude Desktop, VS Code con GitHub Copilot, Claude Code, Cursor...

```bash
npm install
npm run comprobar     # ensaya todos los pasos y te dice si está todo listo
```

## Qué hay aquí

```
src/server.ts      ← el servidor MCP (el fichero que se programa en directo)
src/datos.ts       ← la "base de datos": lee y escribe los JSON de data/
data/              ← consultores, proyectos y la política de staffing
pasos/paso-N.ts    ← cómo queda server.ts al final de cada paso
bonus/             ← el mismo servidor por HTTP y una tool en Python
.vscode/           ← config MCP para VS Code y snippets del live coding
```

## Los pasos

| Paso | Qué se añade | Idea clave |
|---|---|---|
| 1 | `listar_consultores` | Una tool es nombre + descripción + función que devuelve `content` |
| 2 | `buscar_consultores`, `listar_proyectos` | Los parámetros se describen con un schema; **la descripción es el prompt** |
| 3 | `asignar_consultor` | Tools que cambian cosas: anotaciones, confirmación humana y errores que ayudan al modelo |
| 4 | Resource `staffing://politica` y prompt `proponer_equipo` | Las otras dos primitivas: contexto y plantillas |

Para saltar a cualquier paso: `npm run paso 3` (deja `src/server.ts` como al final del paso 3).

## Probarlo

**MCP Inspector** (la herramienta oficial para depurar servidores):

```bash
npm run inspector
```

Se abre en el navegador. Activa el interruptor del servidor `staffing`, ve a **Tools** y ejecuta cualquier tool. En el panel derecho ves los mensajes JSON-RPC que viajan entre cliente y servidor.

**Claude Desktop**:

```bash
npm run claude:instalar      # añade "staffing" a claude_desktop_config.json (con copia de seguridad)
```

Cierra Claude Desktop del todo (también desde el icono de la bandeja) y vuelve a abrirlo. Pregúntale, por ejemplo: *"¿Quién sabe Kafka y está libre en noviembre?"*. Para quitarlo: `npm run claude:desinstalar`.

**VS Code**: abre esta carpeta, abre `.vscode/mcp.json` y pulsa **Start** encima de `staffing`. En el chat de Copilot, en modo agente, ya tienes las tools, y el prompt aparece como `/mcp.staffing.proponer_equipo`.

**Claude Code**:

```bash
claude mcp add staffing -- node "<ruta absoluta>/src/server.ts"
```

**Cualquier otro cliente**: el comando es `node <ruta absoluta>/src/server.ts` por stdio.

## Bonus

- `npm run bonus:http` levanta el mismo servidor por **Streamable HTTP** en `http://localhost:3000/mcp`. Es lo que harías para darle servicio a todo un equipo (en producción, detrás de autenticación OAuth).
- `npm run bonus:python` arranca la tool `buscar_consultores` escrita en Python con el SDK oficial (necesita [uv](https://docs.astral.sh/uv/)). Para el cliente es indistinguible de la de TypeScript.

## Otros comandos

| Comando | Para qué |
|---|---|
| `npm run reset` | Deshace las asignaciones que hayas hecho probando |
| `npm run typecheck` | Revisa los tipos de TypeScript |
| `npm start` | Arranca el servidor por stdio (se queda esperando mensajes: es normal) |

## Para seguir aprendiendo

- Especificación y guías: https://modelcontextprotocol.io
- SDK de TypeScript: https://ts.sdk.modelcontextprotocol.io/v2/
- SDK de Python: https://py.sdk.modelcontextprotocol.io/
- Servidores ya hechos: https://registry.modelcontextprotocol.io
