-- AlterTable
ALTER TABLE `Notification` ADD COLUMN `delegated` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `ValuationsHistory` ADD COLUMN `reviewFinish` DATETIME(3) NULL,
    ADD COLUMN `reviewStartDate` DATETIME(3) NULL,
    ADD COLUMN `valuationFinishDate` DATETIME(3) NULL,
    ADD COLUMN `valuationStartDate` DATETIME(3) NULL;
