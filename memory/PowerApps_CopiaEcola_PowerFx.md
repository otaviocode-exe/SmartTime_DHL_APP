# SmartTime! — Esqueleto Copia-e-Cola (Power Fx)

Blocos prontos para colar no Power Apps. Você **cria o controle** (botão, galeria, campo…) e **cola o código na propriedade indicada**.
Quando algum nome não bater com o seu ambiente, me avise que eu ajusto.

---

## 🔧 LEGENDA — o que você troca (só 3 coisas)

1. **Prefixo das colunas** `cr_` → o prefixo do SEU publisher (ex.: `dhl_`). Ex.: `cr_saida` → `dhl_saida`.
2. **Nomes das fontes de dados** `Perfil`, `Colaborador`, `SolicitacaoHE` → como você nomeou as tabelas Dataverse.
3. **Nomes dos controles** (`cmbColab`, `dpData`, `txtMotivo`…) → use os mesmos nomes desta lista, OU renomeie no código.

> Dica: se você nomear os controles EXATAMENTE como abaixo, é só colar sem mexer em quase nada.

### Nomes de controle usados (cole com estes nomes)
| Tela | Controle | Tipo |
|---|---|---|
| scrNova | `cmbColab` | Combo box (fonte: Colaborador) |
| scrNova | `dpData` | Date picker |
| scrNova | `txtHoraIni` | Text input |
| scrNova | `txtHoraFim` | Text input |
| scrNova | `txtMotivo` | Text input (multiline) |
| scrNova | `txtObs` | Text input (multiline) |
| scrNova | `lblEscala` `lblTotal` | Labels |
| scrNova | `btnEnviar` | Button |
| scrMassa | `galColab` | Gallery (fonte: Colaborador) |
| scrMassa | `chkSel` | Checkbox (dentro da galeria) |
| scrMassa | `dpDataMassa` | Date picker |
| scrMassa | `ddDuracao` | Dropdown |
| scrMassa | `txtMotivoMassa` | Text input |
| scrMassa | `btnEnviarMassa` | Button |
| scrMassa | `lblSelecionados` | Label |
| scrAprov | `galFila` | Gallery (fonte: SolicitacaoHE) |
| scrAprov | `txtObsGer` | Text input |
| scrAprov | `btnAprovar` `btnRejeitar` | Buttons |

---

## 1) `App.Formulas`  (cole TUDO isto de uma vez)

> No painel da árvore, clique em **App** → propriedade **Formulas**. Estes são helpers e variáveis "vivas" (recalculam sozinhos).
> Se as **User-Defined Functions** estiverem desativadas: vá em **Configurações → Recursos futuros → User-defined functions = Ativado**.

```powerapps
// ---------- Helpers de horário ----------
ToMin(hhmm:Text): Number =
    Value(Left(hhmm,2))*60 + Value(Right(hhmm,2));

AddMin(hhmm:Text; mins:Number): Text =
    With({ m: Mod(ToMin(hhmm) + mins, 1440) },
        Text(Int(m/60),"[$-en-US]00") & ":" & Text(Mod(m,60),"[$-en-US]00"));

DiffHoras(ini:Text; fim:Text): Number =
    Round( Mod(ToMin(fim) - ToMin(ini) + 1440, 1440) / 60, 2);

NovoNumeroHE(): Text =
    "HE-" & Text(Now(),"[$-en-US]yyyymmddhhmmss") & "-" &
    Upper(Right("000" & Text(RandBetween(0,65535),"[$-en-US]"),4));

// ---------- Contexto do usuário (login Entra) ----------
UserPerfil = LookUp(Perfil; cr_email = User().Email && cr_ativo = true);
UserPapel  = If(IsBlank(UserPerfil); "Coordenador"; Text(UserPerfil.cr_papel));
UserArea   = If(IsBlank(UserPerfil); "I2M"; Text(UserPerfil.cr_area));
VeTudo     = (UserArea = "ALL");

// ---------- Tema DHL ----------
Tema = {
    amarelo: ColorValue("#FFCC00"),
    vermelho: ColorValue("#D40511"),
    texto: ColorValue("#0F172A"),
    cinza: ColorValue("#64748B"),
    fundo: ColorValue("#FFFFFF")
};
```

> ⚠️ Observação de sintaxe: em `App.Formulas` os parâmetros de função usam **;** (ponto e vírgula). Se o seu ambiente usar vírgula como separador, troque `;` por `,`.

---

## 2) `App.OnStart`  (cole isto)

```powerapps
// Coleções auxiliares vazias (selecionados e falhas da massa)
ClearCollect(colSelecionados; Blank()); Clear(colSelecionados);
ClearCollect(colFalhas; Blank()); Clear(colFalhas);
```

---

## 3) Tela **Nova Solicitação** (`scrNova`)

### 3.1 `cmbColab`  → propriedade **OnChange**
```powerapps
Set(varSaida; cmbColab.Selected.cr_saida);
UpdateContext({
    ctxMat: cmbColab.Selected.cr_matricula;
    ctxNome: cmbColab.Selected.cr_nome;
    ctxSetor: cmbColab.Selected.cr_setor;
    ctxTurno: Text(cmbColab.Selected.cr_turno);
    ctxArea: Text(cmbColab.Selected.cr_area);
    ctxEntrada: cmbColab.Selected.cr_entrada;
    ctxSaida: cmbColab.Selected.cr_saida
});
// HE começa na SAÍDA e vai +2h por padrão
Reset(txtHoraIni); Reset(txtHoraFim);
UpdateContext({ ctxIni: ctxSaida; ctxFim: AddMin(ctxSaida; 120) });
```

### 3.2 `txtHoraIni` → **Default** = `ctxIni`  |  **DisplayMode** =
```powerapps
If(IsBlank(varSaida); DisplayMode.Edit; DisplayMode.Disabled)
```
### 3.3 `txtHoraFim` → **Default** = `ctxFim`

### 3.4 `lblEscala` → **Text**
```powerapps
If(IsBlank(ctxSaida);
   "Selecione um colaborador para ver a escala.";
   "Escala atual: Entrada " & ctxEntrada & " · Saída " & ctxSaida &
   "  |  A HE começa na saída (após bater o ponto), até no máx. 2h (" & AddMin(ctxSaida;120) & ")."
)
```
### 3.5 `lblTotal` → **Text**  (e **Color** opcional)
```powerapps
"Total: " & Text(DiffHoras(txtHoraIni.Text; txtHoraFim.Text)) & "h"
```

### 3.6 `btnEnviar` → **OnSelect**  (validações + criação com fluxo de aprovação)
```powerapps
With(
    {
        total: DiffHoras(txtHoraIni.Text; txtHoraFim.Text)
    };
    If(
        // regra 2h e horário coerente
        total <= 0 || total > 2;
            Notify("Total inválido: a HE deve ser maior que 0 e no máximo 2h."; NotificationType.Error);
        // HE só após a saída
        !IsBlank(ctxSaida) && txtHoraIni.Text <> ctxSaida;
            Notify("A HE deve iniciar às " & ctxSaida & " (saída da escala), após bater o ponto."; NotificationType.Error);
        // bloqueio de 24h por rejeição
        !IsBlank(LookUp(SolicitacaoHE;
            cr_matricula = ctxMat && cr_status = 'Status (SolicitacaoHE)'.'Rejeitada'
            && cr_data_decisao > (Now() - 1)));
            Notify("Colaborador bloqueado por rejeição nas últimas 24h."; NotificationType.Error);
        // sobreposição de horário
        CountRows(Filter(SolicitacaoHE;
            cr_matricula = ctxMat && cr_data = dpData.SelectedDate
            && cr_status in ["Pendente Supervisor";"Pendente Gerência";"Aprovada"]
            && txtHoraIni.Text < cr_hora_final && txtHoraFim.Text > cr_hora_inicial)) > 0;
            Notify("Já existe solicitação nesse horário para a matrícula."; NotificationType.Error);
        // ---- OK: criar ----
        Patch(SolicitacaoHE; Defaults(SolicitacaoHE);
        {
            cr_numero: NovoNumeroHE();
            cr_colaborador: ctxNome;
            cr_matricula: ctxMat;
            cr_setor: ctxSetor;
            cr_turno: Switch(ctxTurno; "T1";'Turno'.T1; "T2";'Turno'.T2; "T3";'Turno'.T3; 'Turno'.ADM);
            cr_data: dpData.SelectedDate;
            cr_hora_inicial: txtHoraIni.Text;
            cr_hora_final: txtHoraFim.Text;
            cr_total_horas: total;
            cr_motivo: txtMotivo.Text;
            cr_observacoes: txtObs.Text;
            cr_area: Switch(ctxArea; "PKCG";'Área'.PKCG; 'Área'.I2M);
            cr_gestor_papel: Switch(UserPapel; "Supervisor";'Papel'.Supervisor; "Gerência";'Papel'.'Gerência'; 'Papel'.Coordenador);
            cr_solicitante: UserPerfil;
            cr_status: If(UserPapel = "Coordenador";
                          'Status (SolicitacaoHE)'.'Pendente Supervisor';
                          'Status (SolicitacaoHE)'.'Pendente Gerência')
        });
        Notify("Solicitação enviada!"; NotificationType.Success);
        Navigate(scrMinhas)
    )
)
```
> ⚠️ Troque `'Status (SolicitacaoHE)'`, `'Turno'`, `'Área'`, `'Papel'` pelos nomes EXATOS das suas Choices (o Power Apps completa sozinho ao digitar `'`).

---

## 4) Tela **Solicitação em Massa** (`scrMassa`)

### 4.1 `galColab` → **Items**  (filtra pela área do usuário)
```powerapps
Filter(Colaborador; VeTudo || Text(cr_area) = UserArea)
```
### 4.2 `chkSel` (checkbox dentro da galeria) → **OnCheck**
```powerapps
Collect(colSelecionados; ThisItem)
```
### 4.3 `chkSel` → **OnUncheck**
```powerapps
Remove(colSelecionados; ThisItem)
```
### 4.4 `lblSelecionados` → **Text**
```powerapps
CountRows(colSelecionados) & " selecionado(s)"
```
### 4.5 `ddDuracao` → **Items**
```powerapps
Table({Nome:"30 minutos"; Valor:0.5}; {Nome:"1 hora"; Valor:1}; {Nome:"1h30"; Valor:1.5}; {Nome:"2 horas"; Valor:2})
```
(defina **Value** do dropdown como `Nome`)

### 4.6 `btnEnviarMassa` → **OnSelect**  (HE por escala de CADA colaborador)
```powerapps
If(CountRows(colSelecionados) = 0;
    Notify("Selecione pelo menos um colaborador."; NotificationType.Error);
    // OK
    Clear(colFalhas);
    ForAll(colSelecionados As c;
        If(IsBlank(c.cr_saida);
            Collect(colFalhas; { nome: c.cr_nome; motivo: "Sem escala/saída" });
            Patch(SolicitacaoHE; Defaults(SolicitacaoHE);
            {
                cr_numero: NovoNumeroHE();
                cr_colaborador: c.cr_nome;
                cr_matricula: c.cr_matricula;
                cr_setor: c.cr_setor;
                cr_turno: c.cr_turno;
                cr_data: dpDataMassa.SelectedDate;
                cr_hora_inicial: c.cr_saida;
                cr_hora_final: AddMin(c.cr_saida; ddDuracao.Selected.Valor * 60);
                cr_total_horas: ddDuracao.Selected.Valor;
                cr_motivo: txtMotivoMassa.Text;
                cr_area: c.cr_area;
                cr_gestor_papel: Switch(UserPapel; "Supervisor";'Papel'.Supervisor; "Gerência";'Papel'.'Gerência'; 'Papel'.Coordenador);
                cr_solicitante: UserPerfil;
                cr_status: If(UserPapel = "Coordenador";
                              'Status (SolicitacaoHE)'.'Pendente Supervisor';
                              'Status (SolicitacaoHE)'.'Pendente Gerência')
            })
        )
    );
    Notify(CountRows(colSelecionados) - CountRows(colFalhas) & " solicitação(ões) criada(s). " &
           If(CountRows(colFalhas)>0; CountRows(colFalhas) & " sem escala."; ""); NotificationType.Success);
    Clear(colSelecionados)
)
```

---

## 5) Tela **Aprovações** (`scrAprov`)

### 5.1 `galFila` → **Items**  (fila conforme papel + área)
```powerapps
Filter(SolicitacaoHE;
    cr_status = If(UserPapel = "Supervisor";
                   'Status (SolicitacaoHE)'.'Pendente Supervisor';
                   'Status (SolicitacaoHE)'.'Pendente Gerência')
    && (VeTudo || Text(cr_area) = UserArea)
)
```
### 5.2 `btnAprovar` → **OnSelect**
```powerapps
Patch(SolicitacaoHE; galFila.Selected;
    If(UserPapel = "Supervisor";
        { cr_status: 'Status (SolicitacaoHE)'.'Pendente Gerência';
          cr_supervisor: UserPerfil; cr_data_decisao: Now() };
        { cr_status: 'Status (SolicitacaoHE)'.'Aprovada';
          cr_gerente: UserPerfil; cr_obs_gerencia: txtObsGer.Text; cr_data_decisao: Now() }
    )
);
Notify("Solicitação aprovada."; NotificationType.Success)
```
### 5.3 `btnRejeitar` → **OnSelect**  (dispara o bloqueio de 24h)
```powerapps
Patch(SolicitacaoHE; galFila.Selected;
    { cr_status: 'Status (SolicitacaoHE)'.'Rejeitada';
      cr_data_decisao: Now(); cr_rejeitada_em: Now();
      cr_obs_gerencia: txtObsGer.Text;
      cr_gerente: If(UserPapel = "Gerência"; UserPerfil; galFila.Selected.cr_gerente);
      cr_supervisor: If(UserPapel = "Supervisor"; UserPerfil; galFila.Selected.cr_supervisor) }
);
Notify("Solicitação rejeitada."; NotificationType.Warning)
```

---

## 6) Tela **Minhas Solicitações** (`scrMinhas`)

### `galMinhas` → **Items**
```powerapps
SortByColumns(
    Filter(SolicitacaoHE; cr_solicitante.cr_email = User().Email);
    "createdon"; SortOrder.Descending
)
```

---

## 7) Tela **Dashboard** (labels de KPI)

### Pendentes (para o meu papel) → **Text**
```powerapps
CountRows(Filter(SolicitacaoHE;
    cr_status = If(UserPapel="Supervisor";
        'Status (SolicitacaoHE)'.'Pendente Supervisor';
        'Status (SolicitacaoHE)'.'Pendente Gerência')
    && (VeTudo || Text(cr_area) = UserArea)))
```
### Aprovadas hoje → **Text**
```powerapps
CountRows(Filter(SolicitacaoHE;
    cr_status = 'Status (SolicitacaoHE)'.'Aprovada'
    && DateValue(cr_data_decisao) = Today()))
```

---

## ✅ Checklist do que você precisa fazer (e onde eu ajudo)

- [ ] Criar as tabelas/Choices do blueprint (`PowerApps_Blueprint_SmartTime.md`, seção 2) — **me chama que eu passo cada coluna**.
- [ ] Importar a planilha para `Colaborador` (Dataflow) — posso te dar as expressões M para extrair **Entrada/Saída** do texto "Horário".
- [ ] Trocar o prefixo `cr_` pelo do seu publisher (se for diferente).
- [ ] Nomear os controles como na tabela da Legenda (ou me diga os seus nomes que eu adapto).
- [ ] Colar os blocos acima nas propriedades indicadas.
- [ ] Se aparecer erro azul/vermelho numa fórmula, **me manda o print/texto do erro** que eu corrijo na hora.

> Me diga por onde quer começar (tabelas, importação da planilha, ou já colar as fórmulas) que eu vou te guiando passo a passo.
