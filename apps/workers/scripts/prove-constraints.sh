#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WORKERS_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd -- "$WORKERS_DIR/../.." && pwd)"
PROOF_DIR="$REPO_ROOT/packages/db/constraint-proof"

cd "$WORKERS_DIR"

if ! command -v wrangler >/dev/null 2>&1; then
  printf 'wrangler is not available on PATH\n' >&2
  exit 1
fi

wrangler_json() {
  wrangler d1 execute misette \
    --local \
    --persist-to .wrangler/state \
    --json \
    "$@"
}

printf 'Seeding legal graph...\n'
wrangler_json --file "$PROOF_DIR/seed.sql" >/dev/null

printf 'Checking foreign key integrity...\n'
foreign_key_check="$(wrangler_json --command 'PRAGMA foreign_key_check;')"
if ! jq -e '.[0].results == []' >/dev/null <<<"$foreign_key_check"; then
  printf '%s\n' "$foreign_key_check" >&2
  printf 'foreign_key_check returned rows\n' >&2
  exit 1
fi

assert_foreign_keys() {
  local table="$1"
  local expected="$2"
  local result

  result="$(wrangler_json --command "PRAGMA foreign_key_list('$table');")"
  if ! jq -e \
    --argjson expected "$expected" \
    '
      ([.[0].results[]? | "\(.from)|\(.table)|\(.to)|\(.on_delete)"] | sort)
        == ($expected | sort)
    ' >/dev/null <<<"$result"; then
    printf 'foreign_key_list mismatch for %s:\n%s\n' "$table" "$result" >&2
    exit 1
  fi
}

printf 'Checking app foreign key mappings...\n'
assert_foreign_keys ingredient '[]'
assert_foreign_keys recipe '["owner_user_id|user|id|RESTRICT"]'
assert_foreign_keys recipe_share \
  '["recipe_id|recipe|id|RESTRICT","user_id|user|id|CASCADE"]'
assert_foreign_keys recipe_source '["recipe_id|recipe|id|RESTRICT"]'
assert_foreign_keys recipe_revision \
  '["recipe_id|recipe|id|RESTRICT","created_by_user_id|user|id|RESTRICT"]'
assert_foreign_keys recipe_ingredient \
  '["recipe_revision_id|recipe_revision|id|RESTRICT","ingredient_id|ingredient|id|RESTRICT"]'
assert_foreign_keys recipe_step \
  '["recipe_revision_id|recipe_revision|id|RESTRICT"]'
assert_foreign_keys cooking_attempt \
  '["recipe_revision_id|recipe_revision|id|RESTRICT","created_by_user_id|user|id|RESTRICT","based_on_attempt_id|cooking_attempt|id|RESTRICT"]'
assert_foreign_keys cooking_attempt_step_note \
  '["cooking_attempt_id|cooking_attempt|id|RESTRICT","recipe_revision_id|cooking_attempt|recipe_revision_id|RESTRICT","recipe_step_id|recipe_step|id|RESTRICT","recipe_revision_id|recipe_step|recipe_revision_id|RESTRICT"]'
assert_foreign_keys cooking_knowledge \
  '["created_by_user_id|user|id|RESTRICT"]'
assert_foreign_keys recipe_knowledge \
  '["recipe_id|recipe|id|RESTRICT","cooking_knowledge_id|cooking_knowledge|id|RESTRICT"]'
assert_foreign_keys step_knowledge \
  '["recipe_step_id|recipe_step|id|RESTRICT","cooking_knowledge_id|cooking_knowledge|id|RESTRICT"]'

nullable_fields="$(wrangler_json --command "
  SELECT
    (SELECT deleted_at IS NULL FROM recipe WHERE id = 'recipe-1') AS recipe_deleted_at_null,
    (SELECT deleted_at IS NULL FROM cooking_attempt WHERE id = 'attempt-1') AS attempt_deleted_at_null,
    (SELECT deleted_at IS NULL FROM cooking_knowledge WHERE id = 'knowledge-1') AS knowledge_deleted_at_null;
")"
if ! jq -e \
  '.[0].results[0] == {
    recipe_deleted_at_null: 1,
    attempt_deleted_at_null: 1,
    knowledge_deleted_at_null: 1
  }' >/dev/null <<<"$nullable_fields"; then
  printf '%s\n' "$nullable_fields" >&2
  printf 'nullable deleted_at assertion failed\n' >&2
  exit 1
fi

expect_failure() {
  local case_file="$1"
  local output

  if output="$(wrangler_json --file "$PROOF_DIR/cases/$case_file" 2>&1)"; then
    printf 'unexpected success: %s\n%s\n' "$case_file" "$output" >&2
    exit 1
  fi
  printf '  rejected: %s\n' "$case_file"
}

printf 'Checking rejected CHECK, UNIQUE, and composite-FK cases...\n'
for case_file in \
  check_visibility.sql \
  check_permission.sql \
  check_source_type.sql \
  check_revision_no.sql \
  check_cooking_time.sql \
  check_ingredient_sort_order.sql \
  check_step_sort_order.sql \
  check_based_on_self.sql \
  unique_revision.sql \
  unique_ingredient_line.sql \
  unique_ingredient_name.sql \
  unique_share.sql \
  composite_attempt_revision.sql \
  composite_step_revision.sql \
  required_cooked_at.sql \
  restrict_owner_user.sql \
  restrict_recipe.sql
do
  expect_failure "$case_file"
done

printf 'Checking sharee CASCADE...\n'
wrangler_json --file "$PROOF_DIR/cases/cascade_sharee.sql" >/dev/null
cascade_result="$(wrangler_json --command "
  SELECT
    (SELECT count(*) FROM recipe_share WHERE recipe_id = 'recipe-1' AND user_id = 'user-sharee') AS share_rows,
    (SELECT count(*) FROM recipe WHERE id = 'recipe-1') AS recipe_rows;
")"
if ! jq -e '.[0].results[0] == {share_rows: 0, recipe_rows: 1}' \
  >/dev/null <<<"$cascade_result"; then
  printf '%s\n' "$cascade_result" >&2
  printf 'sharee CASCADE assertion failed\n' >&2
  exit 1
fi

printf 'Constraint proof passed.\n'
