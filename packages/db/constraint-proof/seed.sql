PRAGMA foreign_keys = ON;

INSERT INTO user (id, name, email)
VALUES
  ('user-owner', 'Owner', 'owner@example.com'),
  ('user-sharee', 'Sharee', 'sharee@example.com');

INSERT INTO ingredient (id, canonical_name, normalized_name)
VALUES ('ingredient-salt', 'Salt', 'salt');

INSERT INTO recipe (id, owner_user_id, visibility)
VALUES ('recipe-1', 'user-owner', 'private');

INSERT INTO recipe_share (recipe_id, user_id, permission)
VALUES ('recipe-1', 'user-sharee', 'viewer');

INSERT INTO recipe_source (id, recipe_id, source_type, source_name)
VALUES ('source-1', 'recipe-1', 'original', 'Family recipe');

INSERT INTO recipe_revision (id, recipe_id, revision_no, title, created_by_user_id)
VALUES ('revision-1', 'recipe-1', 1, 'Salted water', 'user-owner');

INSERT INTO recipe_ingredient (
  id,
  recipe_revision_id,
  ingredient_id,
  display_name,
  quantity_value,
  quantity_unit,
  sort_order
)
VALUES (
  'recipe-ingredient-1',
  'revision-1',
  'ingredient-salt',
  'Salt',
  1.5,
  'tsp',
  0
);

INSERT INTO recipe_step (id, recipe_revision_id, sort_order, body)
VALUES
  ('step-1', 'revision-1', 0, 'Bring water to a boil.'),
  ('step-2', 'revision-1', 1, 'Add salt.');

INSERT INTO cooking_attempt (
  id,
  recipe_revision_id,
  created_by_user_id,
  cooked_at,
  general_note
)
VALUES (
  'attempt-1',
  'revision-1',
  'user-owner',
  1700000000000,
  'Worked well.'
);

INSERT INTO cooking_attempt_step_note (
  cooking_attempt_id,
  recipe_step_id,
  recipe_revision_id,
  body
)
VALUES ('attempt-1', 'step-1', 'revision-1', 'Use a large pot.');

INSERT INTO cooking_knowledge (id, title, body, created_by_user_id)
VALUES ('knowledge-1', 'Boiling water', 'A rolling boil is best.', 'user-owner');

INSERT INTO recipe_knowledge (recipe_id, cooking_knowledge_id)
VALUES ('recipe-1', 'knowledge-1');

INSERT INTO step_knowledge (recipe_step_id, cooking_knowledge_id)
VALUES ('step-1', 'knowledge-1');
