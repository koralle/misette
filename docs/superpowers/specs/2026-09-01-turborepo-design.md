# Turborepo 導入設計

- Date: 2026-09-01
- Status: Approved
- Approach: B - Full DX + 自前リモートキャッシュ対応

## 1. 目的と背景

- pnpm workspaces (`apps/*`, `packages/*`) で構成された misette モノレポに Turborepo を導入
- 主目的:
  - タスク統一・DX向上: `turbo run build/typecheck/dev` で一括実行
  - ビルド高速化: ローカルキャッシュ + 将来の自前リモートキャッシュ（Vercel以外）
- 対象タスク: build / typecheck / dev / lint(format:check) / cf-typegen / deploy / preview すべて

現状構成:

- `apps/web`: Vite + React + Cloudflare (`build: tsc -b && vite build`, `dev: vite`, `typecheck: tsc -b`)
- `apps/workers`: Hono + Wrangler (`dev: wrangler dev`, `typecheck: tsc`)
- `packages/workspace`: 共有 tsconfig
- root `package.json`: `format`, `format:check` のみ

## 2. 採用アプローチ

### 検討した選択肢

- **A: Minimal**: `build` のみ turbo化。変更最小だが lint/format/deploy が対象外、リモートキャッシュ拡張時に再設計必要
- **B: Full DX（採用）**: 全タスクを特性（cache / persistent / dependsOn）に応じて定義。自前RC対応をコメントで用意
- **C: Config共有型**: `packages/workspace` で turbo 設定を共有管理。Turborepoは root 固定のためメリット薄く複雑化

採用理由: ユーザー要望の全タスクカバー + 将来の自前RC（例: Cloudflare Workers+R2や自前サーバー）への移行を `turbo.json` 1行/環境変数で切り替え可能にするため。

## 3. アーキテクチャ

### 変更ファイル一覧

- `turbo.json` (新規): Turborepo 設定本体
- `package.json` (root): `turbo` を devDependencies 追加、scripts を `turbo run` に置換/追加
- `pnpm-workspace.yaml`: `catalogs.tooling.turbo` 追加（strict catalogMode のため）
- `.gitignore`: `.turbo/` 追加
- `lefthook.yaml`: 変更不要（現状 `oxfmt` 直接実行を維持、将来 `turbo run format:check` に移行可能なコメント追加は任意）

### 依存関係

- `turbo@2.10.12` (最新 stable, `pnpm info` で確認)
- `pnpm@11.25.0` + `node@24` 環境で動作確認

## 4. turbo.json タスク設計

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".wrangler/**", "node_modules/.tmp/**"],
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
      "persistent": true,
      "cache": false
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
      "cache": false,
      "persistent": false
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

補足:

- `build` の `outputs` は `apps/web: dist/**` と Cloudflare `.wrangler/**` を含む。`inputs` は明示してキャッシュ精度向上
- `dev` は `persistent:true, cache:false` で `turbo run dev --parallel` を想定
- `deploy`, `cf-typegen`, `preview` はキャッシュ不可
- 全タスク名は既存 `package.json` scripts と一致させ `turbo run` でそのまま実行可能に

### リモートキャッシュ対応（自前）

- 当面はローカルキャッシュのみ運用
- 将来の自前RC用に `turbo.json` にコメントで `remoteCache` プレースホルダを用意:
  ```json
  // "remoteCache": { "signature": true }
  ```
- 運用時は環境変数で切替:
  - `TURBO_TOKEN`, `TURBO_TEAM` (Turborepo 標準)
  - 自前サーバーなら `TURBO_API` / `TURBO_REMOTE_CACHE_URL` 的なカスタムURL（実装するサーバーに依存）
  - 例: `turbo run build --remote-only` で CI の検証も可能
- Vercel RC は使わない方針のため `vercel link` 不要

## 5. root package.json scripts 設計

変更前:

```json
"scripts": {
  "format": "oxfmt .",
  "format:check": "oxfmt . --check"
}
```

変更後（案）:

```json
"scripts": {
  "build": "turbo run build",
  "typecheck": "turbo run typecheck",
  "dev": "turbo run dev",
  "preview": "turbo run preview",
  "cf-typegen": "turbo run cf-typegen",
  "deploy": "turbo run deploy",
  "format": "oxfmt .",
  "format:check": "turbo run format:check --continue",
  "lint": "turbo run lint --continue",
  "check": "turbo run check --continue",
  "clean": "turbo run clean --continue || true"
}
```

- `format` は root 直接実行を維持（全ファイルを一括整形するため turbo 経由より直接が速い）。`format:check` は turbo 経由で各パッケージの check を並列化も可能だが、当面は root の `oxfmt . --check` をラップ
- 将来的に `oxlint` を workspace 全体で使う場合は `lint` タスクを追加

## 6. pnpm-workspace.yaml 変更

```yaml
catalogs:
  tooling:
    turbo: 2.10.12
```

または既存 `lint` カテゴリに同居も可だが、責務分離のため `tooling` を新設する案を推奨。`catalogMode: strict` のため root `devDependencies.turbo` は `catalog:tooling` で参照。

代替: catalog を使わず `devDependencies: { "turbo": "2.10.12" }` と直接記述しても動作するが、プロジェクトの catalog 統一方針に従い catalog 経由を推奨。

## 7. .gitignore 変更

追加:

```
.turbo/
```

## 8. 検証計画

- `pnpm install` 成功確認
- `pnpm turbo run build --dry-run` でタスクグラフ可視化
- `pnpm run build` / `pnpm run typecheck` が turbo 経由で成功
- 2回目実行で `cache hit` することをログで確認 (`FULL TURBO` 表示)
- `pnpm run dev` が `persistent` で並列起動することを確認（手動停止）
- `turbo run cf-typegen`, `format:check` の動作確認

## 9. 非対象・将来検討

- Remote Cache サーバーの実装自体は本設計の範囲外（別途仕様化）
- `turbo gen` / `turbo watch` 等の高度機能は導入しない
- GitHub Actions での `actions/cache` + `turbo` 連携は CI 導入時に追加検討

## 10. リスクと対策

- キャッシュの過剰ヒット: `inputs` を明示し `outputs` を限定することで誤キャッシュを防止
- `apps/web` の `tsc -b && vite build` が2段階: `build` タスク内で完結するため問題なし。将来 `vite build` のみキャッシュしたい場合はタスク分割を検討
- pnpm catalog への `turbo` 追加で `pnpm install` 失敗時: `catalogMode: strict` のためバージョン固定を厳守
