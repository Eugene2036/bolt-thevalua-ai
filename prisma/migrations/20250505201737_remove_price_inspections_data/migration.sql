/*
  Warnings:

  - You are about to drop the column `price` on the `InspectionsData` table. All the data in the column will be lost.
  - You are about to drop the column `transactionDate` on the `InspectionsData` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `InspectionsData` DROP COLUMN `price`,
    DROP COLUMN `transactionDate`;
