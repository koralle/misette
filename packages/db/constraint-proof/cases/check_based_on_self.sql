INSERT INTO cooking_attempt (
  id,
  recipe_revision_id,
  created_by_user_id,
  cooked_at,
  based_on_attempt_id
)
VALUES (
  'check-based-on-self',
  'revision-1',
  'user-owner',
  1700000000000,
  'check-based-on-self'
);
