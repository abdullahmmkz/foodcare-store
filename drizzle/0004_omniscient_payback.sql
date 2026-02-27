CREATE TABLE `health_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`age` int,
	`weight` int,
	`height` int,
	`gender` enum('male','female'),
	`diseases` text,
	`goal` enum('weight_loss','blood_sugar','blood_pressure','cholesterol','general_health'),
	`activityLevel` enum('sedentary','light','moderate','active'),
	`allergies` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `health_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `health_profiles_userId_unique` UNIQUE(`userId`)
);
