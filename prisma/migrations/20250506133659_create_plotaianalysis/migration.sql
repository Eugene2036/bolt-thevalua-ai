-- CreateTable
CREATE TABLE `PlotAiAnalysis` (
    `id` VARCHAR(191) NOT NULL,
    `plotId` VARCHAR(191) NOT NULL,
    `query` VARCHAR(191) NOT NULL,
    `analysis` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlotAiAnalysis_plotId_idx`(`plotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ComparablePlotToPlotAiAnalysis` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_ComparablePlotToPlotAiAnalysis_AB_unique`(`A`, `B`),
    INDEX `_ComparablePlotToPlotAiAnalysis_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PlotAiAnalysis` ADD CONSTRAINT `PlotAiAnalysis_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ComparablePlotToPlotAiAnalysis` ADD CONSTRAINT `_ComparablePlotToPlotAiAnalysis_A_fkey` FOREIGN KEY (`A`) REFERENCES `ComparablePlot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ComparablePlotToPlotAiAnalysis` ADD CONSTRAINT `_ComparablePlotToPlotAiAnalysis_B_fkey` FOREIGN KEY (`B`) REFERENCES `PlotAiAnalysis`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
