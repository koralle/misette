CREATE TABLE `ingredient` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ingredient_normalized_name_unique` ON `ingredient` (`normalized_name`);--> statement-breakpoint
CREATE TABLE `recipe` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`visibility` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "recipe_visibility_check" CHECK("recipe"."visibility" in ('private', 'all_users'))
);
--> statement-breakpoint
CREATE INDEX `recipe_ownerUserId_idx` ON `recipe` (`owner_user_id`);--> statement-breakpoint
CREATE TABLE `recipe_ingredient` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_revision_id` text NOT NULL,
	`ingredient_id` text NOT NULL,
	`display_name` text NOT NULL,
	`quantity_value` real,
	`quantity_unit` text,
	`quantity_text` text,
	`note` text,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`recipe_revision_id`) REFERENCES `recipe_revision`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredient`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "recipe_ingredient_sortOrder_check" CHECK("recipe_ingredient"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_ingredient_recipeRevisionId_sortOrder_uidx` ON `recipe_ingredient` (`recipe_revision_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `recipe_ingredient_ingredientId_idx` ON `recipe_ingredient` (`ingredient_id`);--> statement-breakpoint
CREATE TABLE `recipe_revision` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`revision_no` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`servings_text` text,
	`cooking_time_minutes` integer,
	`change_note` text,
	`created_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipe`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "recipe_revision_revisionNo_check" CHECK("recipe_revision"."revision_no" >= 1),
	CONSTRAINT "recipe_revision_cookingTimeMinutes_check" CHECK("recipe_revision"."cooking_time_minutes" is null or "recipe_revision"."cooking_time_minutes" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_revision_recipeId_revisionNo_uidx` ON `recipe_revision` (`recipe_id`,`revision_no`);--> statement-breakpoint
CREATE INDEX `recipe_revision_createdByUserId_idx` ON `recipe_revision` (`created_by_user_id`);--> statement-breakpoint
CREATE TABLE `recipe_share` (
	`recipe_id` text NOT NULL,
	`user_id` text NOT NULL,
	`permission` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`recipe_id`, `user_id`),
	FOREIGN KEY (`recipe_id`) REFERENCES `recipe`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "recipe_share_permission_check" CHECK("recipe_share"."permission" in ('viewer', 'editor'))
);
--> statement-breakpoint
CREATE INDEX `recipe_share_userId_idx` ON `recipe_share` (`user_id`);--> statement-breakpoint
CREATE TABLE `recipe_source` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_name` text,
	`source_url` text,
	`imported_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipe`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "recipe_source_sourceType_check" CHECK("recipe_source"."source_type" in ('original', 'website', 'book', 'other'))
);
--> statement-breakpoint
CREATE INDEX `recipe_source_recipeId_idx` ON `recipe_source` (`recipe_id`);--> statement-breakpoint
CREATE TABLE `recipe_step` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_revision_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	`body` text NOT NULL,
	FOREIGN KEY (`recipe_revision_id`) REFERENCES `recipe_revision`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "recipe_step_sortOrder_check" CHECK("recipe_step"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_step_recipeRevisionId_sortOrder_uidx` ON `recipe_step` (`recipe_revision_id`,`sort_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_step_id_recipeRevisionId_uidx` ON `recipe_step` (`id`,`recipe_revision_id`);--> statement-breakpoint
CREATE TABLE `cooking_attempt` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_revision_id` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`cooked_at` integer NOT NULL,
	`general_note` text,
	`based_on_attempt_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`recipe_revision_id`) REFERENCES `recipe_revision`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`based_on_attempt_id`) REFERENCES `cooking_attempt`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "cooking_attempt_basedOnAttemptId_check" CHECK("cooking_attempt"."based_on_attempt_id" is null or "cooking_attempt"."based_on_attempt_id" != "cooking_attempt"."id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cooking_attempt_id_recipeRevisionId_uidx` ON `cooking_attempt` (`id`,`recipe_revision_id`);--> statement-breakpoint
CREATE INDEX `cooking_attempt_recipeRevisionId_idx` ON `cooking_attempt` (`recipe_revision_id`);--> statement-breakpoint
CREATE INDEX `cooking_attempt_createdByUserId_cookedAt_idx` ON `cooking_attempt` (`created_by_user_id`,"cooked_at" desc);--> statement-breakpoint
CREATE INDEX `cooking_attempt_basedOnAttemptId_idx` ON `cooking_attempt` (`based_on_attempt_id`);--> statement-breakpoint
CREATE TABLE `cooking_attempt_step_note` (
	`cooking_attempt_id` text NOT NULL,
	`recipe_step_id` text NOT NULL,
	`recipe_revision_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`cooking_attempt_id`, `recipe_step_id`),
	FOREIGN KEY (`cooking_attempt_id`,`recipe_revision_id`) REFERENCES `cooking_attempt`(`id`,`recipe_revision_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`recipe_step_id`,`recipe_revision_id`) REFERENCES `recipe_step`(`id`,`recipe_revision_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `cooking_attempt_step_note_recipeStepId_recipeRevisionId_idx` ON `cooking_attempt_step_note` (`recipe_step_id`,`recipe_revision_id`);--> statement-breakpoint
CREATE TABLE `cooking_knowledge` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `cooking_knowledge_createdByUserId_updatedAt_idx` ON `cooking_knowledge` (`created_by_user_id`,"updated_at" desc);--> statement-breakpoint
CREATE TABLE `recipe_knowledge` (
	`recipe_id` text NOT NULL,
	`cooking_knowledge_id` text NOT NULL,
	PRIMARY KEY(`recipe_id`, `cooking_knowledge_id`),
	FOREIGN KEY (`recipe_id`) REFERENCES `recipe`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`cooking_knowledge_id`) REFERENCES `cooking_knowledge`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `recipe_knowledge_cookingKnowledgeId_idx` ON `recipe_knowledge` (`cooking_knowledge_id`);--> statement-breakpoint
CREATE TABLE `step_knowledge` (
	`recipe_step_id` text NOT NULL,
	`cooking_knowledge_id` text NOT NULL,
	PRIMARY KEY(`recipe_step_id`, `cooking_knowledge_id`),
	FOREIGN KEY (`recipe_step_id`) REFERENCES `recipe_step`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`cooking_knowledge_id`) REFERENCES `cooking_knowledge`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `step_knowledge_cookingKnowledgeId_idx` ON `step_knowledge` (`cooking_knowledge_id`);