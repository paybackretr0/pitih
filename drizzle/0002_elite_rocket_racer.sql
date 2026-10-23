CREATE TABLE `checkins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week_start` text NOT NULL,
	`expense` integer DEFAULT 0 NOT NULL,
	`income` integer DEFAULT 0 NOT NULL,
	`days_logged` integer DEFAULT 0 NOT NULL,
	`status` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkins_week_start_unique` ON `checkins` (`week_start`);