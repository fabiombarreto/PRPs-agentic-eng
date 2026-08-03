# Plano de correção — referências de caminho quebradas no plugin `relay`

**Base:** `relay-plugin-root-audit.md`, neste mesmo diretório · plugin 0.25.0
**Escrito em:** 2026-08-03, com `development` em `4f6023b`. A correção H0 (Fase 1) vive
no branch `feature/plugin-root-visual-paths`, commit `9857be0`, ainda não mergeado nem
publicado — o cache 0.25.0 conserva a forma quebrada até um bump de versão.

> **Nota de sessão.** Durante a elaboração deste plano houve trabalho concorrente
> neste repo: o branch `feature/plugin-root-visual-paths` foi criado a partir de
> `development` e o commit `9857be0` aplicou a correção H0 (Fase 1 do relatório). O
> arquivo de entrada, então em `docs/reports/`, era untracked e foi removido do disco
> no processo; foi restaurado verbatim aqui — 524 linhas, cabeçalhos conferidos um a
> um contra o original. A mudança de diretório é deliberada: `docs/` é scan root do
> `validate` e o relatório o derrubava (ver §1).

---

## 0. Correções ao relatório — verificadas antes de planejar

O relatório é sólido: a causa raiz, a taxonomia e a recomendação (estratégia A′) se
confirmam. Sete pontos, porém, mudam o plano de execução e estão verificados abaixo.

| # | Alegação do relatório | Verificação | Efeito no plano |
|---|---|---|---|
| **0.1** | Fase 1 (H0/C4 visual) pendente | **Já feita e commitada** em `9857be0`, branch `feature/plugin-root-visual-paths`: `visual-verifier.md` (5 linhas) e `relay-design-map.md` (bloco de preflight reescrito) usam `${CLAUDE_PLUGIN_ROOT}/scripts/visual/`. O cache 0.25.0 ainda tem a forma antiga — só um publish resolve. | Fase 1 sai do plano; resta publicar (F6) |
| **0.2** | §9.1 — "não determinado se o manifesto suporta `files`/`include`/`exclude`" | **Resolvido: não existe.** A doc oficial de plugins lista o schema completo de `plugin.json`; não há campo de packaging. Instalação é cópia verbatim do diretório. Confirma também que caminhos que saem do plugin root ("`../shared-utils`") não funcionam após o install. | A′ (mover arquivos) é a **única** via; §9.1 pode ser fechado |
| **0.3** | §6-C — symlink "morto, três kills independentes"; o terceiro seria estrutural e válido em todas as plataformas | **O terceiro kill está factualmente errado.** A doc oficial documenta symlink dentro do marketplace como suportado: link para irmão no mesmo marketplace é **dereferenciado e o conteúdo do alvo é copiado para o cache**. O que mata a opção aqui é o kill nº 1, local: `git config core.symlinks` = `false`. | Continua rejeitada, mas **pelo motivo certo** — senão um mantenedor futuro reabre a discussão sobre premissa falsa |
| **0.4** | §5.2 — defeito de dependência do tooling visual "precisa de correção diferente (vendorizar / install / lazy-import)" | **Existe padrão canônico documentado:** hook `SessionStart` + `${CLAUDE_PLUGIN_DATA}` (diretório persistente, ao contrário de `${CLAUDE_PLUGIN_ROOT}`, que é descartado a cada bump). `plugin.json` hoje não declara `hooks` e `plugins/relay/hooks/` não existe. | Vira workstream próprio (§5) com solução conhecida |
| **0.5** | Escopo da Fase 2 = mover 8 arquivos + atualizar `KNOWLEDGE_BASE.md`/`CLAUDE.md` | **Subdimensionado.** 8 arquivos do corpus `node:test` fixam `docs/context/<template>.md` em constantes e assertions — 55 ocorrências (`figma-visual-first-track-phase{1..5}.test.mjs`, `figma-track-phase{3,4,5}.test.mjs`). Sem atualizá-los, `npm run validate` e o pre-commit quebram. | Fase 2 ganha um passo obrigatório e não trivial |
| **0.6** | §8.2 — "`scan-root-lock.mjs` existe mas não está registrado em `CHECKS`; vale um olhar" | **Falso positivo.** Exporta `withScanRootLock(fn)` — helper de serialização importado pelos testes, não um check. Não pertence a `CHECKS`. | Remover do escopo |
| **0.7** | §8.1 — código proposto para o novo check | Forma de retorno e naming **não** batem com o contrato real. Os checks exportam `runXCheck()` e retornam `{name, ok, findings: [{message, file, line}]}`; `findings` é array de objetos, não de `{rule, at, ref, message}`. A regra R2 proposta (basename nu em qualquer lugar = erro) daria falso positivo no próprio array `OWNED_RESOURCES` do check e em prosa legítima. | Check reescrito na Fase 5 ancorando em backtick, como `path-existence` já faz |

### Números re-medidos (contagem por linha, no estado atual do working tree)

| Classe | Relatório | Medido | Nota |
|---|---|---|---|
| C1 `${CLAUDE_PLUGIN_ROOT}/docs/…` | 18 | **18** | confere |
| C2 `${CLAUDE_PLUGIN_ROOT}/PRPs/…` | 14 | **14** | confere |
| C3 bare aos 8 recursos | ~40 | **51** | contagem por linha, não por token distinto |
| C4 literal `plugins/relay/…` | ~30 | **45** | era 55 antes do fix não commitado |
| Tamanho dos 8 recursos | ~88 KB | **96 KB** | — |

Após o fix de 0.1, **os 45 C4 remanescentes são todos prosa de proveniência** —
âncoras `# SOURCE:`, blocos `See:`, comentários de cabeçalho de script. Nenhum é
caminho executado ou dereferenciado. A classe C4 deixou de ter severidade ALTA.

---

## 1. Armadilha descoberta — relatórios sob `docs/` derrubam o `validate`

Enquanto o relatório esteve em `docs/reports/`, `npm run validate` ficou vermelho:

```
10 passed, 1 failed (11 checks run)
[FAIL] path-existence — 9 findings, todos no arquivo do relatório
```

`docs/` é um dos dois `SCAN_ROOTS` de `path-existence`. O relatório citava
`` `scripts/visual/capture.mjs` ``, `` `scripts/normalize-test-output.mjs` `` etc. entre
backticks; o check resolve esses tokens contra a raiz do repo, onde não existem —
estão sob `plugins/relay/scripts/`. Como `.githooks/pre-commit` roda `validate`,
**nenhum commit passa enquanto um documento assim estiver sob `docs/`**.

**Regra adotada:** documento analítico que cite caminhos internos do plugin vive em
`PRPs/reports/<assunto>/`, nunca em `docs/reports/`. `PRPs/` não é scan root. Os dois
arquivos desta auditoria já estão lá e `docs/reports/` foi removido.

Alternativa considerada e rejeitada: excluir `docs/reports/` do check — abriria um
buraco permanente de cobertura para resolver um caso pontual.

---

## 2. Estratégia — A′ confirmada

**Mover os 8 recursos plugin-owned para `plugins/relay/resources/`**, normalizar
C1+C3, converter C2+C5 em prosa, e travar as três classes no `validate`.

O argumento do relatório para `resources/` em vez de `plugins/relay/docs/` continua
válido e agora é mecanicamente aproveitável: com um nome distinto, *qualquer*
`${CLAUDE_PLUGIN_ROOT}/docs/…` pode virar erro duro e *qualquer* `docs/…` nu é
target-scoped por definição — uma regra que um check consegue aplicar sem exceções.

Os 8 arquivos: `prd-template.md`, `plan-template.md`, `design-spec-template.md`,
`component-map-template.md`, `redaction-policy.md`, `settings-allowlist.md`,
`test-output-schema.md`, `mock-sentinels.md`.

**Não movem:** `docs/context/code-review-registries.md` (target-owned por design),
`docs/decisions.md`, `docs/anti-patterns.md`, `docs/decision-gate.md`, `PRPs/`.

---

## 3. Fases

Ordem escolhida para que cada fase deixe o repo verde e commitável.

### ~~F0 — Higiene de artefato~~ — **concluída**

Relatório e plano em `PRPs/reports/plugin-root-audit/`, `docs/reports/` removido,
`validate` 11/11. Resta apenas registrar a regra do §1 em
`docs/context/conventions.md` — feito junto com F2.

### ~~F1 — Fix visual~~ — **concluída** em `9857be0`

`visual-verifier.md` e `relay-design-map.md` já resolvem o tooling por
`${CLAUDE_PLUGIN_ROOT}/scripts/visual/`. Restam dois pontos de acompanhamento:

- **Só chega ao usuário com um publish.** O cache 0.25.0 ainda tem a forma quebrada;
  a correção só vale a partir do bump feito em F6.
- **Decisão a revisitar:** o texto novo manda
  `npm install --prefix ${CLAUDE_PLUGIN_ROOT}/scripts/visual/`, ou seja, grava
  `node_modules` **dentro do cache do plugin**, que é descartado a cada bump de versão —
  exatamente o defeito de §5.2 do relatório. Funciona hoje, mas é a forma que a doc
  oficial desaconselha em favor de `${CLAUDE_PLUGIN_DATA}`. Tratar em §5.

### F2 — Escrever a regra antes de mover *(30 min)*

Em `docs/context/conventions.md`, uma seção nova com as quatro regras do §7-Fase-0 do
relatório (packaged / target-scoped / source-only-prose / citar por título e nunca por
linha). Fazer isto **antes** de mover dá ao revisor um critério contra o qual julgar as
~70 reescritas de F3/F4, em vez de julgá-las uma a uma.

**Gate:** nenhum automático — é o insumo da revisão humana.

### F3 — Mover os 8 recursos *(1 h)*

```bash
mkdir -p plugins/relay/resources
git mv docs/context/{prd-template,plan-template,design-spec-template,\
component-map-template,redaction-policy,settings-allowlist,\
test-output-schema,mock-sentinels}.md plugins/relay/resources/
```

Sem stubs — stub recria a ambiguidade que causou o bug.

Superfícies que **precisam** acompanhar o move (verificadas):

| Superfície | Refs | Tratamento |
|---|---|---|
| 8 arquivos em `scripts/validate/checks/` — as suítes de fase `figma-visual-first-track` (1 a 5) e `figma-track` (3 a 5) | **55** | Obrigatório. Constantes tipo `const PRD_TEMPLATE_PATH = 'docs/context/prd-template.md'` e assertions `existsSync(...)`. Falha o pre-commit se esquecido. |
| `docs/KNOWLEDGE_BASE.md` | 7 | Atualizar |
| `docs/domain/glossary.md` | 4 | Atualizar |
| `docs/context/architecture.md` | 2 | Atualizar |
| `docs/context/constraints.md`, `docs/api-reference.md`, `README.md` | 3 | Atualizar |
| `CLAUDE.md` (raiz) | — | Conferir seção Context & Domain |
| `documentation/` — `README.md`, `roadmap/status.html`, `reference/{commands,agents,skills,scripts}.html`, `guide/troubleshooting.html`, `concepts/interactivity-boundary.html` | ~16 | Atualizar **e** entrada em `changelog.html` (contrato de `documentation/AGENTS.md`) |
| Referências cruzadas entre os próprios 8 arquivos | 10 | Atualizar |

**Não tocar:** `PRPs/plans/completed/*`, `PRPs/prds/*`, `PRPs/reports/*`,
`docs/decisions.md`. São registros históricos do que era verdade quando foram escritos;
reescrevê-los falsifica a trilha de auditoria.

**Gate:** `npm run validate` + corpus completo `node --test "scripts/validate/checks/*.test.mjs"`.

### F4 — Reescrever as referências *(2 h)*

Na ordem de severidade do relatório (§7-Fase-3), que continua correta:

1. **C1 (18)** — `${CLAUDE_PLUGIN_ROOT}/docs/context/*` → `${CLAUDE_PLUGIN_ROOT}/resources/*`. Mecânico.
2. **C3 (51)** — bare → `${CLAUDE_PLUGIN_ROOT}/resources/*`. Priorizar os consumidores com constraint de "não improvisar": `design-map-writer.md` → `context-builder/SKILL.md` → `design-spec-writer.md` + `visual-verifier.md` + `capture.mjs` → `prd-writer.md` → `plan-writer.md` → `test-runner.md` + `normalize-test-output.mjs` → comandos.
   - **Deletar** as anotações `(in the target project)` falsas em `relay-implement.md:24` e `relay-visual-review.md:25`.
   - **H6 tem duas metades:** além de `test-runner.md:135`, a string `# Full catalog and semantics: docs/context/redaction-policy.md` é gravada por `SKILL.md:322` em **todo** `PRPs/redaction-extensions.txt` gerado. Corrigir só o agente deixa o ponteiro quebrado persistido em cada repo consumidor já inicializado.
   - **H5 / glosa:** ao emitir `${CLAUDE_PLUGIN_ROOT}/resources/mock-sentinels.md` como linha P0 de `## Mandatory Reading`, acrescentar `(arquivo do plugin relay instalado)` — resolve para o Implementer, mas é opaco para o humano que lê o plano.
3. **C2 + C5 (~25)** — converter em prosa sem forma de token: *"o PRD de origem `test-runner.prd.md`, no repo-fonte do relay (não empacotado)"*. Manter `${CLAUDE_PLUGIN_ROOT}/…` aqui continuaria mentindo.
4. **C6 (~10)** — deletar ou inlinar. Corrigir `relay-test-write-review.md:219/223` para nomear o risco real (editar o cache instalado) e `relay-implement.md:412` para remover o parentético stale *"not yet built as of this phase"* (`/relay-visual-approve` existe).
5. **C7 (~30)** — remover pins de linha e datas; citar por título de seção. Barato em lote, baixa prioridade.
6. **C4 remanescente (45)** — só prosa de proveniência. Opcional; se mexer, é para uniformizar, não para consertar comportamento.

**Gate:** validate + corpus + revisão humana contra as regras de F2.

### F5 — Travar a regressão *(1 h)*

**5a. Estender `path-existence.mjs`** (o caminho mais barato, e já testado):
- Adicionar `'resources/'` a `CLAUDE_PLUGIN_ROOT_ALLOWED_PREFIXES` (linha 74).
- Deletar o parágrafo "KNOWN DEFERRED GAP" (linhas 31-35) e deixar
  `${CLAUDE_PLUGIN_ROOT}/docs/…` e `/PRPs/…` caírem na regra geral — depois da
  migração eles nunca mais podem estar certos, e a exclusão atual é justamente o que
  escondeu 32 referências quebradas.

**5b. Novo check `plugin-root-resolvable.mjs`** para as duas classes que
`path-existence` não cobre — recurso plugin-owned citado nu, e literal `plugins/relay/`
dentro do artefato publicado. Contrato real a respeitar:

```js
export function runPluginRootResolvableCheck() {
  return { name: 'plugin-root-resolvable', ok: findings.length === 0, findings };
  // findings: Array<{ message: string, file: string, line: number | null }>
}
```

Ancorar em token entre backticks (como `resolveBacktickToken` já faz) em vez de varrer
a linha crua — senão o próprio array de basenames do check vira finding, além de prosa
legítima. Registrar em `scripts/validate/index.mjs` (`CHECKS`, hoje com 11 entradas) e
escrever `plugin-root-resolvable.test.mjs` usando `withScanRootLock` como os irmãos.

**5c. Atualizar as contagens** que o repo publica: `CLAUDE.md` diz "11 static
consistency checks", e `documentation/guide/validation-suite.html` idem. Passam a 12.

**Gate:** o novo check reprova o estado pré-F3 e aprova o pós-F4.

### F6 — Publicar e verificar packaging *(30 min)*

1. Bump em `plugins/relay/.claude-plugin/plugin.json` **e** heading correspondente em
   `documentation/changelog.html` — `version-parity` exige lock-step.
2. `npm run validate` (12/12) + corpus completo.
3. `claude plugin marketplace update` + `claude plugin update relay`, e então **o único
   teste que prova packaging**:
   ```bash
   ls ~/.claude/plugins/cache/relay-marketplace/relay/<nova-versao>/resources/
   ```
   Esperado: os 8 arquivos. Nada dentro do repo consegue validar isto — o cache é a
   fonte da verdade, e foi exatamente essa lacuna que deixou o bug vivo por 5 versões.
4. Adicionar esse passo como item de checklist de release em `documentation/`.

---

## 4. O que **não** fazer

- **Não mover `docs/` e `PRPs/` inteiros.** Quebra o dogfooding deste repo, 11 MB de
  `PRPs/`, e ~150 refs no site.
- **Não reviver symlink** — mesmo sendo suportado pela plataforma (§0.3), depende de
  `core.symlinks` e é hostil ao Windows, que é o ambiente de desenvolvimento aqui.
- **Não estender o inlining** como estratégia. `prd-template.md` é referenciado por 7
  arquivos; inlinar daria ~76 KB de prompt duplicado. Manter o inlining que já existe —
  é ele que rebaixa `prd-reviewer`, `relay-test` e `relay-worktree` para BAIXA.
- **Não "consertar"** `<target_root>/docs/context/code-review-registries.md` nem os
  ~90 `docs/…` bare target-scoped. Seria o falso positivo do exercício.
- **Não reescrever artefatos históricos** em `PRPs/plans/completed/`, `PRPs/prds/`,
  `docs/decisions.md`.

---

## 5. Workstream separado — dependências do tooling visual

Independente do problema de caminho, e não resolvido por nenhuma fase acima.

`plugins/relay/scripts/visual/package.json` declara `playwright`, `pixelmatch`,
`pngjs`; `node_modules/` é gitignored; o cache é versionado por diretório, então **todo
install novo e todo bump de versão começa sem dependências**. `provision.mjs` só checa
o binário do Chromium (`npx playwright install --dry-run chromium`), nunca se os três
pacotes resolvem — então `capture.mjs`/`compare.mjs` morrem com `ERR_MODULE_NOT_FOUND`
antes do próprio tratamento de erro, e `generate-final-report.mjs` omite a seção Visual
Fidelity inteira pelo seu idioma documentado de omissão. A falha fica invisível.

Solução documentada: hook `SessionStart` que compara o `package.json` empacotado com uma
cópia guardada em `${CLAUDE_PLUGIN_DATA}` (diretório **persistente**, ao contrário de
`${CLAUDE_PLUGIN_ROOT}`) e roda `npm install` lá quando divergem. Exige criar
`plugins/relay/hooks/` — hoje inexistente e descrito em `docs/context/architecture.md`
como árvore planejada — e declarar `hooks` em `plugin.json`.

Correção mínima adicional, independente: fazer `provision.mjs` verificar que os três
pacotes resolvem e sair com um código nomeado, em vez de deixar a falha vazar para
`capture.mjs` como `MODULE_NOT_FOUND` não classificado.

---

## 6. Esforço

| Fase | Esforço | Bloqueia? |
|---|---|---|
| ~~F0 higiene de artefato~~ | — | **feita** |
| ~~F1 fix visual~~ | — | **feita** (`9857be0`) |
| F2 escrever a regra | 30 min | insumo de F3/F4 |
| F3 mover + superfícies | 1 h | sim para F4 |
| F4 reescrever ~104 refs | 2 h | — |
| F5 travar regressão | 1 h | — |
| F6 publicar + verificar | 30 min | — |
| **Total restante** | **~5 h 15** | |

O relatório estimou 2–3 h para o conjunto. A diferença é o corpus de testes de F3
(§0.5, 55 referências em 8 arquivos), o teste do novo check em F5 e as superfícies do
site em F3.

**Próximo passo de maior retorno:** F6 sozinha, publicando `9857be0`. A malha visual
do Figma está consertada no código mas continua quebrada para todo usuário instalado
até um bump de versão sair. É a única entrega que restaura funcionalidade real sem
depender de nenhuma decisão de layout.
