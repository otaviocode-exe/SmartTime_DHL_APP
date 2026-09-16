# PRD — Sistema de Aprovação de Horas Extras DHL

## Problema
Sistema interno DHL para gerenciar solicitações de horas extras. Elimina emails/planilhas manuais. Gestor cria solicitação → Gerência aprova/rejeita. Histórico completo para auditoria.

## Stack
- Backend: FastAPI + Motor (MongoDB)
- Frontend: React 19 + Tailwind + shadcn/ui + lucide-react
- Auth: JWT via httpOnly cookies (bcrypt + PyJWT)
- Fonts: Outfit (headings) + IBM Plex Sans (body)
- Cores: DHL Yellow #FFCC00, DHL Red #D40511

## Personas
- **Gestor**: cria solicitações, consulta próprias, vê status
- **Gerência**: aprova/rejeita, gerencia usuários, vê tudo
- **Admin**: acesso completo

## Contas Demo (seed automático)
- Admin: admin@dhl.com / admin123
- Gestor: gestor@dhl.com / gestor123 (Carlos Silva)
- Gerência: gerente@dhl.com / gerente123 (Ana Ferreira)

## Implementado (data: 2026-02)
- [x] Login com email/senha (JWT httpOnly cookies)
- [x] Proteção de rotas por role (gestor / gerencia / admin)
- [x] Dashboard do Gestor (Pendentes / Aprovadas / Rejeitadas + Recentes)
- [x] Nova Solicitação (form com cálculo automático de horas)
- [x] Minhas Solicitações (tabela + busca + detalhe em dialog)
- [x] Dashboard da Gerência (4 cards: Pendentes, Aprovadas Hoje, Rejeitadas Hoje, Total Mês)
- [x] Fila de Aprovações (cards + dialog de análise com aprovar/rejeitar)
- [x] Histórico completo (busca + filtro de status)
- [x] Gestão de Usuários (gerência cria novos gestores/gerentes)
- [x] Layout responsivo, sidebar DHL, faixa amarela superior
- [x] Testado E2E — 100% backend + 100% frontend

## Backlog
### P1
- Notificação in-app quando decisão é tomada
- Cancelamento de solicitação (status Cancelada) pelo próprio gestor antes da aprovação
- Exportação CSV/Excel do histórico

### P2
- Notificações por e-mail (Resend/SendGrid)
- Gráficos no dashboard (recharts)
- Pesquisa avançada por período/gestor/matrícula
- Assinatura eletrônica da aprovação
- Auditoria de alterações (event log)
- Integração AD/Entra ID (SSO corporativo)
- App mobile (React Native / Flutter)

## Atualização (Jun/2026)
- Criado /app/APRESENTACAO.md: documento único de apresentação do projeto (arquitetura, IA, hospedagem, status)

## Atualização Visual (Jun/2026) — Redesign a pedido do usuário
- Novo componente `/app/frontend/src/components/DhlLogo.jsx`: logotipo DHL recriado em SVG limpo (vermelho, itálico, com as 3 linhas de velocidade). Sem imagens de IA.
- Barra lateral (`Layout.jsx`) redesenhada: card branco flutuante (rounded-2xl), caixa amarela DHL no topo, itens com ícone centralizado + rótulo abaixo, item ativo com destaque cinza claro, badge vermelho de pendências, rodapé com usuário + Sair (sem seletor de idioma, por escolha do usuário).
- Tela de login (`Login.jsx`) redesenhada em 2 painéis: esquerda amarela DHL limpa (apenas logo, sem texto/ilustração); direita branca com pílula "Português", relógio SmartTime, divisor "GESTÃO DE HORAS EXTRAS", seletor de área minimalista (segmentado I2M/PKCG), campos com ícones, mostrar/ocultar senha, "Esqueceu sua senha?", botão Entrar, SSO Microsoft e rodapé de segurança.
- Seletor de área mantido (obrigatório para o login) em estilo discreto. Fluxo de login validado E2E (admin, coordenador).

## Recuperação de Senha + Modo Escuro (Jun/2026)
- **Recuperação de senha (Resend)**: novos endpoints `POST /api/auth/forgot-password` e `POST /api/auth/reset-password`. Token de uso único `secrets.token_urlsafe(32)` armazenado em `password_reset_tokens` (expira em 1h). Integração de e-mail em `backend/integrations/email.py` (Resend). Sem chave configurada, o link é retornado na resposta/log (MODO DE TESTE) para validar o fluxo.
  - Único lugar para colar a chave: `RESEND_API_KEY` em `/app/backend/.env` (remetente de teste `onboarding@resend.dev`; `APP_PUBLIC_URL` define o domínio do link).
  - Frontend: páginas `/forgot-password` e `/reset-password`; botão "Esqueceu sua senha?" no login agora navega para o fluxo.
  - Testado E2E: link gerado → token de uso único → senha alterada → login com nova senha OK → senha antiga rejeitada.
- **Modo escuro completo**: `ThemeToggle.jsx` (Sol/Lua) adicionado no topo do login e dos cabeçalhos do Layout (notebook/tablet/celular). `ThemeContext` persiste em localStorage; overrides globais em `index.css` (classe `theme-dark`) cobrem cards, textos, inputs, bordas e preservam as cores DHL.

## Gerente solicita + aprova (Set/2026)
- Gerência agora pode **criar solicitações** de hora extra (para qualquer colaborador). `CREATOR_ROLES` inclui `gerencia`. A solicitação nasce como **"Pendente Gerência"** e cai na fila de **Aprovações**, onde o próprio Gerente aprova (fluxo de 2 passos, escolha do usuário).
- Limite de 2h (CLT) e bloqueio de 24h por rejeição continuam valendo para a Gerência.
- Frontend: novos itens de menu `Nova Solicitação` e `Minhas Solicitações` no `gerenciaNav` (`Layout.jsx`) + rotas `/gerencia/nova` e `/gerencia/minhas` (`App.js`). Subtítulo específico da Gerência em `NovaSolicitacao.jsx`. Rótulo de papel do solicitante em `Aprovacoes.jsx` agora trata "Gerência".
- Validado E2E via API: login gerência → criar (Pendente Gerência) → aparece em pendentes → aprovar (Aprovada) → aparece em "Minhas".

## Remoção da Categorização por IA (Set/2026)
- A pedido do usuário, **removida a categorização automática por IA (Claude Sonnet 4.6)**. Removidos: import e chamadas `classify_motivo` em `create_request`/`bulk_create`, campo `categoria_ia`, linha "Categoria (IA)" no PDF (`server.py`) e badges "🤖 IA" no frontend (`Aprovacoes.jsx`, `MinhasSolicitacoes.jsx`). `_serialize_request` e as projeções das listas removem `categoria_ia`; migração `$unset` limpou 11 docs legados. Novas solicitações não gravam mais `categoria_ia`.

## Nova base de colaboradores + cálculo de HE pela escala (Set/2026)
- Base substituída pela planilha **"Head DHL e Agências"** (`/app/backend/data/colaboradores.xlsx`), com 2 abas: **DHL** (Head, 506 → área **I2M**) e **EXPERT** (Agências, 9 → área **PKCG**). Total **515** colaboradores. Parser reescrito (`colaboradores_db.py`) lê por nome de coluna; escala vem da coluna **"Horário"** (1º horário = entrada, último = saída); "Turma - Descrição" é texto informativo; turno é deduzido pela hora de entrada.
- **Área agora vem do colaborador** (`find_by_matricula(mat)['area']`). Fallback quando a matrícula não está na base: usa a **área do criador** (I2M/PKCG) e, se ALL, infere pelo setor. (Corrigido bug de segregação onde caía sempre em I2M.)
- **Regra da HE**: a hora extra só pode ocorrer **APÓS o colaborador bater o ponto de saída** — inicia no horário de **saída da escala** e vai até no **máximo 2h**. No formulário (`NovaSolicitacao.jsx`): ao selecionar/consultar a matrícula, o card "Escala atual" aparece, `hora_inicial` é travado na saída (input desabilitado), `hora_final` = saída+2h; botão "Preencher 2h"; validação no submit exige `hora_inicial === saída`. Limite de 2h e bloqueio de 24h mantidos.
- E2E validado (iteration_3.json): frontend 100% dos fluxos (Gerente cria+aprova, escala auto-preenchida, sem badge IA, Solicitação em Massa sem loop). Backend: fixes de área e categoria_ia validados via curl (coord PKCG + matrícula desconhecida → area PKCG).

## Pendente de decisão do usuário
- Pedido "compactar o app para um Power App" — aguardando escolha entre: (a) blueprint de reconstrução no Power Apps, (b) embutir o React no Power Apps/Teams, (c) deixar o app mais enxuto, (d) outro objetivo.
