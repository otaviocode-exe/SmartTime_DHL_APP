# 📋 DHL — Horas Extras
### Apresentação do Projeto
*por Otávio, o desenvolvedor 😄*

---

## 1. O que é o sistema?

Um **Sistema de Aprovação de Horas Extras** para a DHL, que digitaliza todo o fluxo:

- **Gestor**: cria solicitações de horas extras (colaborador, turno, data, horários, motivo, anexos) — com limite máximo de 2 horas por solicitação.
- **Gerência**: analisa, aprova ou rejeita — individualmente ou em massa — e acompanha métricas em dashboards.

### Principais recursos
- 🔐 Login seguro com JWT e perfis por papel (Gestor / Gerência)
- 📊 Dashboards com gráficos interativos
- 🤖 IA que categoriza automaticamente os motivos das horas extras
- 📎 Anexos integrados na criação da solicitação
- 📄 Relatórios em PDF e Excel
- 🔔 Notificações Push (PWA instalável no celular)
- 🌙 Modo claro/escuro e layouts para celular, tablet e desktop
- 📝 Log de auditoria de todas as ações
- 🎨 Identidade visual DHL (amarelo #FFCC00 e vermelho #D40511)

---

## 2. 🏗️ Arquitetura do Sistema

### Visão geral

Arquitetura **full-stack moderna de 3 camadas**:

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────┐
│    FRONTEND     │ ───► │     BACKEND      │ ───► │   BANCO     │
│  React + PWA    │ API  │ Python (FastAPI) │      │   MongoDB   │
└─────────────────┘      └──────────────────┘      └─────────────┘
```

### 🐍 Backend — Python + FastAPI

Escolhi **Python com FastAPI** porque é rápido, moderno e valida os dados automaticamente:

- **API REST**: todas as rotas do sistema (`/api/requests`, `/api/auth`, `/api/reports`...) — o frontend nunca acessa o banco diretamente.
- **Autenticação JWT**: tokens seguros em cookies HttpOnly (scripts maliciosos não conseguem ler o token).
- **Pydantic**: valida cada solicitação no servidor — o limite de 2 horas extras é barrado na API, não só na tela.
- **ReportLab e OpenPyXL**: geram os relatórios em PDF e Excel.
- **Pandas**: lê a planilha Excel com os 284 colaboradores e alimenta o auto-complete.
- **PyWebPush**: dispara as notificações push para o celular.

### ⚛️ Frontend — React + TailwindCSS

- **React**: interface dividida em componentes reutilizáveis (dashboards, formulários, tabelas).
- **TailwindCSS**: estilização seguindo a identidade DHL.
- **PWA**: o site pode ser instalado como app no celular, com service worker e notificações.
- **Recharts**: gráficos interativos dos dashboards.

### 🍃 Banco de dados — MongoDB

MongoDB (NoSQL) pela flexibilidade: cada solicitação vira um documento JSON, fácil de evoluir.
Coleções principais: `users`, `requests`, `audit_log`, `push_subscriptions`.

### 🔒 Segurança

- Senhas criptografadas (hash), nunca em texto puro
- Controle de acesso por papel (Gestor vê uma coisa, Gerência vê outra)
- Log de auditoria registrando toda ação
- Anexos em object storage na nuvem (não pesam no banco)

---

## 3. 🤖 Por que eu coloquei uma IA no sistema?

**O problema:** cada gestor escreve o motivo de um jeito ("faltou gente", "absenteísmo", "colega não veio"...). Sem padronização, os relatórios da gerência viravam bagunça e era impossível analisar as causas reais das horas extras.

**A solução:** toda vez que uma solicitação é criada, o texto do motivo passa por uma **IA (Claude Sonnet)** integrada ao backend, que categoriza automaticamente (ex.: *Absenteísmo*, *Pico de Demanda*, *Problema Operacional*).

Resultado: a gerência enxerga nos dashboards **por que** as horas extras acontecem, sem depender de preenchimento manual — e sem erro humano. A IA não é enfeite: ela roda dentro do fluxo do site transformando texto livre em dado estruturado para tomada de decisão. 📊

---

## 4. ☁️ Onde o app está rodando (e por quê)

### O problema de rodar um app full-stack

Esse sistema não abre clicando num `index.html`. Ele precisa de **três serviços rodando ao mesmo tempo** (React + FastAPI + MongoDB), num servidor ligado 24h. E aí vem o problema clássico: **hospedagem custa dinheiro**.

### As opções que existem

| Opção | Custo | Problema |
|---|---|---|
| **Localhost puro** (meu PC) | Grátis | Só funciona com meu PC ligado; ninguém de fora acessa |
| **Túneis** (Ngrok, Cloudflare) | Grátis básico | Link temporário, PC precisa ficar ligado |
| **Vercel / Netlify / GitHub Pages** | Grátis | Só hospedam frontend — backend Python e MongoDB ficam de fora |
| **AWS / GCP / Azure / Railway** | Plano grátis limitado | Servidor "dorme", exige DevOps, e logo vem cobrança 💸 |
| **Plataforma de IA (Emergent)** | Preview incluso | ✅ Foi a escolha |

### Por que a Emergent?

Foi a única opção onde consegui o **ambiente completo sem pagar servidor à parte**:

- **🖥️ Tudo pronto**: Python, Node, MongoDB — os três serviços rodando 24h num container na nuvem (Kubernetes)
- **🔗 URL pública**: gestores e gerência testam pelo navegador ou celular, sem instalar nada
- **⚡ IA programadora**: eu peço as mudanças (ou colo código/planilhas feitos à mão, como a base de colaboradores em Excel) e a IA integra, testa e deixa no ar
- **🔑 Integrações inclusas**: chave de IA para a categorização e armazenamento de anexos na nuvem, sem criar conta em vários serviços
- **🧪 Ambiente seguro de teste**: posso quebrar, ajustar e validar à vontade antes do deploy oficial

Ou seja: virou meu **"localhost na nuvem"** — o mesmo ambiente que eu teria na minha máquina, mas ligado 24h, acessível para todo mundo e com uma IA de plantão. 😄

> **Nota:** o preview é ideal para desenvolvimento e testes. Para uso oficial na DHL, o caminho é o deploy de produção, que garante estabilidade para uso real.

---

## 5. Status atual

✅ Sistema completo e testado de ponta a ponta.
⚠️ Única parte simulada: integração com o **Ponto DHL** (aguardando API real da TI da DHL).

### Próximos passos possíveis
- Notificações por e-mail
- Limite de tentativas de login (segurança)
- Exportação de PDF individual por solicitação
- SSO Microsoft Entra ID
