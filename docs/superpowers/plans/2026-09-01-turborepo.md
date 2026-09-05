# Turborepo 導入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** pnpm workspaces モノレポに Turborepo 2.10.12 を導入し、`build/typecheck/dev/preview/cf-typegen/deploy/format:check` を `turbo run` で統一・キャッシュ化し、自前リモートキャッシュへ将来拡張可能な構成を作る

**Architecture:** root に `turbo.json` を新設し全タスクの `dependsOn/cache/persistent/outputs` を定義。root `package.json` scripts を `turbo run` に移行。`pnpm-workspace.yaml` の `catalogs.tooling.turbo` でバージョン固定。`.gitignore` に `.turbo/` 追加。ローカルキャッシュで検証、リモートは環境変数切替のみで対応可能にする

**Tech Stack:** Turborepo 2.10.12, pnpm 11.25.0, Vite 8.2.0, Wrangler 4.127.1, TypeScript 7.0.2

---

## File Structure

- `turbo.json` (新規): Turborepo タスク定義本体。`$schema`, `tasks.build/typecheck/dev/preview/cf-typegen/deploy/format:check` を持つ。remoteCache はコメントで将来用プレースホルダ
- `package.json` (修正): root。`devDependencies.turbo: catalog:tooling` 追加、`scripts` を turbo ラップに置換
- `pnpm-workspace.yaml` (修正): `catalogs.tooling.turbo: 2.10.12` 追加。`catalogMode: strict` のため必須
- `.gitignore` (修正): `.turbo/` 1行追加
- `docs/superpowers/specs/2026-09-01-turborepo-design.md` (既存): 設計書、参照のみ
- 検証対象（変更なしだが動作確認）: `apps/web/package.json`, `apps/workers/package.json`, `packages/workspace/package.json`

---

### Task 1: pnpm-workspace.yaml に turbo catalog を追加

**Files:**

- Modify: `pnpm-workspace.yaml:10-34`
- Test: `pnpm install` が成功すること

- [ ] **Step 1: 現状の pnpm-workspace.yaml を確認**

Read: `pnpm-workspace.yaml`

Expected: `catalogs` に `frontend`, `githooks`, `lint`, `typescript`, `vite`, `workers` が存在し、`catalogMode: strict` であることを確認

- [ ] **Step 2: catalogs.tooling を追加**

Edit `pnpm-workspace.yaml` :

```yaml
catalogs:
  frontend:
    "@types/react": 19.2.17
    "@types/react-dom": 19.2.3
    react: 19.2.8
    react-dom: 19.2.8
  githooks:
    lefthook: 2.1.12
  lint:
    oxfmt: 0.65.0
    oxlint: 1.75.0
  tooling:
    turbo: 2.10.12
  typescript:
    "@tsconfig/strictest": 2.0.8
    "@types/node": 24.13.3
    typescript: 7.0.2
  vite:
    "@cloudflare/vite-plugin": 1.54.2
    "@vitejs/plugin-react": 6.0.4
    vite: 8.2.0
  workers:
    hono: 4.13.5
    wrangler: 4.127.1
```

- 元の `lint` の次に `tooling` を挿入。順序はアルファベット順でなくてもよいが、lint の直後に置くと差分が最小
- バージョン `2.10.12` は `pnpm info turbo --json` で確認済みの最新 stable

- [ ] **Step 3: 構文確認（install はまだしない）**

Run: `pnpm --version && cat pnpm-workspace.yaml`

Expected: ファイルが YAML として壊れていないことを目視確認。`tooling.turbo` が表示される

- [ ] **Step 4: Commit**

```bash
git add pnpm-workspace.yaml
git commit -m "chore: add turbo to pnpm catalog"
```

---

### Task 2: root package.json に turbo 依存と scripts を追加

**Files:**

- Modify: `package.json:10-28`
- Test: `pnpm install` 後に `pnpm exec turbo --version` が成功

- [ ] **Step 1: 現状 package.json を確認**

Read: `package.json`

Expected: `scripts` は `format`, `format:check` のみ、`devDependencies` に turbo なし

- [ ] **Step 2: devDependencies に turbo を追加し scripts を turbo 化**

Edit `package.json` 全体:

```json
{
  "name": "@misette",
  "version": "0.1.0",
  "private": true,
  "description": "",
  "keywords": [],
  "license": "UNLICENSED",
  "author": "",
  "type": "module",
  "scripts": {
    "build": "turbo run build",
    "check": "turbo run check --continue",
    "cf-typegen": "turbo run cf-typegen",
    "deploy": "turbo run deploy",
    "dev": "turbo run dev",
    "format": "oxfmt .",
    "format:check": "oxfmt . --check",
    "lint": "turbo run lint --continue",
    "preview": "turbo run preview",
    "typecheck": "turbo run typecheck --continue"
  },
  "devDependencies": {
    "@tsconfig/strictest": "catalog:typescript",
    "lefthook": "catalog:githooks",
    "oxfmt": "catalog:lint",
    "turbo": "catalog:tooling",
    "typescript": "catalog:typescript"
  },
  "devEngines": {
    "packageManager": {
      "name": "pnpm",
      "version": "11.25.0",
      "onFail": "download"
    }
  },
  "packageManager": "pnpm@11.25.0"
}
```

設計補足:

- `format` は root で `oxfmt .` を直接実行（全ファイル一括のため turbo 経由より高速）。`format:check` も同様に直接実行を維持するが、将来 turbo 並列化したい場合は `turbo run format:check` に切替可能
- `typecheck`, `check`, `lint` は `--continue` で一部失敗しても他パッケージを継続
- `dev` は `turbo.json` で `persistent:true` のため `turbo run dev` で並列起動
- `deploy`/`preview`/`cf-typegen` は cache:false のため毎回実行されるが turbo 経由で依存順序が担保される

代替案として `format:check` を turbo 経由にする場合は `format:check: "turbo run format:check"` に変更するが、本計画では root 一括チェックを優先

- [ ] **Step 3: Commit（install は Task 3 でまとめて実行）**

```bash
git add package.json
git commit -m "chore: add turbo scripts to root package.json"
```

---

### Task 3: turbo.json を作成

**Files:**

- Create: `turbo.json`
- Test: `pnpm exec turbo run build --dry-run` でタスクグラフが表示される

- [ ] **Step 1: turbo.json を新規作成**

Write `turbo.json`:

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".wrangler/**"],
      "inputs": [
        "src/**",
        "public/**",
        "index.html",
        "vite.config.*",
        "tsconfig.*",
        "wrangler.*",
        "worker/**"
      ]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "tsconfig.*", "worker/**"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "preview": {
      "dependsOn": ["build"],
      "cache": false
    },
    "cf-typegen": {
      "cache": false,
      "inputs": ["wrangler.jsonc", "src/**", "worker/**"]
    },
    "deploy": {
      "dependsOn": ["build"],
      "cache": false
    },
    "format": {
      "cache": false
    },
    "format:check": {
      "cache": false
    },
    "lint": {
      "cache": false
    },
    "check": {
      "dependsOn": ["^check", "typecheck", "format:check"]
    }
  }
}
```

設計根拠:

- `build.outputs`: `apps/web/dist/**` と Wrangler の `.wrangler/**`。`apps/workers` は build 出力なしだが outputs が空でも問題なし。将来 workers に build が追加されても `dist/**` でカバー
- `build.inputs`: ソースと設定ファイルのみを入力に限定し、`node_modules` 変更ではキャッシュミスしないように
- `typecheck.dependsOn: ["^build"]`: workspace パッケージのビルド後に型チェック（現状 packages/workspace は build なしだが将来の拡張で安全）
- `dev.persistent: true, cache:false`: 常駐プロセスのためキャッシュ無効、--parallel 必須
- `deploy/preview`: 必ず最新 build に依存、cache:false
- `remoteCache` は当面コメントアウト。将来自前サーバーを用意したら以下を有効化:

  ```json
  // "remoteCache": { "signature": true }
  ```

  運用は env: `TURBO_TOKEN`, `TURBO_TEAM`, `TURBO_API` で切替

- [ ] **Step 2: JSON 構文検証**

Run: `pnpm exec --no -- turbo --version 2>&1 || cat turbo.json | python3 -m json.tool > /dev/null && echo "json ok"`

Expected: `json ok` または turbo バージョン表示（install 前は turbo 未導入のため json.tool での検証でOK）

- [ ] **Step 3: Commit**

```bash
git add turbo.json
git commit -m "feat: add turbo.json with tasks for build/typecheck/dev"
```

---

### Task 4: .gitignore に .turbo を追加

**Files:**

- Modify: `.gitignore:1-14`
- Test: `git check-ignore -v .turbo 2>&1` で無視されること

- [ ] **Step 1: .gitignore を確認**

Read: `.gitignore`

Expected: `node_modules`, `dist/`, `.wrangler/` などが記載、`.turbo` はまだない

- [ ] **Step 2: .turbo を追記**

Edit `.gitignore` 最終行に追加:

```
.turbo/
```

Full file after edit:

```
node_modules
dist/
.wrangler/
.turbo/
.env
.env.*
!.env.example
.dev.vars
logs/
*.log
.DS_Store
.idea/
.vscode/*
!.vscode/launch.json
!.vscode/*.code-snippets
```

- [ ] **Step 3: 無視確認**

Run: `git check-ignore -v .turbo 2>&1; echo "exit:$?"`

Expected: `.gitignore:4:.turbo/` のように表示され exit 0

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore .turbo cache directory"
```

---

### Task 5: pnpm install と動作検証

**Files:**

- Modify: `pnpm-lock.yaml` (auto-generated)
- Test: 各種 turbo コマンドが成功しキャッシュヒットすることを確認

- [ ] **Step 1: pnpm install 実行**

Run: `pnpm install`

Expected: `Lockfile is up to date` ではなく `turbo@2.10.12` が追加され、`node_modules/.bin/turbo` が作成される。エラーなし

- [ ] **Step 2: turbo バージョン確認**

Run: `pnpm exec turbo --version`

Expected: `2.10.12`

- [ ] **Step 3: dry-run でタスクグラフ確認**

Run: `pnpm exec turbo run build --dry-run 2>&1 | head -100`

Expected:

```
• Packages in scope: @misette/web, @misette/workers, @misette/workspace
• Running build in 2 packages
• @misette/web:build dependsOn ^build
```

のように依存グラフが表示、エラーなし

- [ ] **Step 4: build 実行（1回目: cache miss）**

Run: `pnpm run build 2>&1`

Expected: `turbo run build` が呼ばれ、`@misette/web:build: tsc -b && vite build` が実行され dist が生成。`Tasks: 1 successful, 1 total` など

- [ ] **Step 5: build 再実行（2回目: cache hit）**

Run: `pnpm run build 2>&1`

Expected: `FULL TURBO` または `cache hit` / `Cached: 1 cached` の表示。2回目は `tsc`/`vite` が再実行されずキャッシュから復元される

- [ ] **Step 6: typecheck 実行**

Run: `pnpm run typecheck 2>&1`

Expected: `turbo run typecheck` で `@misette/web:typecheck` と `@misette/workers:typecheck` が実行、エラーなし（`FULL TURBO` でキャッシュヒットも確認）

- [ ] **Step 7: format:check と lint 確認**

Run: `pnpm run format:check 2>&1 | head -50`

Expected: `oxfmt . --check` が実行され、フォーマット差分がなければ exit 0

- [ ] **Step 8: lockfile をコミット**

```bash
git add pnpm-lock.yaml
git commit -m "chore: update pnpm-lock for turbo"
```

---

### Task 6: ドキュメントと最終確認

**Files:**

- Modify: `README.md` (存在すれば) または `docs/superpowers/specs/2026-09-01-turborepo-design.md` に補足なし
- Test: `pnpm run dev --dry-run` 的な手動確認

- [ ] **Step 1: 全体の git status 確認**

Run: `git status --short && git log --oneline -6`

Expected: 変更はコミット済み、working tree clean。log に Task 1-5 のコミットが並ぶ

- [ ] **Step 2: dev タスクの dry-run（persistent のため実際には起動しない）**

Run: `pnpm exec turbo run dev --dry-run 2>&1 | head -50`

Expected: `dev` が `persistent: true, cache: false` として表示

- [ ] **Step 3: 自前リモートキャッシュへの切替手順を設計書と整合確認**

Read: `turbo.json` と `docs/superpowers/specs/2026-09-01-turborepo-design.md:8`

Expected: remoteCache コメントと env 変数 (`TURBO_TOKEN`, `TURBO_API`) の説明が一致

- [ ] **Step 4: 最終コミット（必要なら）**

```bash
git status --short
# 変更がなければコミット不要
```

---

## Self-Review Checklist

- [ ] Spec coverage: 設計書の全タスク（build/typecheck/dev/preview/cf-typegen/deploy/format:check）に対応する Task 3 の turbo.json 定義あり。catalog 追加は Task 1、scripts は Task 2、.gitignore は Task 4、検証は Task 5、リモートキャッシュ将来対応は Task 3 コメントでカバー
- [ ] Placeholder scan: 計画内に TBD/TODO/未定義関数なし。全ファイルパスは `pnpm-workspace.yaml:10-34` のように明記。全コマンドは `pnpm exec turbo --version` のように具体的に記述
- [ ] Type consistency: `turbo: catalog:tooling` と `catalogs.tooling.turbo: 2.10.12` で参照が一致。scripts の `turbo run build` と turbo.json の `tasks.build` で名前一致
