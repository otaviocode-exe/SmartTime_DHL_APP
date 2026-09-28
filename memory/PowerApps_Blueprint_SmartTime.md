# SmartTime! — Blueprint de Reconstrução em Microsoft Power Apps (Canvas App)

> Documento de projeto para recriar o app **SmartTime!** (Gestão de Horas Extras DHL) como um **Canvas App** no Power Platform, mantendo 100% das regras de negócio do app React/FastAPI atual.
> Você segue este guia dentro do **make.powerapps.com**. Nada aqui roda no ambiente Emergent — é a "planta" para você montar no Power Apps.

---

## 1. Arquitetura no Power Platform

| Camada | App atual (Emergent) | Equivalente Power Platform |
|---|---|---|
| Frontend | React + Tailwind | **Canvas App** (Power Apps) |
| Backend/API | FastAPI | Fórmulas **Power Fx** + **Power Automate** (fluxos) |
| Banco de dados | MongoDB | **Dataverse** (tabelas) |
| Autenticação/JWT | JWT + área no login | **Microsoft Entra ID** (login automático do Power Apps) + tabela de perfis |
| Papéis (RBAC) | coordenador/supervisor/gerencia/admin | Coluna `Papel` + **Security Roles** do Dataverse |
| E-mails (Resend) | Resend API | Conector **Office 365 Outlook** / **Send an email (V2)** |
| Notificações push | Web Push (VAPID) | Notificações **Power Apps** / mensagem no **Teams** |
| Ponto ADP (mock) | Mock | Fluxo Power Automate placeholder (ou conector custom quando existir) |

**Componentes a criar:**
1. **Dataverse**: 2 tabelas principais (`Colaboradores`, `Solicitações HE`) + 1 de perfis (`Perfis de Usuário`) + colunas de escolha.
2. **Canvas App**: ~8 telas.
3. **Power Automate**: 3 fluxos (notificar aprovador, e-mail de decisão, limpeza/retention opcional).
4. **Tema DHL** (cores amarelo `#FFCC00` / vermelho `#D40511`).

**Licenciamento**: Power Apps por app ou por usuário (Dataverse requer plano Power Apps, não roda em SharePoint com todos os recursos aqui descritos — recomendado Dataverse).

---

## 2. Tabelas Dataverse

### 2.1 Tabela `Perfil` (perfis/usuários do sistema)
Guarda o papel e a área de cada usuário Entra. (No app atual = coleção `users`.)

| Coluna (Nome de exibição) | Nome lógico | Tipo | Observações |
|---|---|---|---|
| Nome | `cr_nome` | Texto | Nome do usuário |
| E-mail | `cr_email` | Texto (email) | Igual ao UPN do Entra (para casar no login) |
| Papel | `cr_papel` | Choice (Escolha) | `Coordenador`, `Supervisor`, `Gerência`, `Admin` |
| Área | `cr_area` | Choice | `I2M`, `PKCG`, `ALL` |
| Ativo | `cr_ativo` | Sim/Não | Padrão Sim |

> **Login**: o Power Apps já autentica via Entra ID. Você **não recria senha/JWT**. No `App.OnStart`, busca o `Perfil` cujo `cr_email = User().Email` para obter Papel e Área.

### 2.2 Tabela `Colaborador` (base de RH — somente leitura no app)
Origem: planilha **"Head DHL e Agências"** (abas DHL → I2M, EXPERT → PKCG). No app atual = `colaboradores.xlsx`.

| Coluna | Nome lógico | Tipo | Observações |
|---|---|---|---|
| Matrícula | `cr_matricula` | Texto | **Chave alternativa** (Alternate Key) para lookup rápido |
| Nome | `cr_nome` | Texto | |
| Setor | `cr_setor` | Texto | ex.: `UNILEVER VINHEDO - EXPEDICAO` / `AGÊNCIAS · AUX...` |
| Área | `cr_area` | Choice | `I2M` (aba DHL) / `PKCG` (aba EXPERT) |
| Turma (descrição) | `cr_turma` | Texto | informativo, ex.: `22:00 - 06:10 (6x2) VINHEDO - B` |
| Turno | `cr_turno` | Choice | `T1`,`T2`,`T3`,`ADM` (deduzido pela entrada) |
| Entrada (escala) | `cr_entrada` | Texto (HH:MM) | 1º horário da coluna "Horário" |
| **Saída (escala)** | `cr_saida` | Texto (HH:MM) | último horário da coluna "Horário" → **base do cálculo de HE** |

> Defina **Alternate Key** em `cr_matricula` para permitir `LookUp(Colaborador, cr_matricula = X)` performático e relações por matrícula.

### 2.3 Tabela `SolicitacaoHE` (coração do sistema)
No app atual = coleção `requests`.

| Coluna | Nome lógico | Tipo | Observações |
|---|---|---|---|
| Número | `cr_numero` | Texto | ex.: `HE-20260916222700-7E66` (gerado na criação) |
| Colaborador | `cr_colaborador` | Texto | nome |
| Matrícula | `cr_matricula` | Texto | |
| Setor | `cr_setor` | Texto | |
| Turno | `cr_turno` | Choice | `T1/T2/T3/ADM` |
| Data | `cr_data` | Data | dia da HE |
| Hora inicial | `cr_hora_inicial` | Texto (HH:MM) | = saída da escala |
| Hora final | `cr_hora_final` | Texto (HH:MM) | ≤ saída + 2h |
| Total horas | `cr_total_horas` | Decimal | ≤ 2 |
| Motivo | `cr_motivo` | Texto multilinha | |
| Observações | `cr_observacoes` | Texto multilinha | |
| **Status** | `cr_status` | Choice | `Pendente Supervisor`, `Pendente Gerência`, `Aprovada`, `Rejeitada`, `Cancelada` |
| Área | `cr_area` | Choice | `I2M`/`PKCG` (herdada do colaborador) |
| Papel do solicitante | `cr_gestor_papel` | Choice | `Coordenador`/`Supervisor`/`Gerência` |
| Solicitante (Perfil) | `cr_solicitante` | Lookup → Perfil | quem criou |
| Supervisor decisor | `cr_supervisor` | Lookup → Perfil | opcional |
| Gerente decisor | `cr_gerente` | Lookup → Perfil | opcional |
| Observações da gerência | `cr_obs_gerencia` | Texto | |
| Data da decisão | `cr_data_decisao` | Data e Hora | usada no bloqueio de 24h |
| Rejeitada em | `cr_rejeitada_em` | Data e Hora | = data_decisao quando rejeitada |
| Anexos | (subgrid) | **Notes/Anexos** nativos do Dataverse | fotos/PDF/comprovantes |

> Anexos: use o recurso nativo de **Anexos (Notes)** do Dataverse ou uma tabela filha `AnexoHE` com coluna Arquivo. Isso substitui o upload de arquivos do app atual.

### 2.4 Choices (colunas de escolha globais)
- **Papel**: Coordenador (1), Supervisor (2), Gerência (3), Admin (4)
- **Área**: I2M (1), PKCG (2), ALL (3)
- **Turno**: T1, T2, T3, ADM
- **StatusHE**: Pendente Supervisor, Pendente Gerência, Aprovada, Rejeitada, Cancelada

---

## 3. Segurança / RBAC

Duas camadas (recomendado usar as duas):
1. **Camada de app (Power Fx)** — controla telas/botões visíveis conforme `varPapel`/`varArea`.
2. **Camada Dataverse (Security Roles)** — impede acesso indevido aos dados mesmo fora do app.

**Regras de visibilidade (igual ao app atual):**
- **Coordenador**: cria solicitações (individual + massa), vê "Minhas Solicitações", só da sua Área.
- **Supervisor**: aprova `Pendente Supervisor` da sua Área; também cria (vai direto p/ `Pendente Gerência`).
- **Gerência**: aprova `Pendente Gerência` (todas as áreas); cria + massa; vê Usuários/Auditoria/Config.
- **Admin**: tudo.

**Filtro por Área nas consultas** (Power Fx):
```
// Coleção base já filtrada pela área do usuário logado
Set(varMinhasAreas, If(varArea = "ALL", ["I2M","PKCG"], [varArea]));
```

---

## 4. Importar a base de Colaboradores (Excel → Dataverse)

Opção recomendada: **Dataflow** (Power Query no Power Apps → "Dataflows").
1. Fonte: Excel "Head DHL e Agências" (OneDrive/SharePoint).
2. **Query aba DHL**: selecionar colunas `Matrícula`, `Nome` (1ª), `Nome` (2ª → renomear p/ Setor), `Turma - Descrição`, `Horário`. Adicionar coluna calculada `Área = "I2M"`.
3. **Query aba EXPERT**: `Matrícula`, `Nome`, `Função` (→ Setor `"AGÊNCIAS · " & Função`), `Turno` (→ Turma). Adicionar `Área = "PKCG"`.
4. Coluna **Entrada** = primeiro `HH:MM` do texto "Horário"; **Saída** = último `HH:MM`. (Em Power Query use `Text.Select` + `Splitter`/regex de horas, ou uma coluna personalizada com `Text.Middle`.)
5. **Append** das duas queries → carregar na tabela `Colaborador` (chave: Matrícula, atualização incremental por Matrícula).

> Alternativa rápida (sem dataflow): usar **Excel Online (Business)** como fonte direta no app, mas Dataverse é mais robusto e permite Alternate Key + relacionamentos.

---

## 5. Telas do Canvas App

| # | Tela | Equivale a | Conteúdo principal |
|---|---|---|---|
| 1 | `scrLogin`/Splash | Login | Logo SmartTime, saudação; login é automático via Entra. Botão "Entrar" só direciona por Papel. |
| 2 | `scrDashboard` | Dashboards por papel | KPIs (pendentes, aprovadas hoje, rejeitadas), gráfico de barras/rosca. |
| 3 | `scrNova` | Nova Solicitação | Form individual + card "Escala atual" + regra HE após saída. |
| 4 | `scrMassa` | Solicitação em Massa | Galeria de colaboradores c/ seleção + Duração; cria em lote por escala. |
| 5 | `scrMinhas` | Minhas Solicitações | Galeria das solicitações criadas pelo usuário. |
| 6 | `scrAprovacoes` | Aprovações | Fila conforme papel (Supervisor→Pendente Supervisor / Gerência→Pendente Gerência) + Aprovar/Rejeitar. |
| 7 | `scrDetalhe` | Detalhe/Modal | Ver dados completos + anexos + histórico. |
| 8 | `scrAdmin` | Usuários/Auditoria/Config | (Gerência/Admin) CRUD de Perfis, log, retenção. |

Navegação: menu lateral (componente reutilizável) com itens visíveis por papel.

---

## 6. Fórmulas Power Fx (as principais)

### 6.1 `App.OnStart` — contexto do usuário
```powerapps
// Perfil do usuário logado (por e-mail Entra)
Set(varUser, User());
Set(varPerfil, LookUp(Perfil, cr_email = varUser.Email && cr_ativo = true));
Set(varPapel, If(IsBlank(varPerfil), "Coordenador", Text(varPerfil.cr_papel)));
Set(varArea,  If(IsBlank(varPerfil), "I2M", Text(varPerfil.cr_area)));

// Áreas que o usuário enxerga
Set(varAreas, If(varArea = "ALL", ["I2M","PKCG"], Table({a:varArea}).a));
```

### 6.2 Helpers de horário (Texto HH:MM ↔ minutos)
```powerapps
// minutos a partir de "HH:MM"
Set(fnToMin, "");   // (Power Fx não tem função nomeada; use as expressões abaixo inline)

// Exemplos inline:
// minutos:  Value(Left(txt,2))*60 + Value(Right(txt,2))
// somar N min a "HH:MM" e formatar (com virada de meia-noite):
With(
    { m: Mod( Value(Left(hhmm,2))*60 + Value(Right(hhmm,2)) + minutos, 1440) },
    Text(Int(m/60),"[$-en]00") & ":" & Text(Mod(m,60),"[$-en]00")
)
```
> Dica: crie **componentes de fórmula nomeada** (Named Formulas) ou use `With(...)` para reaproveitar.

### 6.3 Tela Nova Solicitação — ao escolher o colaborador
Quando o usuário seleciona um item da galeria/combobox de colaboradores (`cmbColab`):
```powerapps
// Preenche escala e trava a HE na saída
Set(varColab, cmbColab.Selected);
Set(varSaida, varColab.cr_saida);
Set(varEntrada, varColab.cr_entrada);

UpdateContext({
    ctxMatricula: varColab.cr_matricula,
    ctxColaborador: varColab.cr_nome,
    ctxSetor: varColab.cr_setor,
    ctxTurno: Text(varColab.cr_turno),
    ctxAreaSolic: Text(varColab.cr_area),
    ctxHoraIni: varSaida,   // HE começa na SAÍDA (após bater o ponto)
    ctxHoraFim: With(
        { m: Mod(Value(Left(varSaida,2))*60 + Value(Right(varSaida,2)) + 120, 1440) },
        Text(Int(m/60),"00") & ":" & Text(Mod(m,60),"00")
    )  // padrão +2h
});
```
- `txtHoraIni` fica **bloqueado** (`DisplayMode.Disabled`) quando há escala (`!IsBlank(varSaida)`).
- Card "Escala atual": `"Entrada " & ctxEntrada & " · Saída " & ctxSaida & " · " & varColab.cr_turma`.

### 6.4 Total de horas e validação (≤ 2h e "só após a saída")
```powerapps
// total = (fim - ini) em horas, com virada de meia-noite
Set(varTotal,
    With(
        { mi: Value(Left(ctxHoraIni,2))*60 + Value(Right(ctxHoraIni,2)),
          mf: Value(Left(ctxHoraFim,2))*60 + Value(Right(ctxHoraFim,2)) },
        Round( Mod(mf - mi + 1440, 1440) / 60, 2)
    )
);
Set(varExcede, varTotal > 2 || varTotal <= 0);
// regra "só após a saída": a hora inicial precisa ser a saída da escala
Set(varInicioInvalido, !IsBlank(varSaida) && ctxHoraIni <> varSaida);
```

### 6.5 Bloqueio de 24h por rejeição
```powerapps
Set(varBloqueio24h,
    !IsBlank(
        LookUp(SolicitacaoHE,
            cr_matricula = ctxMatricula
            && cr_status = 'StatusHE'.'Rejeitada'
            && cr_data_decisao > (Now() - 1)   // 1 = 24h em Power Fx (dias)
        )
    )
);
```

### 6.6 Prevenção de sobreposição (mesma matrícula/data/horário)
```powerapps
Set(varConflito,
    CountRows(
        Filter(SolicitacaoHE,
            cr_matricula = ctxMatricula
            && cr_data = dpData.SelectedDate
            && cr_status in ["Pendente Supervisor","Pendente Gerência","Aprovada"]
            && ctxHoraIni < cr_hora_final
            && ctxHoraFim > cr_hora_inicial
        )
    ) > 0
);
```

### 6.7 Botão "Enviar" — criar a solicitação (com fluxo de aprovação)
```powerapps
If(varExcede, Notify("Limite de 2h ou horário inválido.", NotificationType.Error),
   varBloqueio24h, Notify("Colaborador bloqueado por rejeição nas últimas 24h.", NotificationType.Error),
   varConflito, Notify("Já existe solicitação nesse horário para a matrícula.", NotificationType.Error),
   varInicioInvalido, Notify("A HE deve iniciar no horário de saída da escala.", NotificationType.Error),
   // OK -> criar
   Patch(SolicitacaoHE, Defaults(SolicitacaoHE),
     {
        cr_numero: "HE-" & Text(Now(),"[$-en]yyyymmddhhmmss") & "-" &
                   Upper(Right("000" & Text(RandBetween(0,65535),"[$-en]"), 4)),
        cr_colaborador: ctxColaborador,
        cr_matricula: ctxMatricula,
        cr_setor: ctxSetor,
        cr_turno: Switch(ctxTurno,"T1",'Turno'.T1,"T2",'Turno'.T2,"T3",'Turno'.T3,'Turno'.ADM),
        cr_data: dpData.SelectedDate,
        cr_hora_inicial: ctxHoraIni,
        cr_hora_final: ctxHoraFim,
        cr_total_horas: varTotal,
        cr_motivo: txtMotivo.Text,
        cr_observacoes: txtObs.Text,
        cr_area: Switch(ctxAreaSolic,"PKCG",'Área'.PKCG,'Área'.I2M),
        cr_gestor_papel: Switch(varPapel,"Supervisor",'Papel'.Supervisor,"Gerência",'Papel'.Gerência,'Papel'.Coordenador),
        cr_solicitante: varPerfil,
        // FLUXO: coordenador -> Supervisor; supervisor/gerência -> Gerência
        cr_status: If(varPapel = "Coordenador",
                      'StatusHE'.'Pendente Supervisor',
                      'StatusHE'.'Pendente Gerência')
     }
   );
   Notify("Solicitação enviada!", NotificationType.Success);
   Navigate(scrMinhas)
);
```

### 6.8 Aprovar / Rejeitar (tela Aprovações)
Fila filtrada por papel:
```powerapps
// galObras.Items
Filter(SolicitacaoHE,
    cr_status = If(varPapel="Supervisor",
                   'StatusHE'.'Pendente Supervisor',
                   'StatusHE'.'Pendente Gerência')
    && (varArea = "ALL" || Text(cr_area) = varArea)
)
```
Botão **Aprovar**:
```powerapps
Patch(SolicitacaoHE, galFila.Selected,
  If(varPapel = "Supervisor",
     // supervisor aprova -> segue para gerência
     { cr_status: 'StatusHE'.'Pendente Gerência',
       cr_supervisor: varPerfil,
       cr_data_decisao: Now() },
     // gerência aprova -> final
     { cr_status: 'StatusHE'.Aprovada,
       cr_gerente: varPerfil,
       cr_obs_gerencia: txtObsGer.Text,
       cr_data_decisao: Now() }
  )
);
Notify("Solicitação aprovada.", NotificationType.Success);
```
Botão **Rejeitar** (dispara o bloqueio de 24h automaticamente pela regra 6.5):
```powerapps
Patch(SolicitacaoHE, galFila.Selected,
  { cr_status: 'StatusHE'.Rejeitada,
    cr_data_decisao: Now(),
    cr_rejeitada_em: Now(),
    cr_obs_gerencia: txtObsGer.Text,
    cr_gerente: If(varPapel="Gerência", varPerfil, galFila.Selected.cr_gerente),
    cr_supervisor: If(varPapel="Supervisor", varPerfil, galFila.Selected.cr_supervisor) }
);
```

### 6.9 Solicitação em Massa (HE por escala de cada colaborador)
Galeria `galColab` com **checkbox** e coleção de selecionados `colSelecionados`.
Ao enviar, use **ForAll + Patch** calculando por colaborador:
```powerapps
// duração escolhida (0.5/1/1.5/2) em ddDuracao.Selected.Value
ForAll(
    colSelecionados As c,
    If( IsBlank(c.cr_saida),
        false,  // sem escala -> pula (registre em colFalhas se quiser)
        Patch(SolicitacaoHE, Defaults(SolicitacaoHE),
          {
            cr_numero: "HE-" & Text(Now(),"[$-en]yyyymmddhhmmss") & "-" &
                       Upper(Right("000" & Text(RandBetween(0,65535),""),4)),
            cr_colaborador: c.cr_nome,
            cr_matricula: c.cr_matricula,
            cr_setor: c.cr_setor,
            cr_turno: c.cr_turno,
            cr_data: dpDataMassa.SelectedDate,
            cr_hora_inicial: c.cr_saida,
            cr_hora_final: With(
                { m: Mod(Value(Left(c.cr_saida,2))*60 + Value(Right(c.cr_saida,2))
                         + ddDuracao.Selected.Value*60, 1440) },
                Text(Int(m/60),"00") & ":" & Text(Mod(m,60),"00")
            ),
            cr_total_horas: ddDuracao.Selected.Value,
            cr_motivo: txtMotivoMassa.Text,
            cr_area: c.cr_area,
            cr_gestor_papel: Switch(varPapel,"Supervisor",'Papel'.Supervisor,"Gerência",'Papel'.Gerência,'Papel'.Coordenador),
            cr_solicitante: varPerfil,
            cr_status: If(varPapel="Coordenador",'StatusHE'.'Pendente Supervisor','StatusHE'.'Pendente Gerência')
          }
        )
    )
);
Notify("Solicitações em massa criadas.", NotificationType.Success);
```
> Cada colaborador recebe HE **iniciando na própria saída**, exatamente como no app atual (ex.: um sai 14:10 → 14:10–16:10; outro 22:10 → 22:10–00:10).

### 6.10 KPIs do Dashboard (exemplos)
```powerapps
// Pendentes p/ meu papel
CountRows(Filter(SolicitacaoHE,
    cr_status = If(varPapel="Supervisor",'StatusHE'.'Pendente Supervisor','StatusHE'.'Pendente Gerência')
    && (varArea="ALL" || Text(cr_area)=varArea)))
// Aprovadas hoje
CountRows(Filter(SolicitacaoHE, cr_status='StatusHE'.Aprovada && DateValue(cr_data_decisao)=Today()))
```

---

## 7. Power Automate (fluxos)

1. **Notificar aprovador** (gatilho: *When a row is added* em `SolicitacaoHE`)
   - Se `Status = Pendente Supervisor` → e-mail/Teams aos Supervisores da Área.
   - Se `Status = Pendente Gerência` → e-mail/Teams à Gerência.
2. **Notificar decisão** (gatilho: *When a row is modified*, filtro `Status in (Aprovada, Rejeitada)`) → e-mail ao solicitante (substitui o Resend).
3. **Retenção/limpeza** (agendado) → arquivar/excluir solicitações antigas (equivale ao `retention_policy`).
4. *(Opcional)* **ADP** → fluxo placeholder que consulta um serviço de ponto real quando existir (hoje é mock no app).

> Conectores usados: **Microsoft Dataverse**, **Office 365 Outlook** (e-mail), **Microsoft Teams** (mensagem/adaptive card), **Office 365 Users** (achar aprovadores por papel/área).

---

## 8. Tema / Branding DHL

- **Cores**: Amarelo `#FFCC00` (primária/realces), Vermelho `#D40511` (ações/erros), textos slate escuros.
- Configure o **Theme** do Canvas App (App.Formulas ou `Set(varTheme, {...})`) e reutilize:
```powerapps
Set(varTheme, {
    amarelo: ColorValue("#FFCC00"),
    vermelho: ColorValue("#D40511"),
    texto: ColorValue("#0F172A"),
    fundo: ColorValue("#FFFFFF")
});
```
- Botão primário: preenchimento vermelho, texto branco, bordas arredondadas. Cabeçalho com faixa amarela + logo SmartTime.
- Ícones: use a biblioteca de ícones do Power Apps (evite emojis), coerente com o app atual.

---

## 9. Passo a passo de implementação (ordem recomendada)

1. Criar **ambiente** com Dataverse (Power Platform admin).
2. Criar as **Choices** (Papel, Área, Turno, StatusHE).
3. Criar tabelas **Perfil**, **Colaborador** (com Alternate Key na Matrícula), **SolicitacaoHE**.
4. Rodar o **Dataflow** de importação da planilha → popular `Colaborador`.
5. Cadastrar os **Perfis** (você + contas de teste) com papel/área.
6. Criar o **Canvas App**, adicionar as tabelas como fontes de dados.
7. Montar `App.OnStart` (seção 6.1) e o **tema** (seção 8).
8. Construir telas na ordem: Login → Dashboard → Nova → Massa → Minhas → Aprovações → Detalhe → Admin.
9. Implementar as **fórmulas Power Fx** (seção 6) em cada controle.
10. Criar os **fluxos Power Automate** (seção 7).
11. Aplicar **Security Roles** no Dataverse conforme papéis.
12. Testar os fluxos: criar (coordenador) → aprovar (supervisor) → aprovar (gerência); rejeição + bloqueio 24h; massa por escala; gerência criando/aprovando a própria HE.
13. **Publicar** e compartilhar o app com os grupos Entra corretos.

---

## 10. Mapa de paridade (app atual → Power Apps)

| Funcionalidade (SmartTime React) | Como fica no Power Apps |
|---|---|
| Login por e-mail/senha + área | Login Entra automático + `Perfil` (papel/área) |
| RBAC 3 níveis + admin | Choice `Papel` + Security Roles + visibilidade Power Fx |
| Fluxo Coordenador→Supervisor→Gerência | `cr_status` + fórmulas de Aprovar/Rejeitar (6.7/6.8) |
| Supervisor cria → vai p/ Gerência | `If(varPapel<>"Coordenador", Pendente Gerência)` |
| Gerência cria + aprova própria HE | Massa/Nova liberadas p/ Gerência; ela aprova em Aprovações |
| Limite de 2h | `varExcede` (6.4) + validação no Patch |
| HE só após a saída (bater o ponto) | `ctxHoraIni = cr_saida`, campo bloqueado, `varInicioInvalido` |
| Solicitação em massa por escala | `ForAll` calculando saída de cada colaborador (6.9) |
| Bloqueio de 24h por rejeição | `varBloqueio24h` (6.5) |
| Prevenção de sobreposição | `varConflito` (6.6) |
| Número da solicitação `HE-...` | fórmula de `cr_numero` (6.7) |
| Anexos/comprovantes | Anexos nativos do Dataverse |
| E-mails (Resend) | Power Automate + Outlook |
| Notificações push | Notificações Power Apps / Teams |
| Categorização por IA | **Removida** (não recriar) |
| Ponto ADP (mock) | Fluxo placeholder (conector custom futuro) |
| Exportar PDF/Excel | `Download`/PDF via Power Automate (Word/HTML→PDF) ou "Export to Excel" nativo |

---

### Observações finais
- Este blueprint é **portável**: nomes lógicos (`cr_*`) usam o prefixo padrão de publisher — ajuste ao prefixo do seu ambiente.
- As fórmulas Power Fx foram escritas fiéis às regras do backend atual (status, fluxo, 2h, HE após saída, bloqueio 24h, número da HE, massa por escala).
- A categorização por IA foi **descontinuada** no app atual e **não** deve ser recriada.
