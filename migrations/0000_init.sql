CREATE TABLE `cart_items` (
	`user_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `product_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`telegram_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "cart_items_quantity_check" CHECK("cart_items"."quantity" BETWEEN 1 AND 99)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name_uz` text NOT NULL,
	`name_ru` text,
	`name_en` text,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `categories_sort_idx` ON `categories` (`sort_order`,`name_uz`);--> statement-breakpoint
CREATE TABLE `favorites` (
	`user_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `product_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`telegram_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `favorites_user_idx` ON `favorites` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `login_tokens` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`telegram_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `product_photos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`file_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_photos_product_idx` ON `product_photos` (`product_id`,`position`);--> statement-breakpoint
CREATE INDEX `product_photos_file_idx` ON `product_photos` (`file_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL,
	`name_uz` text NOT NULL,
	`name_ru` text,
	`name_en` text,
	`description_uz` text,
	`description_ru` text,
	`description_en` text,
	`price` integer NOT NULL,
	`old_price` integer,
	`discount_percent` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'in_stock' NOT NULL,
	`is_special` integer DEFAULT false NOT NULL,
	`is_visible` integer DEFAULT true NOT NULL,
	`photo_file_id` text,
	`search_text` text DEFAULT '' NOT NULL,
	`updated_by` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`telegram_id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "products_price_check" CHECK("products"."price" >= 0),
	CONSTRAINT "products_old_price_check" CHECK("products"."old_price" IS NULL OR "products"."old_price" >= 0),
	CONSTRAINT "products_discount_check" CHECK("products"."discount_percent" BETWEEN 0 AND 100),
	CONSTRAINT "products_status_check" CHECK("products"."status" IN ('in_stock', 'low_stock', 'out_of_stock'))
);
--> statement-breakpoint
CREATE INDEX `products_section_idx` ON `products` (`is_visible`,`is_special`,`category_id`);--> statement-breakpoint
CREATE INDEX `products_discount_idx` ON `products` (`is_visible`,`is_special`,`discount_percent`);--> statement-breakpoint
CREATE INDEX `products_created_idx` ON `products` (`is_visible`,`created_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`telegram_id` integer PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`username` text,
	`role` text DEFAULT 'customer' NOT NULL,
	`language` text DEFAULT 'uz' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "users_role_check" CHECK("users"."role" IN ('customer', 'admin')),
	CONSTRAINT "users_language_check" CHECK("users"."language" IN ('uz', 'ru', 'en'))
);
