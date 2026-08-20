"""
DHL Ponto Integration — SKELETON / STUB
========================================

Este módulo contém o ESQUELETO da integração com o sistema de Ponto da DHL.
Foi criado pelo OtavioAppDHL com base no PRD do Sistema de Aprovação de Horas Extras.
DEVE SER COMPLETADO PELO TIME DE TI DA DHL com as credenciais e endpoints reais.

O que ESTE MÓDULO FAZ hoje:
  - Define o contrato (interface) que o restante do backend usa.
  - Fornece uma implementação MOCK (falsa) para desenvolvimento local.
  - Estrutura os endpoints públicos em /api/integrations/ponto/*.

O que o TI da DHL precisa FAZER:
  1. Descobrir qual sistema de Ponto oficial está em uso (Kairos, Ponto Secullum, ADP,
     RM Vitae, Sênior, Ahgora, Zé do Ponto, etc.). Verificar a documentação de API.
  2. Obter credenciais de integração (client_id / client_secret / api_key / OAuth).
  3. Preencher variáveis no arquivo .env (ver bloco DHL_PONTO_* abaixo).
  4. Substituir a classe `MockPontoAdapter` por `RealPontoAdapter` implementando
     os mesmos métodos abstratos usando o cliente HTTP oficial (`httpx.AsyncClient`).
  5. Ajustar mapeamento de campos: matrícula → ID do colaborador, horários,
     centro de custo, turno etc.
  6. Definir política de sincronização (bidirecional? apenas leitura? webhook?
     polling? diário? sob demanda?).
  7. Configurar TLS / VPN / IP allowlist conforme exigências corporativas.

VARIÁVEIS DE AMBIENTE ESPERADAS (adicionar em /app/backend/.env):
    DHL_PONTO_ENABLED=false            # true quando o TI concluir a integração
    DHL_PONTO_BASE_URL=                # ex.: https://ponto.dhl.com.br/api/v1
    DHL_PONTO_CLIENT_ID=
    DHL_PONTO_CLIENT_SECRET=
    DHL_PONTO_TIMEOUT_SECONDS=15

ENDPOINTS PÚBLICOS EXPOSTOS POR ESTE MÓDULO:
    GET  /api/integrations/ponto/status
    GET  /api/integrations/ponto/colaborador/{matricula}
    POST /api/integrations/ponto/registrar-hora-extra   (chamado quando gerência aprova)

FLUXO IDEAL (a implementar quando integrar):
    1) Gestor digita a matrícula na nova solicitação.
       Frontend chama GET /colaborador/{matricula} para autocompletar nome, setor,
       turno, centro de custo.
    2) Ao aprovar solicitação, backend chama POST /registrar-hora-extra para
       lançar a HE no sistema de Ponto oficial e retornar um protocolo.
    3) Se a chamada falhar, marcar a solicitação como "Aprovada (pendente ponto)"
       para retry manual ou automático (fila).

CONTATO ORIGINAL: Este skeleton foi gerado pelo OtavioAppDHL.
"""
from __future__ import annotations

import os
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger("dhl.ponto")


# ---------------------------------------------------------------------------
# Contratos de dados (DTOs)
# ---------------------------------------------------------------------------
@dataclass
class ColaboradorPonto:
    """Dados de um colaborador retornados pelo sistema de Ponto."""
    matricula: str
    nome: str
    setor: str = ""
    centro_custo: str = ""
    turno: str = ""      # T1, T2, T3, ADM
    gestor_matricula: str = ""
    ativo: bool = True

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class RegistroHoraExtraResultado:
    """Resultado do lançamento de HE no Ponto."""
    sucesso: bool
    protocolo: str = ""
    mensagem: str = ""


# ---------------------------------------------------------------------------
# Interface (Adapter Pattern)
# ---------------------------------------------------------------------------
class PontoAdapter(ABC):
    """Interface para qualquer implementação do sistema de Ponto DHL."""

    @abstractmethod
    async def status(self) -> dict:
        """Verifica se o sistema de Ponto está acessível."""

    @abstractmethod
    async def buscar_colaborador(self, matricula: str) -> Optional[ColaboradorPonto]:
        """Retorna dados do colaborador pela matrícula. None se não encontrado."""

    @abstractmethod
    async def registrar_hora_extra(
        self,
        matricula: str,
        data: str,          # YYYY-MM-DD
        hora_inicial: str,  # HH:MM
        hora_final: str,    # HH:MM
        total_horas: float,
        motivo: str,
        aprovador_matricula: str,
    ) -> RegistroHoraExtraResultado:
        """Lança a HE aprovada no sistema de Ponto."""


# ---------------------------------------------------------------------------
# Implementação MOCK (usada enquanto o TI da DHL não conecta o real)
# ---------------------------------------------------------------------------
class MockPontoAdapter(PontoAdapter):
    """Retorna dados de exemplo. Substituir por RealPontoAdapter em produção."""

    _EMPLOYEES = {
        "GST100": ColaboradorPonto("GST100", "Carlos Silva",   "Operações",       "CC-100", "ADM", ""),
        "GER200": ColaboradorPonto("GER200", "Ana Ferreira",   "Gerência",        "CC-200", "ADM", ""),
        "12345":  ColaboradorPonto("12345",  "João Da Silva",  "Armazém",         "CC-300", "T1",  "GST100"),
        "23456":  ColaboradorPonto("23456",  "Maria Souza",    "Expedição",       "CC-301", "T2",  "GST100"),
        "34567":  ColaboradorPonto("34567",  "Pedro Rocha",    "Recebimento",     "CC-302", "T3",  "GST100"),
    }

    async def status(self) -> dict:
        return {"connected": False, "mode": "mock", "message": "Integração DHL Ponto pendente (mock ativo)"}

    async def buscar_colaborador(self, matricula: str) -> Optional[ColaboradorPonto]:
        return self._EMPLOYEES.get(matricula)

    async def registrar_hora_extra(self, matricula, data, hora_inicial, hora_final,
                                   total_horas, motivo, aprovador_matricula):
        # Simula sucesso, gera protocolo fake
        proto = f"MOCK-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{matricula}"
        logger.info(f"[MOCK PONTO] Registrado HE {proto}: {matricula} {data} {hora_inicial}-{hora_final}")
        return RegistroHoraExtraResultado(True, proto, "Registro simulado (mock)")


# ---------------------------------------------------------------------------
# Implementação REAL — TODO: preencher com detalhes do sistema oficial da DHL
# ---------------------------------------------------------------------------
class RealPontoAdapter(PontoAdapter):
    """
    Implementação real usando o sistema oficial de Ponto da DHL.

    TODO (para o TI da DHL):
      - Instalar httpx: já está em requirements.txt (dependência do FastAPI).
      - Descobrir o endpoint de autenticação (OAuth2 client_credentials? API key?).
      - Substituir os corpos dos métodos abaixo. Manter as ASSINATURAS iguais.
      - Adicionar tratamento de erro com retry (recomendo `tenacity`).
    """

    def __init__(self, base_url: str, client_id: str, client_secret: str, timeout: int = 15):
        self.base_url = base_url.rstrip("/")
        self.client_id = client_id
        self.client_secret = client_secret
        self.timeout = timeout
        self._token: Optional[str] = None
        self._token_expira_em: Optional[datetime] = None

    async def _get_token(self) -> str:
        """TODO: implementar OAuth2 client credentials ou o método exigido."""
        raise NotImplementedError("TI DHL: implementar autenticação com o sistema oficial")

    async def status(self) -> dict:
        # TODO: chamar endpoint de healthcheck do Ponto DHL
        raise NotImplementedError("TI DHL: implementar chamada real")

    async def buscar_colaborador(self, matricula: str) -> Optional[ColaboradorPonto]:
        # TODO: chamar GET {base_url}/colaboradores/{matricula}
        # Mapear resposta para ColaboradorPonto.
        raise NotImplementedError("TI DHL: implementar chamada real")

    async def registrar_hora_extra(self, matricula, data, hora_inicial, hora_final,
                                   total_horas, motivo, aprovador_matricula):
        # TODO: POST {base_url}/horas-extras com payload apropriado ao sistema DHL
        raise NotImplementedError("TI DHL: implementar chamada real")


# ---------------------------------------------------------------------------
# Factory — escolhe adapter conforme .env
# ---------------------------------------------------------------------------
_adapter_instance: Optional[PontoAdapter] = None


def get_ponto_adapter() -> PontoAdapter:
    global _adapter_instance
    if _adapter_instance is not None:
        return _adapter_instance

    enabled = os.environ.get("DHL_PONTO_ENABLED", "false").lower() == "true"
    base_url = os.environ.get("DHL_PONTO_BASE_URL", "")
    client_id = os.environ.get("DHL_PONTO_CLIENT_ID", "")
    client_secret = os.environ.get("DHL_PONTO_CLIENT_SECRET", "")
    timeout = int(os.environ.get("DHL_PONTO_TIMEOUT_SECONDS", "15"))

    if enabled and base_url and client_id and client_secret:
        logger.info("Ponto DHL: usando RealPontoAdapter")
        _adapter_instance = RealPontoAdapter(base_url, client_id, client_secret, timeout)
    else:
        logger.info("Ponto DHL: usando MockPontoAdapter (não configurado)")
        _adapter_instance = MockPontoAdapter()
    return _adapter_instance
