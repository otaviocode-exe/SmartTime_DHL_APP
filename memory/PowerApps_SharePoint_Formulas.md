# SmartTime! — Fórmulas Power Fx (versão SHAREPOINT)

Blocos prontos para colar no Canvas App usando as listas do SharePoint:
**`SmartUs-HE`**, **`SmartUs-Colaboradores`**, **`SmartUs-Perfis`**.
Filtro por **Setor** (campo `Area`). **Colaborador afastado (`Ativo <> "Sim"`) é bloqueado.**

---

## ⚠️ Leia antes (3 observações de SharePoint)

1. **Coluna "Título"**: cada lista tem a coluna obrigatória *Título*. Usamos:
   - `SmartUs-HE` → Título = **Numero** (no Patch usamos `Title:`)
   - `SmartUs-Colaboradores` → Título = **Matricula**
   - `SmartUs-Perfis` → Título = **Nome**
   > Se em alguma fórmula o `.Matricula`/`.Nome` não resolver, use `.Title` (é a mesma coluna).
2. **Colunas de Escolha (Choice)** no SharePoint usam `.Value`:
   - Ler/filtrar: `Status.Value = "Aprovada"`
   - Gravar: `{ Status: { Value: "Aprovada" } }`
3. **Delegação**: alguns filtros (setores múltiplos, sobreposição) não são delegáveis no SharePoint.
   Como a base tem ~500 itens, vá em **Configurações → Geral → Limite de linhas de dados = 2000**. Fica ok para este volume.
4. Separador de argumentos em pt-BR = **;** (ponto e vírgula). Se seu ambiente usar vírgula, troque `;` por `,`.

---

## 1) `App.Formulas`  (cole tudo)

```powerapps
// ----- Helpers de horário -----
ToMin(hhmm:Text): Number =
    Value(Left(hhmm;2))*60 + Value(Right(hhmm;2));

AddMin(hhmm:Text; mins:Number): Text =
    With({ m: Mod(ToMin(hhmm) + mins; 1440) };
        Text(Int(m/60);"[$-en-US]00") & ":" & Text(Mod(m;60);"[$-en-US]00"));

DiffHoras(ini:Text; fim:Text): Number =
    Round( Mod(ToMin(fim) - ToMin(ini) + 1440; 1440) / 60; 2);

NovoNumeroHE(): Text =
    "HE-" & Text(Now();"[$-en-US]yyyymmddhhmmss") & "-" &
    Upper(Right("000" & Text(RandBetween(0;65535);"[$-en-US]");4));

// ----- Contexto do usuário (login Microsoft/Entra) -----
UserPerfil = LookUp('SmartUs-Perfis'; Lower(Email) = Lower(User().Email) && Ativo = "Sim");
UserPapel  = If(IsBlank(UserPerfil); "Coordenador"; UserPerfil.Papel.Value);
VeTudo     = !IsBlank(UserPerfil) && (UserPapel = "Gerência" || UserPapel = "Admin");

// ----- Tema DHL -----
Tema = { amarelo: ColorValue("#FFCC00"); vermelho: ColorValue("#D40511"); texto: ColorValue("#0F172A"); cinza: ColorValue("#64748B") };
```

---

## 2) `App.OnStart`  (cole tudo)

```powerapps
// Setores que o usuário cobre (coluna Areas = escolha múltipla)
ClearCollect(colUserAreas; ForAll( If(IsBlank(UserPerfil); Blank(); UserPerfil.Areas) As a; a.Value ));

// coleções da tela de massa
Clear(colSelecionados); Clear(colFalhas);
```

> `colUserAreas` fica com a lista de setores do usuário. Gerência/Admin ignoram isso (veem tudo via `VeTudo`).

---

## 3) Tela **Nova Solicitação** (`scrNova`)

### 3.1 `cmbColab` → **Items**  (só ativos + setores do usuário)
```powerapps
Filter('SmartUs-Colaboradores';
    Ativo = "Sim" && (VeTudo || Area in colUserAreas)
)
```
### 3.2 `cmbColab` → **OnChange**
```powerapps
Set(varSaida; cmbColab.Selected.Saida);
UpdateContext({
    ctxMat: cmbColab.Selected.Matricula;
    ctxNome: cmbColab.Selected.Nome;
    ctxCargo: cmbColab.Selected.Cargo;
    ctxArea: cmbColab.Selected.Area;
    ctxTurno: cmbColab.Selected.Turno.Value;
    ctxEntrada: cmbColab.Selected.Entrada;
    ctxSaida: cmbColab.Selected.Saida;
    ctxAtivo: cmbColab.Selected.Ativo;
    ctxIni: cmbColab.Selected.Saida;
    ctxFim: AddMin(cmbColab.Selected.Saida; 120)
})
```
### 3.3 `lblEscala` → **Text**  (mostra cargo, área, escala, ativo)
```powerapps
If(IsBlank(ctxNome);
   "Selecione um colaborador.";
   "Cargo: " & ctxCargo & "  |  Setor: " & ctxArea & Char(10) &
   "Escala: " & cmbColab.Selected.Escala & "  (Entrada " & ctxEntrada & " · Saída " & ctxSaida & ")" & Char(10) &
   If(ctxAtivo = "Sim";
      "Situação: ATIVO — HE começa às " & ctxSaida & " (após bater o ponto), até no máx. 2h (" & AddMin(ctxSaida;120) & ").";
      "⚠ AFASTADO (" & cmbColab.Selected.Situacao & ") — não pode receber HE.")
)
```
### 3.4 `lblEscala` → **Color** (opcional)
```powerapps
If(!IsBlank(ctxNome) && ctxAtivo <> "Sim"; Tema.vermelho; Tema.texto)
```
### 3.5 `txtHoraIni` → **Default** = `ctxIni` | **DisplayMode** =
```powerapps
If(IsBlank(varSaida); DisplayMode.Edit; DisplayMode.Disabled)
```
### 3.6 `txtHoraFim` → **Default** = `ctxFim`
### 3.7 `lblTotal` → **Text**
```powerapps
"Total: " & Text(DiffHoras(txtHoraIni.Text; txtHoraFim.Text)) & "h"
```
### 3.8 `btnEnviar` → **DisplayMode** (trava se afastado)
```powerapps
If(!IsBlank(ctxNome) && ctxAtivo = "Sim"; DisplayMode.Edit; DisplayMode.Disabled)
```
### 3.9 `btnEnviar` → **OnSelect**
```powerapps
With({ total: DiffHoras(txtHoraIni.Text; txtHoraFim.Text) };
  If(
    ctxAtivo <> "Sim";
        Notify("Colaborador afastado — não pode receber HE."; NotificationType.Error);
    total <= 0 || total > 2;
        Notify("Total inválido: maior que 0 e no máximo 2h."; NotificationType.Error);
    !IsBlank(ctxSaida) && txtHoraIni.Text <> ctxSaida;
        Notify("A HE deve iniciar às " & ctxSaida & " (saída da escala), após bater o ponto."; NotificationType.Error);
    !IsBlank(LookUp('SmartUs-HE';
        Matricula = ctxMat && Status.Value = "Rejeitada" && RejeitadaEm > (Now() - 1)));
        Notify("Colaborador bloqueado por rejeição nas últimas 24h."; NotificationType.Error);
    CountRows(Filter('SmartUs-HE';
        Matricula = ctxMat && Data = dpData.SelectedDate
        && (Status.Value = "Pendente Supervisor" || Status.Value = "Pendente Gerência" || Status.Value = "Aprovada")
        && txtHoraIni.Text < HoraFinal && txtHoraFim.Text > HoraInicial)) > 0;
        Notify("Já existe solicitação nesse horário para a matrícula."; NotificationType.Error);
    // ---- OK: criar ----
    Patch('SmartUs-HE'; Defaults('SmartUs-HE');
    {
        Title: NovoNumeroHE();
        Colaborador: ctxNome;
        Matricula: ctxMat;
        Cargo: ctxCargo;
        Area: ctxArea;
        Turno: ctxTurno;
        Data: dpData.SelectedDate;
        HoraInicial: txtHoraIni.Text;
        HoraFinal: txtHoraFim.Text;
        TotalHoras: total;
        Motivo: txtMotivo.Text;
        Observacoes: txtObs.Text;
        GestorPapel: UserPapel;
        SolicitanteEmail: User().Email;
        SolicitanteNome: User().FullName;
        Status: { Value: If(UserPapel = "Coordenador"; "Pendente Supervisor"; "Pendente Gerência") }
    });
    Notify("Solicitação enviada!"; NotificationType.Success);
    Navigate(scrMinhas)
  )
)
```

---

## 4) Tela **Solicitação em Massa** (`scrMassa`)

### 4.1 `galColab` → **Items** (ativos + setores do usuário)
```powerapps
Filter('SmartUs-Colaboradores';
    Ativo = "Sim" && (VeTudo || Area in colUserAreas)
)
```
### 4.2 `chkSel` → **OnCheck** = `Collect(colSelecionados; ThisItem)`
### 4.3 `chkSel` → **OnUncheck** = `Remove(colSelecionados; ThisItem)`
### 4.4 `lblSelecionados` → **Text** = `CountRows(colSelecionados) & " selecionado(s)"`
### 4.5 `ddDuracao` → **Items**
```powerapps
Table({Nome:"30 minutos"; Valor:0.5}; {Nome:"1 hora"; Valor:1}; {Nome:"1h30"; Valor:1.5}; {Nome:"2 horas"; Valor:2})
```
(defina o **Value** do dropdown como `Nome`)

### 4.6 `btnEnviarMassa` → **OnSelect**
```powerapps
If(CountRows(colSelecionados) = 0;
    Notify("Selecione pelo menos um colaborador."; NotificationType.Error);
    Clear(colFalhas);
    ForAll(colSelecionados As c;
        If( c.Ativo <> "Sim" || IsBlank(c.Saida);
            Collect(colFalhas; { nome: c.Nome; motivo: If(c.Ativo<>"Sim";"Afastado";"Sem escala") });
            Patch('SmartUs-HE'; Defaults('SmartUs-HE');
            {
                Title: NovoNumeroHE();
                Colaborador: c.Nome;
                Matricula: c.Matricula;
                Cargo: c.Cargo;
                Area: c.Area;
                Turno: c.Turno.Value;
                Data: dpDataMassa.SelectedDate;
                HoraInicial: c.Saida;
                HoraFinal: AddMin(c.Saida; ddDuracao.Selected.Valor * 60);
                TotalHoras: ddDuracao.Selected.Valor;
                Motivo: txtMotivoMassa.Text;
                GestorPapel: UserPapel;
                SolicitanteEmail: User().Email;
                SolicitanteNome: User().FullName;
                Status: { Value: If(UserPapel = "Coordenador"; "Pendente Supervisor"; "Pendente Gerência") }
            })
        )
    );
    Notify(CountRows(colSelecionados) - CountRows(colFalhas) & " criada(s). " &
           If(CountRows(colFalhas) > 0; CountRows(colFalhas) & " ignorada(s) (afastado/sem escala)."; ""); NotificationType.Success);
    Clear(colSelecionados)
)
```

---

## 5) Tela **Aprovações** (`scrAprov`)

### 5.1 `galFila` → **Items** (fila por papel + setores do usuário)
```powerapps
Filter('SmartUs-HE';
    Status.Value = If(UserPapel = "Supervisor"; "Pendente Supervisor"; "Pendente Gerência")
    && (VeTudo || Area in colUserAreas)
)
```
### 5.2 `btnAprovar` → **OnSelect**
```powerapps
Patch('SmartUs-HE'; galFila.Selected;
    If(UserPapel = "Supervisor";
        { Status: { Value: "Pendente Gerência" }; SupervisorNome: User().FullName; DataDecisao: Now() };
        { Status: { Value: "Aprovada" }; GerenteNome: User().FullName; ObsGerencia: txtObsGer.Text; DataDecisao: Now() }
    )
);
Notify("Solicitação aprovada."; NotificationType.Success)
```
### 5.3 `btnRejeitar` → **OnSelect** (aciona o bloqueio de 24h)
```powerapps
Patch('SmartUs-HE'; galFila.Selected;
    { Status: { Value: "Rejeitada" };
      DataDecisao: Now(); RejeitadaEm: Now();
      ObsGerencia: txtObsGer.Text;
      GerenteNome: If(UserPapel = "Gerência"; User().FullName; galFila.Selected.GerenteNome);
      SupervisorNome: If(UserPapel = "Supervisor"; User().FullName; galFila.Selected.SupervisorNome) }
);
Notify("Solicitação rejeitada."; NotificationType.Warning)
```

---

## 6) Tela **Minhas Solicitações** (`scrMinhas`)

### `galMinhas` → **Items**
```powerapps
SortByColumns(
    Filter('SmartUs-HE'; Lower(SolicitanteEmail) = Lower(User().Email));
    "Created"; SortOrder.Descending
)
```

---

## 7) **Dashboard** (labels de KPI)

### Pendentes p/ meu papel
```powerapps
CountRows(Filter('SmartUs-HE';
    Status.Value = If(UserPapel = "Supervisor"; "Pendente Supervisor"; "Pendente Gerência")
    && (VeTudo || Area in colUserAreas)))
```
### Aprovadas hoje
```powerapps
CountRows(Filter('SmartUs-HE';
    Status.Value = "Aprovada" && DateValue(DataDecisao) = Today()))
```
### Rejeitadas hoje
```powerapps
CountRows(Filter('SmartUs-HE';
    Status.Value = "Rejeitada" && DateValue(DataDecisao) = Today()))
```

---

## 8) Regras implementadas (resumo)

| Regra | Onde |
|---|---|
| Filtro por **Setor** (Coordenador/Supervisor) e "vê tudo" (Gerência/Admin) | `colUserAreas` + `VeTudo` em todos os `Filter` |
| **Bloquear afastado** (`Ativo <> "Sim"`) | `lblEscala`, `btnEnviar.DisplayMode`, `btnEnviar.OnSelect`, massa |
| HE só **após a saída** (início travado) | `txtHoraIni.DisplayMode` + validação no `OnSelect` |
| Limite de **2h** | `DiffHoras` + validação |
| **Bloqueio de 24h** por rejeição | `LookUp(... RejeitadaEm > Now()-1)` |
| **Sobreposição** de horário | `CountRows(Filter(...))` |
| Fluxo **Coord→Sup→Gerência** (e Sup/Gerência direto p/ Gerência) | `Status` no create + Aprovar |
| **Massa** por escala de cada colaborador | `ForAll` com `c.Saida` |
| Número `HE-...` | `NovoNumeroHE()` |

> Cargo, Área (setor), Escala e Situação vêm da lista `SmartUs-Colaboradores` e aparecem em `lblEscala`.
