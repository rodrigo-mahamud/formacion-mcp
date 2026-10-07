# ─────────────────────────────────────────────────────────────
#  BONUS · La misma tool en Python, con el SDK oficial de MCP
#  npm run bonus:python      (necesita uv: https://docs.astral.sh/uv/)
# ─────────────────────────────────────────────────────────────
#  Mira lo que NO hay que escribir: el docstring se convierte en la
#  descripción de la tool y los type hints en su JSON Schema.
#  Para el cliente (Claude, VS Code...) es indistinguible del de TypeScript:
#  el contrato es el protocolo, no el lenguaje.
import json
from pathlib import Path

from mcp.server import MCPServer

DATOS = Path(__file__).resolve().parent.parent / "data"

mcp = MCPServer("staffing-python")


@mcp.tool()
def buscar_consultores(skill: str | None = None, libre_antes_de: str | None = None) -> list[dict]:
    """Busca consultores por skill (p. ej. "Kafka") y que estén libres antes de una fecha YYYY-MM-DD."""
    consultores = json.loads((DATOS / "consultores.json").read_text(encoding="utf-8"))
    encontrados = [
        c for c in consultores
        if (not skill or any(skill.lower() in s.lower() for s in c["skills"]))
        and (not libre_antes_de or c["libreDesde"] <= libre_antes_de)
    ]
    return sorted(encontrados, key=lambda c: c["libreDesde"])


if __name__ == "__main__":
    mcp.run()  # stdio por defecto
