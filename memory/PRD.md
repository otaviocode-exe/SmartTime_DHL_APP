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
