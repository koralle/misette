# ADR 0001: Ultracite を品質ルールの正本にする

- 状態: 採用
- 日付: 2026-09-06

## 背景

このリポジトリは Oxlint と Oxfmt を個別に設定している。Lint、Format、Typecheck の実行経路も root scripts、GitHub Actions、Lefthook に分散しているため、経路ごとに検査内容がずれる余地がある。

Ultracite 7.10.8 は Oxlint と Oxfmt の共有 preset、React と TanStack Router の framework preset、型情報 lint、Editor と Agent の設定を提供する。

## 決定

Ultracite の Oxlint と Oxfmt preset を品質ルールの正本にする。Oxlint は core、React、TanStack の preset を root で継承し、Oxfmt は Ultracite の preset を継承する。ローカル設定には生成物の除外など、このリポジトリで必要な差分だけを残す。

root の `check` を非破壊の品質ゲートとし、Ultracite の型情報 lint、Format check、全 workspace の Typecheck を実行する。root の `fix` を自動修正の入口とする。

GitHub Actions、Lefthook、VS Code 系 Editor、OpenCode を含む Universal Agent rules を同じ操作境界へ接続する。既存コードは導入と同じ変更で新しいルールへ適合させる。

## 結果

品質ルールと実行入口が root に集約され、ローカルと CI の検査内容が一致する。型情報 lint と Typecheck は異なる責務を持つため、どちらも品質ゲートに含める。

Ultracite の preset 更新は既存コードへ新しい違反を導入する可能性がある。更新時には `pnpm check` を実行し、必要な移行を同じ依存関係更新に含める。
