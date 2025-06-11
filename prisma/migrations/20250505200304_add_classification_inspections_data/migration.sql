/*
  Warnings:

  - The primary key for the `InspectionsData` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `InspectionsData` table. All the data in the column will be lost.
  - Added the required column `classification` to the `InspectionsData` table without a default value. This is not possible if the table is not empty.
  - The required column `globalId` was added to the `InspectionsData` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE `InspectionsData` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `classification` VARCHAR(191) NOT NULL,
    ADD COLUMN `globalId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`globalId`);
