CREATE TABLE `goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`target_amount` integer NOT NULL,
	`saved_amount` integer DEFAULT 0 NOT NULL,
	`deadline` text,
	`color` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recurring_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`category_id` integer NOT NULL,
	`note` text,
	`need_want` text,
	`day_of_month` integer NOT NULL,
	`start_date` text NOT NULL,
	`last_run_date` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `transactions` ADD `receipt_uri` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `recurring_id` integer REFERENCES recurring_rules(id);--> statement-breakpoint
ALTER TABLE `transactions` ADD `recurring_date` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tx_recurring` ON `transactions` (`recurring_id`,`recurring_date`);