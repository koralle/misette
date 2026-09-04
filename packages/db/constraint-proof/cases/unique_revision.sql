INSERT INTO recipe_revision (
  id,
  recipe_id,
  revision_no,
  title,
  created_by_user_id
)
VALUES ('unique-revision', 'recipe-1', 1, 'Duplicate revision', 'user-owner');
