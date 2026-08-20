# OtavioAppDHL — Bloco de Integrações

Esta pasta contém os módulos de integração com sistemas externos da DHL.

## Módulos disponíveis

### `dhl_ponto.py` (SKELETON)
Integração com o sistema oficial de Ponto da DHL.
**Status**: ⚠️ Skeleton — precisa ser completado pelo TI da DHL.

Ler o docstring do arquivo para instruções detalhadas.

## Como adicionar uma nova integração

1. Crie um novo arquivo `xxx.py` seguindo o padrão do `dhl_ponto.py`:
   - `class XxxAdapter(ABC)` — define o contrato
   - `class MockXxxAdapter(XxxAdapter)` — para desenvolvimento
   - `class RealXxxAdapter(XxxAdapter)` — implementação real
   - `def get_xxx_adapter()` — factory que lê `.env`

2. Adicione variáveis em `/app/backend/.env`:
   ```
   XXX_ENABLED=false
   XXX_BASE_URL=
   XXX_API_KEY=
   ```

3. Registre os endpoints no `server.py` usando o padrão `/api/integrations/xxx/*`.
