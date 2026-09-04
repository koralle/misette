INSERT INTO recipe_revision (
  id,
  recipe_id,
  revision_no,
  title,
  cooking_time_minutes,
  created_by_user_id
)
VALUES (
  'check-cooking-time',
  'recipe-1',
  2,
  'Invalid cooking time',
  -1,
  'user-owner'
);
