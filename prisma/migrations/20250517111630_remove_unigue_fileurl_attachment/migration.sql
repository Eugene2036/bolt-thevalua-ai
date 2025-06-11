-- DropIndex
DROP INDEX `Attachment_fileUrl_key` ON `Attachment`;

-- CreateTable
CREATE TABLE `PropertyOwnerAppeal` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `firstName` VARCHAR(255) NOT NULL DEFAULT '',
    `lastName` VARCHAR(255) NOT NULL DEFAULT '',
    `email` VARCHAR(255) NOT NULL DEFAULT '',
    `phone` VARCHAR(255) NOT NULL DEFAULT '',
    `message` TEXT NULL,
    `userId` VARCHAR(255) NULL DEFAULT '',
    `plotId` VARCHAR(255) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PropertyOwnerAppeal` ADD CONSTRAINT `PropertyOwnerAppeal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertyOwnerAppeal` ADD CONSTRAINT `PropertyOwnerAppeal_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
