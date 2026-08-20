"""AI classification of overtime request motivo — OtavioAppDHL (via LLM key)."""
import os
import re
import logging
from typing import Literal

logger = logging.getLogger("dhl.ai")

Categoria = Literal["operacional", "cliente_urgente", "falta_pessoal", "manutencao", "outros"]

_SYSTEM = """Você é um classificador de solicitações de hora extra da DHL.
Receba o MOTIVO informado pelo gestor e retorne APENAS UMA das categorias abaixo em minúsculas, sem explicação:

- operacional: rotina operacional (fechamento, contagem, inventário, atraso comum, pico previsível)
- cliente_urgente: demanda urgente de cliente, prazo apertado, cliente estratégico, entrega crítica
- falta_pessoal: cobrir ausência (folga, atestado, férias, demissão, absenteísmo)
- manutencao: manutenção de equipamento, sistema fora do ar, quebra, reparo
- outros: nada acima se encaixa

Responda com uma única palavra."""


async def classify_motivo(motivo: str) -> Categoria:
    """Best-effort classification. Falls back to 'outros' if API fails."""
    if not motivo or len(motivo.strip()) < 3:
        return "outros"

    key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not key:
        return "outros"

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=key,
            session_id=f"classify-{hash(motivo) % 10_000_000}",
            system_message=_SYSTEM,
        ).with_model("anthropic", "claude-sonnet-4-6")

        resp = await chat.send_message(UserMessage(text=motivo))
        text = str(resp).strip().lower()
        # Extract just the category token (accept "operacional.", "operacional\n", etc.)
        m = re.search(r"(operacional|cliente_urgente|falta_pessoal|manutencao|outros)", text)
        return m.group(1) if m else "outros"
    except Exception as e:
        logger.warning(f"AI classification failed: {e}")
        return "outros"
