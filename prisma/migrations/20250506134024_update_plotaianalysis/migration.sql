/*
  Warnings:

  - You are about to drop the `_ComparablePlotToPlotAiAnalysis` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_ComparablePlotToPlotAiAnalysis` DROP FOREIGN KEY `_ComparablePlotToPlotAiAnalysis_A_fkey`;

-- DropForeignKey
ALTER TABLE `_ComparablePlotToPlotAiAnalysis` DROP FOREIGN KEY `_ComparablePlotToPlotAiAnalysis_B_fkey`;

-- AlterTable
ALTER TABLE `ComparablePlot` ADD COLUMN `comparablePlotId` VARCHAR(191) NULL,
    ADD COLUMN `plotAiAnalysisId` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `_ComparablePlotToPlotAiAnalysis`;

-- AddForeignKey
ALTER TABLE `ComparablePlot` ADD CONSTRAINT `ComparablePlot_plotAiAnalysisId_fkey` FOREIGN KEY (`plotAiAnalysisId`) REFERENCES `PlotAiAnalysis`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
