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
