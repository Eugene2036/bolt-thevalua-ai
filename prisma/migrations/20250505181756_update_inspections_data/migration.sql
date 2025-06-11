/*
  Warnings:

  - Added the required column `capitalValue` to the `InspectionsData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `improvementsValue` to the `InspectionsData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inspectionDate` to the `InspectionsData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `landValue` to the `InspectionsData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `perimeter` to the `InspectionsData` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `InspectionsData` ADD COLUMN `capitalValue` DECIMAL(19, 2) NOT NULL,
    ADD COLUMN `improvementsValue` DECIMAL(19, 2) NOT NULL,
    ADD COLUMN `inspectionDate` DATETIME(3) NOT NULL,
    ADD COLUMN `landValue` DECIMAL(19, 2) NOT NULL,
    ADD COLUMN `perimeter` DECIMAL(19, 2) NOT NULL;
