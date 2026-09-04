INSERT INTO recipe_revision (
  id,
  recipe_id,
  revision_no,
  title,
  created_by_user_id
)
VALUES (
  'composite-attempt-revision',
  'recipe-1',
  2,
  'Other revision',
  'user-owner'
);

INSERT INTO cooking_attempt_step_note (
  cooking_attempt_id,
  recipe_step_id,
  recipe_revision_id,
  body
)
VALUES (
  'attempt-1',
  'step-1',
  'composite-attempt-revision',
  'Wrong attempt revision.'
);
