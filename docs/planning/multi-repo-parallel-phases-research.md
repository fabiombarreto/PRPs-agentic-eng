# Fases em paralelo e projetos multi-repo — pesquisa pré-PRD

**Status:** artefato de pesquisa (grounding pré-PRD). Não é decisão de arquitetura registrada, não é implementação.
**Data:** 2026-08-31 (§1–§5 e §9 revisados na mesma data, após a rodada de resolução das questões abertas).
**Método:** reconhecimento do repositório relay (comandos, agentes, template de PRD, `docs/decisions.md`) + inspeção direta das topologias reais em `C:\repos\super-ensino` e `C:\repos\inplay`.
**Próximo passo:** `/relay-prd` para o PRD 1 (topologia multi-repo). O paralelismo é PRD 2.
**Estado das questões abertas:** todas as sete resolvidas (§7). Restam quatro afirmações não verificadas (§9), nenhuma bloqueante para o PRD 1.
**Aviso de escopo:** o PRD 1 **altera** a decisão registrada D11 de `relay-worktree.prd.md` (base ref da worktree, §5.9) e adiciona um ponto de confirmação humana antes do loop autônomo. Ambos exigem entrada em `docs/decisions.md` como divergência consciente.

---

## 1. Restrições fixas (não negociáveis no desenho)

1. **Pilar 2 nunca commita.** `docs/decisions.md` 2026-05-18 declara isso como fronteira arquitetural permanente, e `relay-execute.md` Constraint 11 repete. `git add`/`commit`/`push`/`gh pr create` são exclusividade do Pilar 3.
2. **Sem heurística que decide estado.** Precedente forte em `methodology.md`: "Heuristics MUST NOT flip these values — only a human edit or an explicit declaration can." Topologia de repositório é estado; deve ser declarada, não adivinhada.
3. **Artefatos sob `PRPs/`, nunca sob `.claude/`.** `docs/anti-patterns.md` + `docs/decisions.md`.
4. **Degradação graciosa preservada.** Projeto single-repo deve continuar funcionando byte-a-byte como hoje, sem nova declaração obrigatória.

---

## 2. O que existe hoje no relay

### 2.1 O serial é um "Won't" explícito, não uma omissão

| Evidência | Local |
|---|---|
| "Parallel phase orchestration — MVP is strictly serial. The `Parallel` cell is read but not acted upon." | `relay-execute.md:1060` |
| "There is at most one such row under this orchestrator's serial execution model (D6)." | `relay-execute.md:224` |
| "Pick the lowest-numbered actionable row." | `relay-execute.md` Phase A.1 |
| Coluna `Parallel` presente no header exact-match validado por P3, sem semântica definida (template só mostra `-`) | `resources/prd-template.md:184` |

A coluna `Parallel` já é parte do contrato de parsing (P3 valida o header caractere-a-caractere), mas nenhum consumidor a lê. Ela é um slot reservado, não uma feature quebrada.

### 2.2 Uma worktree por feature, criada por fase

`relay-execute.md` Phase A.3.3 adota `/relay-worktree` inline a cada iteração de fase, para o mesmo `<feature>`. `/relay-worktree` é idempotente (`git worktree list --porcelain`, D4), então da segunda fase em diante ele **reusa** a mesma worktree. Resultado: N fases, 1 working tree suja, 0 commits.

### 2.3 `target_root == cwd == um repositório git`

- `relay-execute.md:68` — "Record `target_root` as the current working directory."
- `relay-worktree.md` P1 — `git rev-parse --show-toplevel`; `repo_root` é a raiz desse único repo.
- `relay-prd.md:251` — "Cross-project PRDs — /relay-prd writes to the current repository's PRPs/prds/. Multi-repo coordination is out of scope."

O caminho `.worktrees/<feature>/` aparece hard-coded em 5 comandos (`relay-worktree` 29x, `relay-pr` 20x, `relay-commit` 18x, `relay-approve` 10x, `relay-execute` 3x) mais `settings-allowlist.md` e o `context-builder`. Qualquer generalização de topologia toca esses 7 arquivos.

### 2.4 O `context-builder` não tem noção de workspace

`SKILL.md:224` cita "monorepo" apenas como um valor possível de *project type* na fase de reconhecimento. Não existe modo de inicialização para uma raiz que contém repos — só para um repo. Isso é uma lacuna do PRD 1, não um bug.

---

## 3. Topologias reais medidas (2026-08-31)

| Projeto | Raiz é repo git? | Raiz inicializada pelo relay? | Repos filhos | Filhos inicializados? |
|---|---|---|---|---|
| `PRPs-agentic-eng` (este) | sim | sim | nenhum | — |
| `super-ensino` | **não** | **não** (só `CLAUDE.md` + `docs/reports/`) | 8 | **6 de 8**, completos |
| `inplay` | sim | **sim**, completo | 2 | **não** (só `CLAUDE.md`; `PRPs/` só em `inplay-back`) |

Três topologias distintas, não duas. E `super-ensino` e `inplay` são **imagens espelhadas**: um tem os filhos inicializados e a raiz vazia, o outro tem a raiz inicializada e os filhos vazios. Um desenho que assuma qualquer um dos dois como padrão quebra no outro.

### 3.1 `super-ensino` — os filhos são projetos relay completos

| Repo | `CLAUDE.md` | `docs/decisions.md` | `docs/anti-patterns.md` | `docs/context/architecture.md` | `docs/context/methodology.md` | `PRPs/` | PRDs |
|---|---|---|---|---|---|---|---|
| `portal` | sim | sim | sim | sim | sim | sim | 0 |
| `spe-api` | sim | sim | sim | sim | sim | sim | 1 |
| `spe-cms` | sim | sim | sim | sim | sim | sim | 2 |
| `spe-services` | sim | sim | sim | sim | sim | sim | 2 |
| `spe-simulados-v2` | sim | sim | sim | sim | sim | sim | 3 |
| `spe-interaction-services` | sim | sim | sim | sim | sim | sim | 1 |
| `spe-ui` | sim | sim | sim | sim | **não** | **não** | — |
| `spe-tokens` | **não** | **não** | **não** | **não** | **não** | **não** | — |

Os dois últimos são declarados **REFERENCE-ONLY (do not modify)** pelo `CLAUDE.md` da raiz. A ausência de inicialização é intencional, não um esquecimento — mas nada no relay impede hoje que um plano os edite.

### 3.2 `methodology.md` diverge radicalmente entre repos

| Repo | `tdd` | `test_frameworks` | Outros flags |
|---|---|---|---|
| `portal` | false | `vitest`, `testing-library` | — |
| `spe-api` | true | `jest` | `docs_sync: true`, `figma_track: false` |
| `spe-cms` | true | `vitest` | `figma_track: true`, `visual_first_approval: human` |
| `spe-services` | true | `pytest` + 5 plugins | — |
| `spe-simulados-v2` | false | `vitest` | — |
| `spe-interaction-services` | false | `pytest` + 4 plugins | — |

Jest, vitest e pytest coexistem; `tdd` difere; `figma_track` é verdadeiro em exatamente um repo. Um `methodology.md` único na raiz é **incapaz** de representar este estado.

### 3.3 O `CLAUDE.md` da raiz do `super-ensino` já é o registro de topologia

Escrito à mão, declara: *"This folder is a workspace container: each subproject is its own repo with independent build, deploy, and CI. Always read the subproject's own `CLAUDE.md` and `docs/` before making changes; this file only tells you which subproject to touch."*

Contém a tabela dos 8 repos com papel e stack, o diagrama de quem-chama-quem, e uma tabela **"Where to put a new feature"** que roteia tipo-de-mudança para o par de repos correspondente. O registro de topologia que o PRD 1 precisa **já existe como prosa** — falta apenas uma forma parseável ao lado dela.

### 3.4 Já existe um PRD multi-repo em produção, no lugar errado

`super-ensino/.claude/PRPs/prds/coleta-dados-visualizacao-video.prd.md`, acompanhado de cinco relatórios de fase (`phase-1-backend`, `phase-2/3/4-frontend-camada-1/2/3`, `phase-5-verificacao-rollout`) e um `PRPs/research/`.

Dois fatos importam: (a) o padrão de trabalho multi-repo **já é praticado à mão**, com fases nomeadas por repo; (b) foi parar sob `.claude/`, violando a restrição 3, porque não existe convenção de `PRPs/` na raiz do workspace. É demanda comprovada, não hipótese.

---

## 4. Modos de falha hoje (verificados, não hipotéticos)

**F1 — Degradação silenciosa em `super-ensino`.** `/relay-worktree` P1 falha com `FAILED_NOT_A_GIT_REPO`. `relay-execute.md:481-492` trata isso como falha não-fatal e cai para "cwd na branch atual", logando `worktree_succeeded: false`. O pipeline **prossegue e edita a árvore de trabalho real de cada sub-repo, na branch que estiver checada**, com um único warning. O contrato de isolamento nunca existiu nesses projetos.

**F2 — Worktree vazia em `inplay`.** A raiz é repo, então a worktree é criada com sucesso em `C:\repos\inplay\.worktrees\<feature>\` e a checagem de sucesso **passa**. Mas `inplay-back` e `inplay-front` estão no índice como gitlinks (modo `160000`) e **não existe `.gitmodules`** — são submódulos órfãos. A worktree nasce com esses diretórios **vazios**. O implementer não escreve só na árvore errada: escreve numa árvore onde o código não existe. Mais perigosa que F1, porque nada sinaliza.

**F3 — Base de diff compartilhada entre fases.** Como Pilar 2 nunca commita, `git merge-base HEAD <base>` devolve a MESMA base para todas as fases. O code-review da fase N herda os arquivos das fases 1..N-1 e emite falhas R-S1/R-S2 falsas. Isto **já ocorre em modo serial** (observado em execução real sobre `test-formatting-prevention-preflight.prd.md`, 2026-08-26). Paralelismo transforma o defeito em corrupção: dois implementers escrevendo na mesma árvore, sem diff atribuível a nenhum.

**F4 — Worktrees perdem `.claude/settings.json`.** Gitignorado, logo `git worktree add` não o copia; `test-runner` retorna `ABORT_INFRA/missing_settings_json`. O hook `scripts/worktree-bootstrap.sh` existe exatamente para isso (D9) mas este repo não o entrega.

**F5 — Repos reference-only não são protegidos.** `spe-ui` e `spe-tokens` são "do not modify" apenas em prosa no `CLAUDE.md` da raiz. Nada no relay impede um plano de editá-los ou de criar worktree neles.

**F6 — Artefatos de workspace sob `.claude/`.** §3.4. O anti-pattern já foi violado na prática porque a alternativa correta não existe.

**F7 — A worktree nunca nasce do checkout atual.** A cadeia D11 (`relay-worktree.md:118`) é `--base` → `origin/main` → `origin/master` → `HEAD`. O checkout atual é o **último** elo e só é alcançado se `origin/main` *e* `origin/master` falharem — o que não acontece em nenhum destes repos. Na prática o relay sempre ramifica de `origin/main`, ignorando a linha em que o operador está trabalhando.

Caso concreto de dano documentado pelo próprio `CLAUDE.md` da raiz do `super-ensino`: `spe-api` tem `main` (v2.2.x) e `feat/portal-endpoint` (v2.12.x) como **linhas divergentes com números de versão sobrepostos** ("higher tag ≠ newer"). Trabalhar em `feat/portal-endpoint` e receber uma worktree ramificada de `origin/main` produz código sobre a linha errada, sem sinal algum.

F3 é o bloqueador do paralelismo. F1, F2, F5, F6 e F7 são os bloqueadores do multi-repo. F4 é pré-existente e bloqueia qualquer worktree nova de rodar testes.

---

## 5. Proposta de desenho

### 5.1 Dois planos, explicitamente separados

Hoje `project_root` e `target_root` são a mesma variável. O desenho precisa separá-las:

| Plano | Raiz | Conteúdo | Multiplicidade |
|---|---|---|---|
| Artefatos (workspace) | `project_root` (o cwd) | `PRPs/prds/`, `PRPs/plans/`, `PRPs/reports/`, `docs/context/architecture.md` (topologia) | **um** |
| Código + contexto | `repo_root` (por repo participante) | worktree em `<repo_root>/.worktrees/<feature>/`, `docs/decisions.md`, `docs/anti-patterns.md`, `docs/context/methodology.md` | **N** |

O plano de artefatos permanece único — um PRD, um `orchestrator-run.json`, um escritor. Isso mantém auditoria e HALTs num lugar só. Só o plano de código se multiplica.

**A raiz do workspace passa a ser um repo git** (O4), para que o plano de artefatos seja versionado como em qualquer outro projeto relay. `inplay` já satisfaz isso; `super-ensino` precisa de um `git init` na raiz — que versiona apenas artefatos e o `CLAUDE.md`/`docs/` do workspace, nunca código (os sub-repos ficam ignorados). Sem isso, `PRPs/plans/completed/` e os `.jsonl` de veredicto ficariam fora de git, perdendo revisão e histórico.

### 5.2 Registro de topologia em `docs/context/architecture.md` do workspace

`architecture.md` é prosa, sem frontmatter — o idioma de config legível por máquina hoje vive no frontmatter de `methodology.md`. Para manter o registro em `architecture.md` (O1) sem inventar um terceiro idioma, usa-se o padrão que o relay **já** aplica: seção com header exact-match e tabela GFM, exatamente como P3 faz com a tabela de fases.

Forma proposta:

    ## Repository topology

    | Repo | Path | Role | Base |
    |------|------|------|------|
    | spe-services | spe-services | editable | current |
    | spe-api      | spe-api      | editable | origin/develop |
    | spe-ui       | spe-ui       | reference-only | - |

Regras de leitura:

- **Seção ausente = single-repo.** Comportamento atual preservado byte-a-byte; nenhum projeto existente precisa migrar. Esta é a cláusula que satisfaz a restrição 4.
- Seção presente = multi-repo; cada `Path` é relativo a `project_root` e **deve** resolver para um diretório com `.git`. Path que não resolve é HALT nomeado, não warning — F1 e F2 existem justamente porque o modo de falha atual é warning.
- `Role` é semântico, não decorativo: `editable` autoriza worktree e edição; `reference-only` faz o relay **recusar** criar worktree e HALTar se uma fase o referenciar (fecha F5).
- `Base` é a base da worktree daquele repo (§5.9). Valor `current` = o `HEAD` atualmente checado; qualquer outro valor é uma ref nomeada resolvida por `git rev-parse --verify`. Default quando a célula está vazia: `current`.

`Role` e `Base` são os dois campos com efeito de execução no PRD 1; `Repo` e `Path` são endereçamento.

Classifica corretamente as três topologias, incluindo o híbrido `inplay` (a raiz é repo, mas a seção existe e lista os filhos, logo os filhos são os alvos de código).

### 5.3 Coluna `Repo` na tabela de fases

O registro de topologia diz *quais* repos existem; a coluna `Repo` diz *qual* deles cada fase toca. São ponteiros distintos e ambos são necessários (O5).

    | # | Phase | Description | Status | Repo | Parallel | Depends | PRP Plan |

- Célula vazia ou `-` em projeto single-repo: comportamento atual, sem migração forçada — mas o header muda, então P3 e os PRDs existentes precisam de migração mecânica.
- O `prd-reviewer` ganha um item de rubrica: todo valor de `Repo` deve existir no registro de topologia e ter `Role: editable`.
- Uma fase referencia **exatamente um** repo. Uma mudança que cruza repos vira duas fases com `Depends` entre elas — que é exatamente o que o PRD manual de §3.4 já fazia à mão com `phase-1-backend` / `phase-2-frontend`.

### 5.4 Uma worktree por repo, não por feature

`<repo_root>/.worktrees/<feature>/` para cada repo participante, na branch `feature/<feature>`. Preserva D1 (path `.worktrees/`), D2 (shell-out de `git worktree add`), D4 (idempotência via `--porcelain`) e D10 (prefixo `feature/`) sem alterar nenhuma decisão registrada — só multiplica a aplicação delas.

### 5.5 Resolução de contexto por repo

Com dois planos, cada leitura de contexto precisa de endereço explícito:

| Leitura | Onde | Justificativa |
|---|---|---|
| Decision Gate (`decisions.md`, `anti-patterns.md`, `architecture.md`) | `repo_root` da fase | §3.1: é o único lugar onde existem no `super-ensino` |
| `methodology.md` (P5, roteamento TDD) | `repo_root` da fase | §3.2: jest/vitest/pytest divergem; um único arquivo é incapaz |
| Registro de topologia | `project_root` | §5.2 |
| PRD, planos, reports, jsonl | `project_root` | §5.1 |

Consequência para o orquestrador: P5 deixa de ser uma leitura no início da sessão e passa a ser **por fase**, depois que a coluna `Repo` foi resolvida. O roteamento TDD (test-first vs test-after) pode diferir entre duas fases do mesmo PRD — `spe-cms` é `tdd: true` e `portal` é `tdd: false`.

### 5.6 Modelo de lane (PRD 2)

Uma **lane** = componente fracamente conexo do grafo de `Depends`, restrito a um repo. Fases na mesma cadeia de dependência compartilham worktree (o que já acontece hoje); cadeias independentes ganham worktrees separadas e podem rodar concorrentemente.

Determinístico, computável a partir da tabela que já existe, sem heurística. A coluna `Parallel` passa a ser a anotação **explícita** do autor do PRD — um override que pode forçar duas cadeias a compartilharem lane (serializar) ou marcar uma cadeia como paralelizável.

### 5.7 Unidade de execução paralela: subagente, não sessão

Pergunta do operador: cada fase em sessão separada, ou disparo de agentes em paralelo?

**Resposta: subagentes em paralelo na mesma sessão, cada lane com worktree própria.**

| Critério | Subagente | Sessão separada |
|---|---|---|
| Modelo D7 (adotar protocolo lendo o `.md`) | sobrevive | perde permissões, plano de artefatos e observabilidade de HALT |
| Isolamento de filesystem | **não fornece** — vem da worktree | também não fornece; duas sessões no mesmo cwd colidem igual |
| Escritor único de `orchestrator-run.json` | natural (subagente devolve resultado estruturado, orquestrador escreve) | exige protocolo de merge de estado |
| Herança de `.claude/settings.json` | sim | não garantida em `claude -p` |

O ponto decisivo: o isolamento que o paralelismo exige é **de filesystem**, e nenhuma das duas opções o fornece. Quem fornece é a worktree. Logo a escolha entre sessão e subagente é decidida pelos critérios secundários, e todos favorecem subagente.

**Risco a validar empiricamente antes de fechar o PRD 2:** profundidade de aninhamento de `Task`. Hoje existe `main → plan-writer → research-codebase` (2 níveis). Paralelizar adiciona um nível: `main → runner-de-fase → plan-writer → research-*` (3 níveis). Isto **não** foi verificado nesta pesquisa e não deve ser assumido — é o primeiro experimento do PRD 2.

### 5.8 Integração e Pilar 3

Decisão do operador: PR único com merge das lanes antes. Ressalva factual: **não existe PR que cruze repositórios**. A leitura coerente e adotada é *um PR por repo, com as lanes daquele repo integradas antes do PR*.

Isso se resolve sem quebrar a restrição 1: a integração acontece no **`/relay-commit` (Pilar 3)**, que já é o dono do commit. Durante todo o Pilar 2 as lanes permanecem não-commitadas em worktrees separadas; ao entrar no Pilar 3, `/relay-commit` integra as lanes do repo numa branch `feature/<feature>` e `/relay-pr` abre um PR por repo. `/relay-approve` passa a coordenar N PRs e N limpezas de worktree.

### 5.9 Base da worktree: declarada por repo, confirmada num preflight único

Fecha F7. Duas metades, deliberadamente separadas.

**Declaração (estática).** A coluna `Base` do registro de topologia (§5.2). O default passa a ser `current` — o `HEAD` checado no repo naquele momento — invertendo a cadeia D11, que hoje coloca `origin/main` primeiro e o checkout atual por último. A base é **por repo**, não por fase: existe uma worktree por repo por feature, logo uma base por repo. Uma ref nomeada (`origin/develop`, `main`, uma tag) permanece expressável, agora como exceção explícita em vez de default implícito.

Isto **altera a decisão registrada D11** de `relay-worktree.prd.md`, não apenas a estende. O PRD 1 precisa registrar a mudança em `docs/decisions.md` como divergência consciente, com o caso `spe-api` de §4 F7 como justificativa. A flag `--base <ref>` continua tendo precedência sobre tudo, inalterada.

**Confirmação (dinâmica, O7).** Um **preflight único no início do `/relay-execute`**, antes de entrar no loop autônomo. O comando resolve a base de todos os repos participantes e apresenta a tabela para uma confirmação só:

| Repo | Base declarada | Resolve para | Branch atual | SHA |
|---|---|---|---|---|
| spe-services | current | HEAD | develop | a1b2c3d |
| spe-api | origin/develop | origin/develop | (feat/portal-endpoint) | e4f5g6h |

Por que preflight e não confirmação por worktree: a fronteira de interatividade (`docs/context/architecture.md`, "Interactivity boundary") lista três extensões sancionadas, todas fora do loop autônomo. Confirmar N vezes dentro do loop seria a quarta extensão e a primeira a interromper o loop repetidamente. O preflight acontece **antes** do loop começar — no mesmo lugar onde a fronteira já admite interação — e resolve N repos numa interrupção. O loop autônomo permanece autônomo.

Nota de escopo: a confirmação é de base, não de topologia. Um repo cuja `Base` não resolve (`git rev-parse --verify` não-zero) HALTa no preflight com `FAILED_BASE_REF_MISSING` por repo, antes de qualquer worktree ser criada — nenhum trabalho parcial fica no disco.

---

## 6. Decisões do operador (2026-08-31)

| # | Decisão | Seção |
|---|---|---|
| O1 | Registro de topologia em `docs/context/architecture.md`, não coluna dedicada nem detecção automática | §5.2 |
| O2 | Um PR por repo, lanes daquele repo integradas antes; integração no `/relay-commit`, restrição 1 preservada | §5.8 |
| O3 | Multi-repo primeiro (PRD 1), paralelismo depois (PRD 2) | §8 |
| O4 | Plano de artefatos em `PRPs/` na raiz do workspace, com `git init` na raiz para versioná-lo | §5.1 |
| O5 | Coluna `Repo` na tabela de fases como ponteiro fase→repo | §5.3 |
| O6 | Gitlinks órfãos (`inplay`) geram HALT nomeado com instrução de conserto; não são suportados como topologia válida | §7 Q6 |
| O7 | Base da worktree declarada por repo (default `current`, invertendo D11) e confirmada num preflight único antes do loop autônomo | §5.9 |

Nota de correção: ao redigir a rodada anterior, O1 foi apresentado como se também resolvesse o ponteiro fase→repo. Não resolve — *onde vive o registro* e *como uma fase aponta para um repo* são ortogonais. O5 fecha a segunda metade.

---

## 7. Questões abertas — resolvidas

**Q1 — Resolução do Decision Gate em multi-repo.** *Resolvida por evidência:* lê os docs do `repo_root` da fase. §3.1 mostra que os seis repos editáveis do `super-ensino` têm `decisions.md`, `anti-patterns.md` e `architecture.md` completos, e a raiz **não tem** `docs/decisions.md`. Repo-local não é a opção preferida — é a única que existe. Sem merge com a raiz no PRD 1.

**Q2 — Onde vive `methodology.md`.** *Resolvida por evidência:* por repo, obrigatoriamente. §3.2 — jest, vitest e pytest coexistem, `tdd` difere, `figma_track` é verdadeiro em um só repo. P5 passa a rodar por fase (§5.5), não uma vez por sessão.

**Q3 — Onde vive `PRPs/`.** *Resolvida por O4:* `PRPs/` na raiz do workspace, que passa a ser um repo git. Alternativa rejeitada: deixar não-versionado (perde revisão, histórico, e torna o move para `completed/` invisível). Corrige F6 e dá lugar legítimo ao PRD de §3.4.

**Q4 — Como uma fase declara seu repo.** *Resolvida por O5:* coluna `Repo` no header exact-match, validada pelo `prd-reviewer` contra o registro de topologia. Custo aceito: migração mecânica do header em todos os PRDs existentes e no check P3.

**Q5 — F3 entra no PRD 1 ou 2.** *Resolvida:* PRD 1. O entregável do PRD 1 é "`/relay-execute` roda ponta a ponta em `super-ensino` e `inplay` com isolamento real"; sem base de diff por fase, o code-review da fase 2 em diante é ruído. É caminho crítico, não escopo adjacente. Bônus: corrige um bug que já existe hoje em modo serial.

**Q6 — Gitlinks órfãos do `inplay`.** *Resolvida por O6:* HALT nomeado. O relay detecta `160000` no índice sem `.gitmodules` e para com mensagem acionável, em vez de criar worktree com diretórios vazios (F2). O conserto do `inplay` é um ato humano único, fora do escopo do PRD.

**Q7 (F4) — `worktree-bootstrap` para `settings.json`.** *Resolvida:* PRD 1. Sem isso o `test-runner` aborta com `ABORT_INFRA/missing_settings_json` em toda worktree nova, o que impede validar o próprio entregável do PRD 1.

---

## 8. Recorte proposto dos dois PRDs

**PRD 1 — Topologia multi-repo.** Execução permanece **estritamente serial**; nenhuma mudança em Phase A.1.

1. Registro de topologia com `Role` semântico (§5.2), fechando F5.
2. Split `project_root` / `repo_root` (§5.1) e resolução de contexto por repo (§5.5).
3. Coluna `Repo` (§5.3) + item de rubrica no `prd-reviewer` + migração do header P3.
4. Worktree por repo (§5.4).
5. F1, F2 e F6 viram HALTs nomeados em vez de degradação silenciosa; O6 cobre o gitlink órfão.
6. F3 — base de diff por fase (`git write-tree` no limite de fase).
7. F4 — `worktree-bootstrap` entregue, copiando `.claude/settings.json`.
8. `/relay-commit`, `/relay-pr` e `/relay-approve` cientes de N repos (§5.8).
9. Modo workspace do `context-builder` (§2.4): inicializa a raiz — `git init`, `PRPs/`, `docs/context/architecture.md` com a seção de topologia derivada do `CLAUDE.md` existente.
10. F7 — coluna `Base` com default `current`, inversão registrada de D11 em `docs/decisions.md`, e o preflight único de confirmação de base (§5.9).

Entregável verificável: `/relay-execute` roda ponta a ponta em `super-ensino` e em `inplay` com isolamento real, e o PRD de §3.4 pode ser migrado de `.claude/PRPs/` para o lugar legítimo.

**PRD 2 — Fases em paralelo.** Modelo de lane (§5.6); semântica da coluna `Parallel`; dispatch por subagente (§5.7), precedido pelo experimento de profundidade de `Task`; integração de lanes no `/relay-commit` (§5.8); orçamentos e HALTs de concorrência; substituição do diagnóstico soft-fail de concorrência (D18) por semântica real.

---

## 9. Afirmações não verificadas

Não devem ser citadas como fato pelo PRD sem checagem própria:

- Profundidade máxima de aninhamento de `Task` no Claude Code (§5.7). Não testado. É o primeiro experimento do PRD 2.
- Comportamento exato de `git worktree add` na raiz do `inplay` com gitlinks órfãos. O modo `160000` sem `.gitmodules` foi confirmado no índice; a worktree resultante **não** foi criada para observação direta. O6 torna isto não-bloqueante.
- Se `git init` na raiz do `super-ensino` interage mal com os 8 repos filhos (esperado: filhos ignorados via `.gitignore`; não testado).
- Estado de inicialização de `inplay-front` além do `CLAUDE.md` (não inspecionado em profundidade).

Resolvidas desde a primeira redação: `inplay-back`/`inplay-front` são gitlinks órfãos, não submódulos funcionais (§4 F2); os repos do `super-ensino` **têm** `docs/context/` próprio (§3.1).
