# Relatório de Engenharia — Referências de Caminho Quebradas no Plugin `relay`

**Versão auditada:** `relay` 0.25.0 · commit `4f6023b` · cache `~/.claude/plugins/cache/relay-marketplace/relay/0.25.0`
**Escopo:** 21 agentes, 19 comandos, 1 skill, 6 scripts — ~200 referências de caminho examinadas em 4 slices, cada uma com passagem adversarial independente.

---

## 1. Causa raiz

`${CLAUDE_PLUGIN_ROOT}` resolve para `plugins/relay/`, mas `docs/` e `PRPs/` ficam **um nível acima**, na raiz do repositório. Eles nunca foram empacotados — `git log --all -- plugins/relay/docs plugins/relay/PRPs` não retorna nada, essas pastas jamais existiram dentro do plugin root em nenhum commit. Consequência: os 8 arquivos que o plugin trata como fonte da verdade (`prd-template.md`, `plan-template.md`, `design-spec-template.md`, `component-map-template.md`, `redaction-policy.md`, `settings-allowlist.md`, `test-output-schema.md`, `mock-sentinels.md`) não existem em **nenhum** install.

**Por que nunca foi detectado:** este repositório é simultaneamente a fonte do plugin *e* o alvo de dogfooding (`known_marketplaces.json` registra `relay-marketplace` com `"source": "directory"` apontando para `C:\repos\PRPs-agentic-eng`). Quando o `cwd` é a raiz do repo, o caminho bare `docs/context/plan-template.md` resolve corretamente. Para todo usuário instalado, nenhum resolve. A classe bare é invisível ao autor por construção; a classe `${CLAUDE_PLUGIN_ROOT}/docs/` falha até no dogfooding, mas nada a exercita porque nenhuma delas é um `Read` obrigatório com HALT.

**O autor já sabe da metade do problema.** `scripts/validate/checks/path-existence.mjs:32-35` documenta literalmente:

> `${CLAUDE_PLUGIN_ROOT}/docs/…` e `${CLAUDE_PLUGIN_ROOT}/PRPs/…` remain excluded from this class as a KNOWN DEFERRED GAP: fixing them requires first deciding whether the plugin ships `docs/`/`PRPs/` at all

Este relatório é a decisão adiada — **mais a metade que não estava no radar**: as ~40 referências bare a recursos plugin-owned, que é onde estão os defeitos de severidade ALTA.

---

## 2. Taxonomia — sete classes, quatro correções diferentes

| # | Classe | Qtd. | Resolve para | Situação | Correção |
|---|---|---|---|---|---|
| **C1** | `${CLAUDE_PLUGIN_ROOT}/docs/…` | 18 | plugin root sem `docs/` | **quebrado sempre**, inclusive dogfooding | mover arquivo + reprefixar |
| **C2** | `${CLAUDE_PLUGIN_ROOT}/PRPs/…` | 14 | plugin root sem `PRPs/` | **quebrado sempre** | converter em prosa (não empacotar) |
| **C3** | bare `docs/context/<plugin-owned>.md` | ~40 | projeto-alvo, arquivo ausente | **quebrado em todo install**, correto no dogfooding | mover arquivo + prefixar |
| **C4** | `plugins/relay/…` e `<target_root>/plugins/relay/…` | ~30 | projeto-alvo, `plugins/` não existe | **quebrado em todo install** — arquivo JÁ empacotado | troca pura de prefixo, **sem mover nada** |
| **C5** | bare `PRPs/prds/*.prd.md` | ~10 | projeto-alvo | quebrado, mas só proveniência | reescrever como prosa |
| **C6** | `plugins/prp-core/…`, `documentation/…`, `scripts/efficiency.mjs`, `plugin.json` | ~10 | fora de ambos os roots | quebrado, **não corrigível por prefixo** | deletar ou inlinar |
| **C7** | bare `docs/{decisions,anti-patterns,context/architecture}.md` com pin de linha ou data | ~30 | projeto-alvo, arquivo **existe** com conteúdo alheio | **não falha — resolve errado em silêncio** | citar por título, nunca por linha |
| — | bare `docs/{decisions,anti-patterns,decision-gate,context/*}.md` sem pin | muitas | projeto-alvo, arquivo existe | **correto por design — não tocar** | nenhuma |

**A distinção C3 vs. "correto por design" é empírica, não inferida.** `context-builder` gera exatamente estes sob `docs/context/`: `architecture`, `constraints`, `conventions`, `integrations`, `methodology`, `testing` (+ `design-system`, que na verdade é scaffolded por `/relay-design-map`, não pelo context-builder). Verificado contra três alvos reais de relay — `spe-cms`, `spe-services`, `portal`: **nenhum** contém qualquer um dos 8 recursos plugin-owned.

Duas referências mentem explicitamente sobre isso e devem ter a anotação **deletada**, não preservada:

- `commands/relay-implement.md:24` — `` `docs/context/plan-template.md` (in the target project) ``
- `commands/relay-visual-review.md:25` — idem para `design-spec-template.md`

---

## 3. Enumeração completa por severidade

### ALTA — o consumidor produz saída errada em silêncio, ou uma etapa inteira do pipeline nunca roda

#### H0 · Toda a malha visual do Figma é um no-op silencioso em produção — **classe C4, correção mais barata do relatório**

| Arquivo | Linha | Caminho cru | O que quebra concretamente |
|---|---|---|---|
| `agents/visual-verifier.md` | 105 | `<target_root>/plugins/relay/scripts/visual/provision.mjs` | `node` sai 1 com `MODULE_NOT_FOUND`. Hard constraint 4 mapeia "any other exit code" → `DEGRADED_PROVISION_FAILED`. O agente **não para**: desce permanentemente para o degrau degradado e emite um `fidelity-report.json` bem-formado com veredito `VISUAL_DEGRADED`, indistinguível de um ambiente sem rede. |
| `agents/visual-verifier.md` | 115 | `…/scripts/visual/capture.mjs` | Só duas saídas definidas (`CAPTURE_FAILED_DEV_SERVER_TIMEOUT` em stderr, ou exit 0). `MODULE_NOT_FOUND` não casa com nenhuma — branch indefinido. |
| `agents/visual-verifier.md` | 118 | `…/scripts/visual/compare.mjs` | `compare.mjs` é quem escreve `fidelity-report.json`. A linha 119 lê esse arquivo **sem guarda de existência**. Hard constraint 5 ("o report sempre reflete o resultado real") torna-se insatisfazível. |
| `agents/visual-verifier.md` | 3, 14 | `plugins/relay/scripts/visual/` | Frontmatter + parágrafo de papel. Sem deref, mas é a convenção que se propagou para 105/115/118. |
| `commands/relay-design-map.md` | **316** | `npm install --prefix plugins/relay/scripts/visual/` | **Comando shell executável** que falha para 100% dos usuários instalados. Constraint 6 garante que preflight nunca dá HALT, e a nota canônica culpa o usuário: *"suggests an incomplete checkout"*. O humano então confirma `figma_track: true` na Fase E acreditando que o tooling foi verificado. |
| `commands/relay-design-map.md` | 313, 319, 433, 449 | `plugins/relay/scripts/visual/` | Mesma forma bare; corrigir só a 316 deixa o resto inconsistente. |

Os scripts **existem e estão empacotados** em `${CLAUDE_PLUGIN_ROOT}/scripts/visual/` (confirmado no cache 0.25.0). Só o prefixo está errado. `commands/relay-visual-approve.md:23` usa a forma **correta** para o mesmo diretório — prova de que a convenção é inconsistente entre chamadores, não uniformemente errada. Correção: `s|<target_root>/plugins/relay/scripts/|${CLAUDE_PLUGIN_ROOT}/scripts/|`.

#### H1 · `component-map-template.md` — o único constraint que proíbe explicitamente o fallback

| Arquivo | Linha | Caminho cru | O que quebra concretamente |
|---|---|---|---|
| `agents/design-map-writer.md` | **47** | bare `docs/context/component-map-template.md` | Hard Constraint 1: *"Before writing anything, `Read` … in full. … **Do not improvise a different shape from memory.**"* Zero restatement inline da forma. O agente ou para, ou viola seu próprio constraint. |
| `agents/design-map-writer.md` | **120** | idem | Step 1.1 — o `Read` executável. Nenhum branch para template ausente em todo o Step 1. |
| `agents/design-map-writer.md` | 176 | idem | Step 4: `Write` `<target_root>/docs/design/component-map.md` **conforming exactly to** `docs/context/component-map-template.md`. Prefixo `<target_root>/` explícito na saída e bare no template, na mesma frase — prova de que é lapso, não intenção. |
| `agents/design-map-writer.md` | 3 | idem | Frontmatter. Sem deref. |
| `commands/relay-design-map.md` | 42 | `${CLAUDE_PLUGIN_ROOT}/docs/context/component-map-template.md` | *"the canonical map shape both agents reference"*. **Ambas as grafias do mesmo arquivo estão quebradas** — a bare e a com variável. |

`docs/design/component-map.md` é o artefato em que toda classificação `REUSE`/`NEW` posterior do `design-spec-writer` se apoia, e o `design-map-reviewer` também não tem o template — nada detecta o drift. O loop `max_map_review_retries=2` pode esgotar o orçamento numa discordância que nenhum dos dois lados consegue resolver.

> Correção da passagem adversarial: o bloco de status final **está** especificado inline em `design-map-writer.md:182-185`; só o marcador `inventory_truncated` se perde de fato.

#### H2 · `settings-allowlist.md` — `context-builder` improvisa um arquivo de permissões

| Arquivo | Linha | Caminho cru | O que quebra concretamente |
|---|---|---|---|
| `skills/context-builder/SKILL.md` | **263** | `${CLAUDE_PLUGIN_ROOT}/docs/context/settings-allowlist.md` | Marcado literalmente `**Source of truth:**` para a Fase 1.5. As regras 3 e 4 delegam ao catálogo (*"emit the corresponding allow patterns from the catalog"*, *"Refuse to emit any pattern the catalog forbids"*), e o comportamento de update é *"Replace the denylist wholesale from the catalog"*. Com o catálogo ilegível, uma **denylist de segurança é reconstruída de memória num caminho de substituição total**. |
| `skills/context-builder/SKILL.md` | 110 | idem | Declaração no preâmbulo "Relay catalog discovery". |
| `commands/relay-approve.md` | 444 | bare | Nota de autor (Constraint 7). Cosmético. |
| `commands/relay-commit.md` | 331 | bare | Nota de autor (Constraint 6). Cosmético. |
| `commands/relay-visual-approve.md` | 213 | bare | Parentético de verificação passada. Cosmético. |
| `commands/relay-pr.md` | 421 | bare, com pins de linha | Ver §3-MÉDIA / achado de segunda ordem. |

**O guard desenhado nunca dispara.** `SKILL.md:123` diz *"If `${CLAUDE_PLUGIN_ROOT}` is not resolvable … abort the phase"*. A variável **resolve**; o que falta é o arquivo. O modo de falha para o qual o autor desenhou a degradação não é o modo de falha que ocorre.

#### H3 · `design-spec-template.md` — quebra silenciosa de um contrato lido por máquina

| Arquivo | Linha | Caminho cru | O que quebra concretamente |
|---|---|---|---|
| `agents/design-spec-writer.md` | **66** | `${CLAUDE_PLUGIN_ROOT}/docs/context/design-spec-template.md` | Hard constraint 1: *"Template conformance is non-negotiable. … Missing section = bug."* Roda **INLINE na sessão interativa** do usuário (`/relay-design-spec`), então a falha aparece no meio do diálogo, depois do Q&A. |
| `agents/design-spec-writer.md` | **324** | idem | Step 5.4, ponto de uso real. Mitigado em parte: as seções são enumeradas inline — **mas a forma de 9 colunas da tabela `## Visual Acceptance Criteria` não é**. |
| `agents/design-spec-writer.md` | 3 | bare | Frontmatter, grafia inconsistente com 66/324 no mesmo arquivo. |
| `commands/relay-design-spec.md` | 35 | `${CLAUDE_PLUGIN_ROOT}/docs/…` | Comando adota writer *e* reviewer inline na **mesma sessão** — um template ilegível dessincroniza as duas metades de forma idêntica. |
| `agents/visual-verifier.md` | 99, 100 | bare `docs/context/design-spec-template.md:111-113` | Step 0 localiza a tabela VAC pela forma pinada em linha. As 9 colunas estão inline, então o manifest ainda é construído — mas o pin só faz sentido contra a cópia do plugin. |
| `scripts/visual/capture.mjs` | 54 | bare | Comentário: *"mirrors `docs/context/design-spec-template.md`'s Interaction column syntax exactly"*. **A coluna é parseada por posição.** |
| `agents/code-reviewer.md` | 534 | bare | `R-COH-DESIGN-REUSE-DRIFT`. Baixo — tem branch de degradação explícito em :535-540. |
| `agents/research-design.md` | 63 | bare | Localizar `## Component Mapping`. Baixo — tem caminho de degradação em :69-70. |
| `commands/relay-visual-review.md` | 25 | bare + `(in the target project)` **falso** | Contradiz `relay-design-spec.md:35`. Resolve em lugar nenhum: não empacotado, não gerado no alvo. |

Ordem de coluna errada = quebra silenciosa de pipeline, não erro legível.

#### H4 · `prd-template.md` — o ponto de entrada único do pipeline

| Arquivo | Linha | Caminho cru | O que quebra concretamente |
|---|---|---|---|
| `agents/prd-writer.md` | **45** | `${CLAUDE_PLUGIN_ROOT}/docs/context/prd-template.md` | Hard constraint 1, *"Missing section = bug"*. Primeira coisa que um usuário novo encontra. |
| `agents/prd-writer.md` | **418** | idem | Step 7.4, ponto de uso. Degradável: a lista de 15+ seções está enumerada inline logo abaixo. |
| `agents/prd-writer.md` | 3, 13 | idem | Frontmatter + parágrafo de papel. |
| `agents/prd-writer.md` | **438, 447, 457** | bare (grafia inconsistente no mesmo arquivo) | Itens 15/15.4/15.5 delegam ao *"registered shape"* do template as seções `## Visual-First Mode` e `## Design Source`. **Estas não são restated inline em nível de coluna.** `plan-writer` depois parseia exatamente essas tabelas. ALTA quando `figma_track: true`. |
| `commands/relay-prd.md` | 31 | `${CLAUDE_PLUGIN_ROOT}/docs/…` | *"canonical PRD shape; the Writer assembles the DRAFT against this template"*. Falha junto com prd-writer 3/13/45/418 — **é um único conserto, não cinco**. |
| `commands/relay-plan.md` | 31 | idem | Mitigado: a linha de cabeçalho que o parser precisa está citada literalmente em :185. |
| `commands/relay-plan-review.md` | 28 | idem | Especificamente o item R8 de rastreabilidade perde âncora (não a rubrica inteira). |
| `skills/context-builder/SKILL.md` | 114 | idem | Só proveniência; o parentético *"referenced by agents, not generated per-project"* é prova de que não é target-owned. |
| `agents/plan-writer.md` | 451, 675, 776 | bare | Garantia de pareamento `[VISUAL]`/`[LOGIC]` e registro das tags. Afirmação inline, sem caminho de verificação. |
| `agents/prd-reviewer.md` | 3 | bare | **Só proveniência** — R1–R7 são inteiramente inline, incluindo a linha literal do header. O reviewer nunca precisa do arquivo. |

#### H5 · `mock-sentinels.md` — o único caso que **escreve** um caminho quebrado dentro de um artefato gerado

| Arquivo | Linha | Caminho cru | O que quebra concretamente |
|---|---|---|---|
| `agents/plan-writer.md` | **809** | bare `docs/context/mock-sentinels.md` | Quando `phase_scope: visual`, o plan-writer **injeta este caminho como linha P0 de `## Mandatory Reading` no plano gerado**. O Implementer então dereferencia `<target_root>/docs/context/mock-sentinels.md` e falha — numa linha marcada prioridade máxima. |
| `agents/plan-writer.md` | **814** | idem | Regra simétrica para `phase_scope: logic` (a seção de swap-semantics). |
| `agents/plan-writer.md` | 883 | idem | *"Reuse the **exact** sentinel shape documented in …"* — "exact" exclui improvisação, e não há forma inline. |
| `agents/plan-writer.md` | 204, 220, 906, 923, 1246 | idem | **Mitigados** — tokens e regras restated inline. Ver BAIXA. |

> Correção da passagem adversarial: a primeira passagem especulou que `plan-reviewer` exigiria a presença da linha de Mandatory Reading. **Falso** — grep confirma zero referências a `mock-sentinels.md` em `plan-reviewer.md`; `R-COH-VISUAL-SCOPE-PURITY` grepa tokens nas tasks, não a linha de leitura. Cláusula removida; o resto do achado permanece.

#### H6 · `redaction-policy.md` em `test-runner` — consequência de segurança, degradação silenciosa

| Arquivo | Linha | Caminho cru | O que quebra concretamente |
|---|---|---|---|
| `agents/test-runner.md` | **135** | bare `docs/context/redaction-policy.md` | *"env var values matching patterns from `docs/context/redaction-policy.md` (**in the relay plugin repo**) PLUS any entries from `<worktree>/PRPs/redaction-extensions.txt` MUST be replaced with `[REDACTED]` … BEFORE the log is written to disk."* O agente perde o catálogo invariante e fica só com o arquivo de *extensões* do projeto — que por design contém apenas adições, nunca os defaults. Redação vira heurística ad-hoc antes de escrever `PRPs/reports/<feature>/attempts/<n>/stdout.log`, que depois flui para o corpo do PR via `generate-final-report.mjs`. **Nada sinaliza que o catálogo default faltou.** Note o `<worktree>/` deliberado na mesma frase: o autor distingue os dois roots e mesmo assim deixou a policy bare. |
| `skills/context-builder/SKILL.md` | **322** | bare, **dentro do conteúdo escrito no projeto-alvo** | A string `# Full catalog and semantics: docs/context/redaction-policy.md` é gravada em **todo** `PRPs/redaction-extensions.txt` gerado. O caminho quebrado já está persistido como artefato permanente em todo repo consumidor inicializado. Consertar `test-runner.md` sozinho deixa essa string para trás. |

---

### MÉDIA — degrada correção ou verificabilidade, recuperável

| Arquivo | Linha | Caminho cru | O que quebra concretamente |
|---|---|---|---|
| `agents/plan-writer.md` | **118** | bare `docs/context/plan-template.md` | Hard constraint 1: *"that file is the canonical source of truth for plan structure"*. As 15 seções estão restated no Step 4.4 — mas a :121 declara o arquivo ilegível como **autoritativo em caso de drift**. O desempate é permanentemente inalcançável; drift entre agente e template nunca é detectável em runtime. |
| `agents/plan-writer.md` | 121 | bare `plan-template.md` | Basename nu em prosa. **Não é um alvo de correção independente** — consertar a 118 conserta esta. Contá-la separadamente infla o total. |
| `agents/plan-writer.md` | 644, 1041 | bare | Mitigados: exemplo fenced completo em :647+ e colunas verbatim inline. |
| `commands/relay-implement.md` | **24** | bare + `(in the target project)` **falso** | Nomes de seção estão na própria linha, então o parse sobrevive. O rótulo errado é o problema maior: manda o mantenedor procurar no repo errado. |
| `agents/test-runner.md` | 130 | bare `docs/context/test-output-schema.md` | A normalização real é feita pelo script empacotado (:154), então sobrevive — mas o agente perde o contrato para interpretar a saída e os casos-limite de `node:test`. |
| `agents/test-runner.md` | 43 | bare | Dentro do bloco de evidência do Decision Gate emitido **verbatim**. Não é deref, mas anuncia um caminho inalcançável na trilha de auditoria de toda execução. |
| `commands/relay-qa-report.md` | **109** | bare | **Operativo**: *"read it (schema v1 — …) and ground the coverage and automated test path fields in its `failures[]` entries and counts"*. Salva-se só porque os nomes dos campos estão na mesma linha. Risco: parse errado do `record.json` produz alegações falsas de cobertura "automated" num relatório cuja função inteira é honestidade de cobertura. |
| `commands/relay-qa-report.md` | 22 | bare | Bloco `See:`. Este comando é o **único sem nenhuma referência `${CLAUDE_PLUGIN_ROOT}` correta** — grep retorna zero ocorrências. Todo o bloco `See:` (linhas 17-22) é irresolúvel. |
| `scripts/normalize-test-output.mjs` | **49** | bare `docs/context/test-output-schema.md` | **Único caminho quebrado impresso para o usuário**, dentro de `printHelp()`. *Correção da passagem adversarial:* `die()` **não** chama `printHelp` — só as linhas 260 (`--help`) e 265 (antes do `die(2)` de args faltando) o fazem. Não é "toda invocação malformada". |
| `scripts/normalize-test-output.mjs` | 7 | bare | Comentário de cabeçalho. Cosmético. |
| `commands/relay-pr.md` | **312, 326, 417, 435** + frontmatter | bare `docs/context/redaction-policy.md` | **Bem mitigado** — :313-315 inlinam todo o catálogo Layer 1 e a regra Layer 2, então a redação executa. Fica na MÉDIA e não na BAIXA porque a própria :417 observa *"A PR body is potentially public"*. |
| `skills/context-builder/SKILL.md` | 112, 310 | `${CLAUDE_PLUGIN_ROOT}/docs/…` | A Fase 1.75 ainda escreve seu template fixo, então a perda é semântica: o time escreve extensões Layer 2 sem enxergar o que Layer 1 já cobre. |
| `commands/relay-execute.md` | **111** | bare, **dentro de mensagem de HALT** | *"The PRD must conform to `docs/context/prd-template.md` before `/relay-execute` can run."* O HALT está correto; a remediação aponta para um arquivo que não existe nem no projeto nem no plugin instalado. |
| `commands/relay-plan.md` | **191** | idem | Defeito idêntico em P4. Compare com `relay-visual-approve.md:117-121` e `relay-visual-review.md:116-119`, que acertam a remediação nomeando caminhos target-relative e um comando concreto. |
| `commands/relay-implement.md` | **412** | bare `PRPs/prds/figma-visual-first-track.prd.md` | String de `actionable_recommendation` **persistida no `halt.json`** e depois exibida ao operador. Pior que um `See:`. O parentético *"not yet built as of this phase"* também está **stale** — `/relay-visual-approve` já existe. |
| `commands/relay-pr.md` | **421** | bare `docs/context/settings-allowlist.md` | O achado de segunda ordem que a referência documenta é real: o padrão citado, `Bash(node */plugins/relay/scripts/generate-final-report.mjs *)` (verbatim em `settings-allowlist.md:118`), **não pode casar** com o caminho de runtime `…/.claude/plugins/cache/relay-marketplace/relay/0.25.0/scripts/generate-final-report.mjs`, que não contém o segmento `plugins/relay/scripts/`. Logo `/relay-pr` Fase 3 Step 3 pede permissão em toda execução autônoma, violando a interactivity boundary. Mesmo defeito no padrão adjacente de `normalize-test-output.mjs`. *(A referência cita "line 114"; o padrão está na 118.)* |

---

### BAIXA — proveniência cosmética; falha um `Read`, não muda comportamento

| Grupo | Arquivos/linhas | Por que é BAIXA |
|---|---|---|
| **14 refs `${CLAUDE_PLUGIN_ROOT}/PRPs/prds/*.prd.md`** | `relay-code-review:23`, `relay-implement:19`, `relay-plan:20`, `relay-plan-review:21`, `relay-prd:22`, `relay-test:23`, `relay-test-review:20`, `relay-test-write-review:23`, `relay-visual-review:21`, `relay-worktree:19`, `relay-design-map:38`, `relay-design-spec:32`, `post-green-reviewer:10` | Todas em bloco `See:` de topo ou parentético de preâmbulo. Nenhuma é `Read` obrigatório; nenhuma carrega conteúdo operacional. **44% de toda a quebra `${CLAUDE_PLUGIN_ROOT}` e 0% do risco.** `post-green-reviewer:10` é a única que usa o prefixo em `PRPs/` — todas as outras 16 ocorrências no codebase escrevem a forma honesta *"see `PRPs/prds/<x>.prd.md` in the relay plugin repo"*. |
| **`relay-test.md:24`** → `${CLAUDE_PLUGIN_ROOT}/docs/decisions.md` | — | Prova mais limpa de que `docs/decisions.md` tem **dois significados** em relay. Os budgets citados estão hardcoded em :42-43 e :202-203. Armadilha de manutenção, não falha. |
| **`relay-worktree.md:23, 271, 354`** → `redaction-policy.md` | — | **Caso modelo.** :271-276 inlinam as três camadas verbatim, então o log de bootstrap é redigido corretamente mesmo com o policy ilegível. É o padrão a copiar para os 4 templates famintos. |
| **`plan-writer.md:204, 220, 906, 923, 1246`** → `mock-sentinels.md` | — | Tokens e a regra "no deferral path" restated inline em :200-225, :816-817, :873-898. |
| **Classe C4 restante (proveniência)** | `relay-approve:20,21,22`; `relay-code-review:20`; `relay-execute:348`; `relay-implement:56,386,406,446`; `relay-pr:27`; `relay-qa-report:18,19,20,21,137,166`; `relay-test-write-review:219`; `relay-design-map:146`; `implementer:362,656,676,713` | Citações "mirrors X" e headers `# SOURCE:` em âncoras Patterns-to-Mirror, com o comportamento restated no lugar. Duas inconsistências no mesmo arquivo provam ser lapso: `relay-code-review:20` (errado) vs. `:27` (certo), 7 linhas de distância; `relay-execute:348` (errado) vs. `:24` (certo), mesmo arquivo e mesmo range de linha. |
| **Classe C6 — não corrigível por prefixo** | `relay-commit:41` (`plugins/prp-core/commands/prp-commit.md`); `relay-qa-report:228` (`plugins/prp-core/`); `relay-approve:456` e `relay-design-spec:68` (`documentation/AGENTS.md`); 7 reviewers (`scripts/efficiency.mjs`); `relay-test-write-review:223` (`plugin.json` — que **nem na raiz do repo existe**: está em `plugins/relay/.claude-plugin/plugin.json`) | Apontam para fora de ambos os roots. `relay-test-write-review:219` é levemente autodestrutiva: proíbe editar um caminho que não existe no alvo, enquanto o risco real (editar o cache instalado) fica sem nome. Correção: deletar ou inlinar. |
| **`SKILL.md:437, 470, 659`; `generate-final-report.mjs:16`; `relay-approve:19`; `relay-commit:40`; `relay-pr:26`; `relay-qa-report:17`; `relay-visual-review:18`** | bare `PRPs/…` | Comentários de proveniência, incl. dentro dos templates `worktree-bootstrap.{sh,ps1}` gravados no projeto do consumidor — que ficam com um ponteiro pendente para as entranhas do relay. |

---

### NÃO É BUG — verificado, **não tocar**

| Arquivo | Caminho | Por quê |
|---|---|---|
| `agents/code-reviewer.md:503` | `<target_root>/docs/context/code-review-registries.md` | **Target-owned por design.** A cópia na raiz do repo prova: seu frontmatter lista os registries do *próprio* PRPs-agentic-eng (`plugins/relay/commands/`, `documentation/reference/agents.html`). Cada projeto declara os seus. Branch de degradação silenciosa explícito em :511 (`"no registries declared; check skipped"`). **Consertar isto seria o falso positivo.** |
| `agents/test-writer.md:152` + ~90 outras | bare `docs/context/methodology.md`, `docs/decisions.md`, `docs/anti-patterns.md`, `docs/decision-gate.md`, `docs/context/architecture.md`, `docs/design/component-map.md`, `docs/context/design-system.md`, `docs/domain/**`, `docs/libs/**` | Gerados por `context-builder` (ou, no caso de `design-system.md`, scaffolded por `/relay-design-map`) em cada projeto. Presentes em `spe-cms`, `spe-services`, `portal`. |
| `commands/relay-worktree.md:249` | `scripts/worktree-bootstrap.{sh,ps1}` | Hook do projeto-alvo, template inlinado em `SKILL.md:432/466` justamente para cada projeto ter a sua cópia. É por isso que `plugins/relay/scripts/` corretamente não traz esse script. |
| `commands/relay-pr.md:314` | `PRPs/redaction-extensions.txt` | Layer 2 per-project, criado pela Fase 1.75 no consumidor. Corretamente opcional. |
| ~90 refs `PRPs/{prds,plans,reports,designs}/…` com placeholder | — | Artefatos de **saída** do relay dentro do repo-alvo. |
| **Arquivos 100% limpos** | `docs-updater.md`, `docs-reviewer.md`, `research-codebase.md`, `research-web.md`, `test-reviewer.md`, `test-writer.md`, `design-map-reviewer.md`, `design-spec-reviewer.md`, `plan-reviewer.md`, `implementer.md`, `code-reviewer-semantic.md` | Zero referências plugin-owned quebradas. |

### Classe C7 — risco sistêmico que **não é bug** (não perseguir)

~30 citações resolvem para um arquivo real do projeto-alvo com conteúdo **completamente diferente**. Nunca falham; enganam quem for verificar. Exemplos verificados lado a lado:

- `relay-write-test.md:321` → `docs/anti-patterns.md lines 43-48`: no repo relay isso é *"## Activating the test pair by heuristic"*; em `spe-cms` é *"## Cookies without explicit SameSite / Secure"*.
- `design-map-writer.md:84`, `implementer.md:778`, `visual-verifier.md:90` → `docs/anti-patterns.md lines 60-66`: no relay é *"Writing pipeline artifacts under `.claude/`"*; em `spe-cms` é *"Large-file XLSX parsed client-side"*.
- `plan-reviewer.md:29, 60` → `docs/context/architecture.md` §Interactivity boundary: existe só no relay (linha 99); `spe-cms` não tem essa seção.
- ~9 citações `docs/decisions.md [2026-04-19] / [2026-04-28] / [2026-07-09] / [2026-07-22]` — datas do histórico do relay, num arquivo que no consumidor contém as decisões de negócio dele.
- `relay-approve.md:136` → `docs/context/methodology.md:45-65`.

**Correção barata e definitiva:** citar por título de seção, **nunca por número de linha**, sempre que o caminho for target-relative. Não vale abrir chamado individual para cada uma.

---

## 4. Onde a passagem adversarial corrigiu a primeira — e o que isso diz

**2 reclassificações formais em ~220 vereditos (0,9%).** A taxa baixa confirma que a distinção plugin-owned vs. target-owned é bem determinada pela evidência; onde ela falhou, falhou pelas razões previsíveis.

| # | Referência | De → Para | Por que era genuinamente ambíguo |
|---|---|---|---|
| 1 | `commands/relay-design-map.md:43` → `docs/anti-patterns.md (target project)` | `TARGET_PROJECT_BY_DESIGN` → **`AMBIGUOUS`** | A anotação `(target project)` do próprio autor induziu ao erro. Mas a regra citada — *"Flipping `figma_track` (or any future opt-in gating key) by heuristic"* — existe **só** no `docs/anti-patterns.md:89` do relay; grep em `spe-cms` por `figma_track`/`gating key` retorna zero. A anotação **afirma uma posse que é falsa para o conteúdo citado**. |
| 2 | `skills/context-builder/SKILL.md:322` → `docs/context/redaction-policy.md` | `AMBIGUOUS` → **`BROKEN_PLUGIN_INTERNAL`** | O próprio raciocínio da 1ª passagem admitia *"the parenthetical self-disambiguates to the plugin repo"* — o que é a definição de plugin-owned inalcançável. `AMBIGUOUS` era inconsistente com o tratamento dado às linhas 437/470 do mesmo arquivo, estruturalmente idênticas. Rotular igual importa: é um único padrão de correção. |

**Além disso, ~15 correções factuais dentro de vereditos que concordaram com a classificação.** Estas são as que mais economizam tempo do autor, porque impedem perseguir consequências que não existem:

| Correção | Efeito |
|---|---|
| `plan-writer.md:809` — `plan-reviewer` **não** referencia `mock-sentinels.md` (grep: zero) | Cláusula de enforcement removida; o cascade real é só o Implementer. |
| `design-map-writer.md:176` — bloco de status **está** inline em :182-185 | Só `inventory_truncated` se perde. |
| `plan-writer.md:121` — basename nu, não alvo independente | Contar como quebra separada infla o total. |
| `design-map-writer.md:36` — `design-system.md` **não** é gerado por `context-builder` | É command-owned, scaffolded por `/relay-design-map` (`SKILL.md:1043/1418`). Não citar context-builder como fonte. |
| `post-green-reviewer.md:34` — `test-runner.md:24` **não** pertence à lista by-design | Diz *"per `docs/decision-gate.md` of the relay plugin repo"* → mesma classe `AMBIGUOUS` de `plan-reviewer.md:29`. |
| `normalize-test-output.mjs:49` — `die()` não chama `printHelp` | Só `--help` e o `die(2)` de args faltando; não é "toda invocação malformada". |
| `relay-design-map.md:316` — o cache **já tem** `node_modules` populado | A alegação "o install de dependência nunca acontece" não está estabelecida; o dano provado é a nota que culpa o checkout do usuário. |
| `capture.mjs:34` — no source tree `playwright` **resolveria** pelo `node_modules` da raiz | Quem quebra primeiro é `compare.mjs` (`pixelmatch`/`pngjs` ausentes). |
| `SKILL.md:631` — o referente mais próximo é `anti-patterns.md:43`, não `decisions.md:35` | Ajuste de grounding, mesma conclusão. |
| `SKILL.md:643` — âncora off-by-one (o token fecha na 642) | — |
| `relay-pr.md:421` — cita "line 114"; o padrão está na **118** | Defeito extra que a 1ª passagem não viu. |
| `relay-test-write-review.md:223` — não existe `plugin.json` na raiz do repo | Está em `plugins/relay/.claude-plugin/plugin.json`; resolve em lugar nenhum, não "só no repo de autoria". |
| `relay-worktree.md:23` — "committed report" não verificado | `PRPs/reports/*` é gitignored **neste** repo; `context-builder` não emite regra equivalente para alvos. O risco de escrita não-redigida permanece; o de commit é project-dependent. |
| `relay-plan-review.md:28` — a dependência é especificamente o item **R8**, não a rubrica inteira | — |
| `visual-verifier.md:105` — **sub-escopado**: o mesmo defeito está em :115, :118, :14 e no frontmatter :3 | Corrigir só a 105 deixa o degrau FULL quebrado. |
| `relay-design-map.md:316` — mesma forma bare em :313, :319, :433, :449 | Idem. |

**Onde a prosa do autor é genuinamente ambígua** (as duas reclassificações e três correções apontam para o mesmo lugar): as **anotações `(in the target project)`** e as **citações datadas/pinadas em linha**. São exatamente os pontos onde o autor sinalizou intenção explicitamente — e sinalizou errado. `relay-write-test.md:27` usa a mesma anotação `(in the target project)` e ali ela é **verdadeira**; `relay-implement.md:24`, `relay-visual-review.md:25` e `relay-design-map.md:43` usam-na e ali é **falsa**. A anotação, hoje, não carrega informação.

---

## 5. Packaging: source vs. cache

### O que determina o que vai para o cache

**Cópia integral do diretório do plugin. Não existe allowlist.**

- `plugins/relay/.claude-plugin/plugin.json` tem **346 bytes** e apenas `name`/`version`/`description`/`author`. Sem `files`, `include`, `exclude`, `commands`, `agents`, `hooks`, `mcpServers`.
- `marketplace.json` declara `"source": "./plugins/relay"`. A máquina de install copia esse diretório verbatim para `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`.
- Corroborado pelo segundo marketplace instalado: `prp-marketplace` é github-source, então o **repo inteiro** é clonado para `~/.claude/plugins/marketplaces/prp-marketplace/`, mas só `plugins/prp-core/` vai para o cache. Mesma forma.
- **Consequência:** o único jeito de tornar um arquivo alcançável por `${CLAUDE_PLUGIN_ROOT}` é colocá-lo fisicamente sob `plugins/relay/`. Não há botão no manifesto.

### Divergência source ↔ cache: **zero**

`find | sort` nos dois + `diff -rq`:

| Métrica | Resultado |
|---|---|
| Arquivos em `plugins/relay/` (source) | 50 |
| Arquivos em `cache/…/0.25.0/` | 297 |
| Arquivos do source ausentes no cache | **0** |
| Arquivos byte-diferentes | **0** (`diff -rq` não produziu nenhuma linha `differ`) |
| Extras no cache | 247, em dois grupos gerados em runtime |

Os 247 extras: `.in_use/<pid>` (5 marcadores de refcount do Claude Code, com o varredor `~/.claude/plugins/.last_inuse_sweep` ao lado) e `scripts/visual/node_modules/` (241 arquivos: `playwright`, `playwright-core`, `pixelmatch`, `pngjs`) + `package-lock.json`. **Nenhum é defeito de packaging.** O cache é um espelho fiel — confirma que o defeito é o layout da fonte, não sincronização.

### Version mismatch: **nenhum**

| Verificação | Resultado |
|---|---|
| `plugin.json` version | `0.25.0` |
| Diretório do cache | `…/relay/0.25.0` |
| `installed_plugins.json` `gitCommitSha` | `4f6023b556046bd33f93890709d32c4b8c624796` |
| `git rev-parse HEAD` | `4f6023b556046bd33f93890709d32c4b8c624796` — **idêntico**, zero commits desde o install |
| `git status --porcelain plugins/relay` | limpo |

**Consequência interpretativa:** não existe válvula de escape "vai sair no próximo publish". O que está no disco é exatamente o que todo usuário instalado tem. Todo achado deste relatório está vivo no artefato 0.25.0 publicado.

### Dois achados de packaging fora do padrão `docs//PRPs`

1. **`docs/` nunca foi empacotado, em versão nenhuma.** Checadas as cinco versões em cache (0.22.0, 0.23.0, 0.23.1, 0.24.0, 0.25.0) — nenhuma tem `docs/`.
2. **`scripts/visual/node_modules` só existe em `0.25.0`.** `0.22.0` nem tem `scripts/visual/`; `0.23.0`/`0.23.1`/`0.24.0` têm os quatro arquivos sem `node_modules`. Como o cache é versionado por diretório, **o install de dependências do tooling visual é destruído a cada bump de versão e nunca existe num install novo**. `scripts/visual/package.json` declara `playwright`/`pixelmatch`/`pngjs`, `node_modules/` é gitignored, e nada no plugin empacotado instala: `provision.mjs` só roda `npx playwright install --dry-run chromium` (presença do binário do browser), nunca verifica se os três pacotes resolvem. Numa execução não provisionada, `capture.mjs`/`compare.mjs` morrem com `ERR_MODULE_NOT_FOUND` **antes** de qualquer tratamento de erro próprio — e então `generate-final-report.mjs` omite a seção inteira de Visual Fidelity pelo seu idioma documentado de omissão, tornando a falha invisível no relatório final. **Isto é um defeito de packaging de dependência, não de caminho, e precisa de correção diferente** (vendorizar, adicionar passo de install, ou lazy-import com degradação nomeada).

### Auditoria de self-location (`import.meta.url`) — tudo seguro

Quatro guards (`normalize-test-output.mjs:334`, `provision.mjs:130`, `capture.mjs:172`, `compare.mjs:142`) e uma resolução real (`normalize-test-output.test.mjs:59`). Os guards **comparam** em vez de resolver — independentes de localização. A única resolução aponta para um irmão no mesmo diretório empacotado. A normalização via `pathToFileURL` está correta no Windows. **Nenhuma ação.**

---

## 6. Opções de remediação

| Estratégia | Veredito | Por quê |
|---|---|---|
| **A. Mover `docs/` e `PRPs/` inteiros para dentro de `plugins/relay/`** | **Não, no atacado** | (1) Quebra o dogfooding do próprio repo — `relay-marketplace` aponta para o diretório do repo, e todo comando relay aqui lê `docs/decisions.md`/`docs/anti-patterns.md`/`docs/context/architecture.md` **na raiz do alvo**. (2) `PRPs/` são **11 MB** e `docs/` 576 KB (só `docs/decisions.md` = 225 KB) contra um pacote atual de ~50 markdowns pequenos. (3) Duas árvores `PRPs/` — relay *escreve* em `PRPs/` no alvo. (4) Quebra `promptfooconfig.yaml` (4 fixtures), `.gitignore`, `scripts/efficiency.mjs:49-50`, `artifact-naming.mjs:22`, `timestamp-contract.mjs:350,382`, `path-existence.mjs:61,88`, `scan-root-lock.mjs`, `CLAUDE.md`, `documentation/` (~150 refs em prosa). |
| **A′. Mover só os 8 recursos plugin-owned (~88 KB)** | **RECOMENDADO** | Contorna os quatro bloqueadores. É o precedente que o autor já executou uma vez. |
| **B. Copiar/sincronizar no release** | Rejeitar — dominado | Não existe script de release; o único gate que dispara é `.githooks/pre-commit`. Exigiria duas cópias + um novo check de sha256 para controlar drift — exatamente a maquinaria que se construiria para um symlink impossível, só para evitar um `git mv` em 8 arquivos. |
| **C. Symlink** | **Morto — três kills independentes** | (1) `git config core.symlinks` = **`false`** neste repo; symlinks são checkados como arquivos de texto. (2) Testado em scratch: `ln -s ../../docs plugins/relay/docs` no Git Bash produziu **um diretório real vazio**; `git add -A` indexou nada útil. (3) **Decisivo e independente de plataforma:** mesmo um symlink relativo materializado corretamente escapa do root empacotado — `plugins/relay/docs -> ../../docs` vira `…/0.25.0/docs -> …/cache/relay-marketplace/docs`, que não existe. **Pendente por construção também no macOS e Linux.** Absoluto é pior: assaria `C:\repos\PRPs-agentic-eng` no install de todo mundo. |
| **D. Inlinar os templates nos consumidores** | Rejeitar como estratégia — mas **manter o que já existe** | Os 8 arquivos somam 84,5 KB, mas a duplicação é multiplicativa: `prd-template.md` sozinho é referenciado por 7 arquivos → ~76 KB de prompt duplicado para um só template, em arquivos já enormes (`plan-writer.md` > 1250 linhas). O inlining parcial existente é justamente o que rebaixa `prd-reviewer`, `relay-test`, `relay-worktree` e 6 dos 8 `mock-sentinels` de ALTA para BAIXA. **Não estender.** |
| **E. Resolver em runtime a partir do alvo ou de local conhecido** | Rejeitar | E1 (resolver do alvo) é empiricamente impossível — é exatamente o que as ~40 refs bare já tentam e já falham. E2 (`context-builder` emite os templates por projeto) cria N cópias que derivam independentemente e não são atualizáveis por upgrade do plugin: version skew silencioso por projeto, pior que o bug atual. E3 (`~/.claude/relay/`) adiciona um passo de install que o mecanismo de marketplace não tem. |

### Recomendação

**Mover os 8 recursos plugin-owned para `plugins/relay/resources/`, normalizar as ~72 referências das classes C1+C2+C3, corrigir a classe C4 por troca de prefixo, e estender o validate para que nenhuma das três classes possa regredir.**

**Por que `resources/` e não `plugins/relay/docs/`:** chamar de `docs/` recria a ambiguidade que causou o bug — quem lê `docs/context/prd-template.md` continua sem saber de quem é o `docs/`. Um nome distinto torna a regra mecanicamente verificável: *qualquer* `${CLAUDE_PLUGIN_ROOT}/docs/…` vira erro duro, e *qualquer* `docs/…` bare é target-scoped por definição. Também deixa o `docs/` da raiz intocado, então dogfooding, `SCAN_ROOTS`, o site `documentation/` e o `CLAUDE.md` do repo continuam funcionando com **zero** edições.

---

## 7. Plano de migração

### Fase 0 — escrever a regra antes de mover nada

Em `docs/context/conventions.md`:

- `${CLAUDE_PLUGIN_ROOT}/{agents,commands,skills,scripts,.claude-plugin,resources}/…` — empacotado; **deve** resolver.
- bare `docs/…` — o projeto **alvo**; **nunca** prefixar com `${CLAUDE_PLUGIN_ROOT}`.
- no repo-fonte mas não empacotado (`PRPs/`, `docs/` da raiz) — **só prosa de proveniência**; nunca escrito como token de caminho.
- citação de regra em arquivo target-relative: **por título de seção, nunca por número de linha**.

### Fase 1 — a correção mais barata, que não depende de mover nada (classe C4)

```bash
# 8 ocorrências, 2 arquivos, resolve o defeito de severidade H0
# agents/visual-verifier.md: 3, 14, 105, 115, 118
# commands/relay-design-map.md: 313, 316, 319, 433, 449
s|<target_root>/plugins/relay/scripts/|${CLAUDE_PLUGIN_ROOT}/scripts/|
s|plugins/relay/scripts/|${CLAUDE_PLUGIN_ROOT}/scripts/|
```

Modelo correto já existente no repo: `agents/test-runner.md:154` e `commands/relay-visual-approve.md:23`. Faça esta fase **primeiro** — é a única que devolve funcionalidade real (comparação de pixels) e não bloqueia em nenhuma decisão de layout.

### Fase 2 — mover (8 arquivos, ~88 KB)

```bash
git mv docs/context/{prd-template,plan-template,design-spec-template,\
component-map-template,redaction-policy,settings-allowlist,\
test-output-schema,mock-sentinels}.md plugins/relay/resources/
```

**Não deixar stubs** — stubs recriam a ambiguidade. Atualizar `docs/KNOWLEDGE_BASE.md` e o `CLAUDE.md` do repo. `docs/context/code-review-registries.md` **permanece** (target-owned por design). `docs/decisions.md` e `PRPs/prds/` **não se movem**.

### Fase 3 — reescrever referências (~72), na ordem de severidade

1. **18 refs C1**: `${CLAUDE_PLUGIN_ROOT}/docs/context/*` → `${CLAUDE_PLUGIN_ROOT}/resources/*`. Mecânico.
2. **~40 refs C3 bare** → `${CLAUDE_PLUGIN_ROOT}/resources/*`, nesta ordem:
   `design-map-writer.md:3,47,120,176` → `context-builder/SKILL.md:110,112,114,263,310,322` → `design-spec-writer.md:3,66,324` + `visual-verifier.md:99,100` + `capture.mjs:54` → `prd-writer.md:3,13,45,418,438,447,457` → `plan-writer.md:118,644,776,809,814,883,1041` (+451,675,204,220,906,923,1246) → `test-runner.md:43,130,135` + `normalize-test-output.mjs:7,49` → `relay-pr.md:312,326,417,435` → `relay-worktree.md:23,271,354` → `relay-qa-report.md:22,109` → `relay-implement.md:24`, `relay-visual-review.md:25`, `relay-execute.md:111`, `relay-plan.md:191`, `code-reviewer.md:534`, `research-design.md:63`, `relay-approve.md:444`, `relay-commit.md:331`, `relay-visual-approve.md:213`.
   **Deletar as anotações falsas `(in the target project)`** em `relay-implement.md:24` e `relay-visual-review.md:25`.
3. **~25 refs C2 + C5** (14 PRDs com prefixo + bare `PRPs/…` + `relay-test.md:24`) → converter em prosa sem forma de token de caminho, ex.: *"source PRD `test-runner.prd.md` no repo-fonte do relay (não empacotado)"*. Deixar um `${CLAUDE_PLUGIN_ROOT}/…` aqui continuaria mentindo.
4. **~10 refs C6** → deletar ou inlinar. Corrigir `relay-test-write-review.md:219/223` para nomear o risco real (editar o cache instalado) em vez de um caminho inexistente, e `relay-implement.md:412` para remover o parentético stale *"not yet built as of this phase"*.
5. **Classe C7** — remover os pins de linha e as datas nas ~30 citações; citar por título. Baixa prioridade, mas barato em lote.
6. **Não tocar**: `<target_root>/docs/context/code-review-registries.md` e todo `docs/…` bare target-scoped.

**Nota de design para H5:** depois da correção, `plan-writer` passará a escrever `${CLAUDE_PLUGIN_ROOT}/resources/mock-sentinels.md` como linha P0 de `## Mandatory Reading` dentro do plano gerado. Isso resolve para o Implementer (é agente relay, tem a variável), mas fica **opaco para um humano lendo o plano**. Considere emitir a linha com uma glosa: `` `${CLAUDE_PLUGIN_ROOT}/resources/mock-sentinels.md` (arquivo do plugin relay instalado) ``.

### Fase 4 — verificar

1. `npm run validate` — `.githooks/pre-commit` bloqueia o commit caso contrário.
2. `node --test scripts/validate/checks/path-existence.test.mjs` e o novo teste da Fase 5.
3. Bump em `plugins/relay/.claude-plugin/plugin.json` **e** heading correspondente em `documentation/changelog.html` — `version-parity.mjs` exige lock-step.
4. **O único teste que prova packaging:** `/plugin update relay`, depois confirmar que os 8 arquivos existem em `~/.claude/plugins/cache/relay-marketplace/relay/<nova-versão>/resources/`. **Nada dentro do repo consegue validar isto** — o cache é a fonte da verdade.

**Esforço:** ~2–3 h. Quase tudo é reescrita mecânica; o custo de julgamento se concentra nas duas anotações falsas e em **não** "consertar" `code-review-registries.md`.

**Ganho parcial mais rápido, se quiser entregar algo hoje:** Fase 1 sozinha (8 linhas, 2 arquivos) devolve toda a malha visual do Figma sem depender de nenhuma decisão de layout.

---

## 8. Prevenção de recorrência

Três coisas, nesta ordem.

### 8.1 Novo check — `scripts/validate/checks/plugin-root-resolvable.mjs`

Este é o check que teria pego as **três** classes quebradas. Escrito autocontido, sem dependências.

```js
// scripts/validate/checks/plugin-root-resolvable.mjs
//
// Impede as tres classes de referencia quebrada corrigidas em <data>:
//   R1  ${CLAUDE_PLUGIN_ROOT}/<x> deve existir dentro de plugins/relay/
//   R2  recursos plugin-owned nunca podem aparecer como caminho bare
//   R3  nada dentro de plugins/relay/ pode escrever o literal "plugins/relay/"
//       (isso e o layout do monorepo vazando para dentro do artefato publicado)
//
// ${CLAUDE_PLUGIN_ROOT} resolve para o DIRETORIO INSTALADO do plugin, que contem
// apenas o conteudo de plugins/relay/. Qualquer coisa fora dele nao e empacotada.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const PLUGIN_ROOT = join(REPO_ROOT, 'plugins', 'relay');

const SCANNED_EXT = new Set(['.md', '.mjs', '.js']);
const SKIP_DIRS = new Set(['node_modules', '.git', '.in_use']);

// Recursos que o plugin possui. Referencia-los sem o prefixo abaixo e erro.
const OWNED_RESOURCES = [
  'prd-template.md',
  'plan-template.md',
  'design-spec-template.md',
  'component-map-template.md',
  'redaction-policy.md',
  'settings-allowlist.md',
  'test-output-schema.md',
  'mock-sentinels.md',
];
const OWNED_PREFIX = '${CLAUDE_PLUGIN_ROOT}/resources/';

// R3: linhas onde "plugins/relay/" e prosa legitima sobre o repo-fonte.
// Manter esta lista MINIMA e justificada; toda entrada e divida tecnica.
const R3_ALLOW = new Set([
  'scripts/normalize-test-output.test.mjs', // linha "Run:" para o mantenedor
]);

const RE_PLUGIN_ROOT = /\$\{CLAUDE_PLUGIN_ROOT\}\/([A-Za-z0-9._\-/]+)/g;
const RE_MONOREPO    = /plugins\/relay\/[A-Za-z0-9._\-/]+/g;

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(join(dir, e.name), out);
    } else if (SCANNED_EXT.has(e.name.slice(e.name.lastIndexOf('.')))) {
      out.push(join(dir, e.name));
    }
  }
  return out;
}

// Remove pin de linha (":111-113") e pontuacao/backtick de cauda.
function cleanPath(p) {
  return p.replace(/:\d+(-\d+)?$/, '').replace(/[.,;:`)\]}'"]+$/, '');
}

export function run() {
  const findings = [];
  for (const abs of walk(PLUGIN_ROOT)) {
    const relFile = relative(PLUGIN_ROOT, abs).replace(/\\/g, '/');
    const lines = readFileSync(abs, 'utf8').split(/\r?\n/);

    lines.forEach((line, i) => {
      const at = `plugins/relay/${relFile}:${i + 1}`;

      // R1 — todo ${CLAUDE_PLUGIN_ROOT}/<x> tem de existir no plugin root.
      for (const m of line.matchAll(RE_PLUGIN_ROOT)) {
        const rest = cleanPath(m[1]);
        if (!rest) continue;
        const target = join(PLUGIN_ROOT, rest);
        if (!existsSync(target)) {
          findings.push({
            rule: 'R1', at, ref: `\${CLAUDE_PLUGIN_ROOT}/${rest}`,
            message: 'nao existe dentro de plugins/relay/ — nao sera empacotado',
          });
        }
      }

      // R2 — recurso plugin-owned citado sem o prefixo obrigatorio.
      for (const base of OWNED_RESOURCES) {
        let idx = line.indexOf(base);
        while (idx !== -1) {
          const before = line.slice(0, idx);
          if (!before.endsWith(OWNED_PREFIX)) {
            findings.push({
              rule: 'R2', at, ref: base,
              message: `recurso do plugin deve ser citado como ${OWNED_PREFIX}${base}`,
            });
          }
          idx = line.indexOf(base, idx + base.length);
        }
      }

      // R3 — layout do monorepo vazando para dentro do artefato publicado.
      if (!R3_ALLOW.has(relFile)) {
        for (const m of line.matchAll(RE_MONOREPO)) {
          findings.push({
            rule: 'R3', at, ref: m[0],
            message: 'use ${CLAUDE_PLUGIN_ROOT}/<subdir>/… — "plugins/relay/" '
                   + 'nao existe em nenhum projeto-alvo nem no cache instalado',
          });
        }
      }
    });
  }

  return { name: 'plugin-root-resolvable', ok: findings.length === 0, findings };
}
```

> **Confirme a forma de retorno contra um check irmão antes de ligar.** A saída observada de `path-existence` é `{"name":"path-existence","ok":true,"findings":0}` — `findings` pode ser um contador no sumário e um array no check. Ajuste para casar; é a única parte deste código que não pude verificar contra a implementação real.

Registrar em `scripts/validate/index.mjs` (o array `CHECKS`, hoje com 11 entradas):

```js
import { run as pluginRootResolvable } from './checks/plugin-root-resolvable.mjs';
// …
const CHECKS = [ /* … */ pluginRootResolvable ];
```

### 8.2 Ajustes em `scripts/validate/checks/path-existence.mjs`

- Adicionar `'resources/'` a `CLAUDE_PLUGIN_ROOT_ALLOWED_PREFIXES` (linha 74).
- **Deletar o parágrafo "KNOWN DEFERRED GAP"** (linhas 32-35) e tornar `${CLAUDE_PLUGIN_ROOT}/docs/…` e `${CLAUDE_PLUGIN_ROOT}/PRPs/…` **falha dura** — depois desta migração elas nunca mais podem estar certas.
- `SCAN_ROOTS` (61) e `scan-root-lock.mjs` não precisam mudar.
- *(Nota não relacionada, observada em passagem: `scripts/validate/checks/scan-root-lock.mjs` existe no disco mas **não está registrado** no array `CHECKS`. Não é packaging, mas vale um olhar.)*

### 8.3 O único gate que o repo não tem

`.githooks/pre-commit` é a única automação que dispara — não há `.github/`, não há CI. O check acima roda no pre-commit e é suficiente para as três classes de caminho. **Mas nada dentro do repo consegue validar packaging.** O passo do §7 Fase 4.4 (`/plugin update` + `ls` no diretório do cache) tem de virar item de checklist manual de release em `documentation/`, ou a próxima regressão de packaging passa igual.

---

## 9. O que esta auditoria **não** conseguiu determinar

Honestamente, e com o motivo:

1. **Se o schema do manifesto de plugin suporta `files`/`include`/`exclude`.** O `plugin.json` do relay não tem nenhum desses campos e nenhum schema documentado foi encontrado no repo. A conclusão "cópia integral do diretório, sem allowlist" é **inferida do comportamento observado** (relay directory-source e prp-core github-source produzem ambos um cache contendo só o subtree do plugin), não de especificação. Se existir tal campo, a estratégia A′ pode ser substituída por algo mais barato.

2. **De onde veio `scripts/visual/node_modules` no cache 0.25.0.** A presença de um `package-lock.json` ausente da fonte e a ausência total nos caches 0.23.x/0.24.0 apontam para um `npm install` manual naquele diretório. **Não provado** — poderia ter havido um hook de install em algum momento.

3. **O comportamento real de degradação quando um `Read` falha.** Toda alegação de "improvisa em silêncio" é raciocinada a partir da **ausência de um branch de degradação na prosa do agente**, não observada em execução. Se o modelo executor generalizar a regra de abort de `SKILL.md:123` (que foi escrita para uma variável irresolúvel, não para um arquivo ausente), a degradação pode ser mais limpa do que o descrito. Testar exigiria rodar o pipeline num projeto-alvo limpo — fora do escopo de uma auditoria estática.

4. **Se a lacuna de redação vaza segredos na prática.** Depende do conteúdo do `env` e do script de bootstrap do projeto-alvo. `PRPs/reports/*` é gitignored **neste** repo, mas `context-builder` não emite regra equivalente para alvos — então "chega a um commit" é dependente do projeto. O risco de **escrita** não-redigida em `stdout.log` e da propagação para o corpo do PR está estabelecido; o de publicação não.

5. **Se as ~30 referências da classe C7 alguma vez são de fato dereferenciadas.** Nenhuma é instrução de `Read`; todas são prosa de justificativa com a regra restated inline. Se um modelo executor decide abrir o arquivo por iniciativa própria, ele lê conteúdo alheio em silêncio. Não determinável estaticamente — por isso foram classificadas `AMBIGUOUS` e explicitamente **não** marcadas como bug.

6. **Symlink no macOS/Linux.** O teste empírico foi feito em Windows/Git Bash. O terceiro kill (symlink relativo escapa do root empacotado) é argumentado **estruturalmente** a partir do layout do cache, não executado nessas plataformas. A conclusão é robusta, mas não foi reproduzida lá.

7. **Contagem exata de referências.** Os totais por classe variam conforme se conte ocorrências de frontmatter, citações repetidas do mesmo caminho dentro de um arquivo, e basenames nus em prosa (ex.: `plan-writer.md:121`) como itens independentes. Os números aqui (18 / 14 / ~40 / ~30) usam a contagem por token de caminho distinto por arquivo; as tabelas do §3 enumeram linha a linha e são a referência autoritativa para a correção. A diferença é de ~10 itens e é toda em severidade BAIXA.
