INSERT INTO recipe_revision (
  id,
  recipe_id,
  revision_no,
  title,
  created_by_user_id
)
VALUES (
  'composite-step-revision',
  'recipe-1',
  3,
  'Another revision',
  'user-owner'
);

INSERT INTO recipe_step (
  id,
  recipe_revision_id,
  sort_order,
  body
)
VALUES (
  'composite-step',
  'composite-step-revision',
  0,
  'Step from another revision.'
);

INSERT INTO cooking_attempt_step_note (
  cooking_attempt_id,
  recipe_step_id,
  recipe_revision_id,
  body
)
VALUES (
  'attempt-1',
  'composite-step',
  'revision-1',
  'Wrong step revision.'
);
