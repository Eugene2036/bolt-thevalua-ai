-- CreateTable
CREATE TABLE `Tenant` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `plotId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `termOfLease` VARCHAR(191) NOT NULL,
    `leaseLife` DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    `startDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `grossMonthlyRental` DECIMAL(19, 2) NOT NULL,
    `escalation` DECIMAL(19, 2) NOT NULL,
    `propertyTypeId` VARCHAR(191) NOT NULL,
    `areaPerClient` DECIMAL(19, 2) NOT NULL,
    `areaPerMarket` DECIMAL(19, 2) NOT NULL,
    `grossRatePerValuer` INTEGER NOT NULL,
    `ratePerMarket` DECIMAL(19, 2) NOT NULL DEFAULT 0.00,

    INDEX `Tenant_plotId_fkey`(`plotId`),
    INDEX `Tenant_propertyTypeId_fkey`(`propertyTypeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PropertyType` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Insurance` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `plotId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `roofTypeId` VARCHAR(191) NULL,
    `constructionPropId` VARCHAR(191) NULL,
    `rate` DECIMAL(19, 2) NOT NULL,
    `area` DECIMAL(19, 2) NULL,

    INDEX `Insurance_constructionPropId_fkey`(`constructionPropId`),
    INDEX `Insurance_itemId_fkey`(`itemId`),
    INDEX `Insurance_plotId_fkey`(`plotId`),
    INDEX `Insurance_roofTypeId_fkey`(`roofTypeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoofType` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InsuranceItem` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Outgoing` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `plotId` VARCHAR(191) NOT NULL,
    `itemType` VARCHAR(191) NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `unitPerClient` DECIMAL(19, 4) NOT NULL,
    `ratePerClient` DECIMAL(19, 4) NOT NULL,
    `unitPerMarket` INTEGER NOT NULL,
    `ratePerMarket` DECIMAL(19, 2) NOT NULL,

    INDEX `Outgoing_plotId_fkey`(`plotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Parking` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `plotId` VARCHAR(191) NOT NULL,
    `parkingTypeId` VARCHAR(191) NOT NULL,
    `unitPerClient` DECIMAL(19, 2) NOT NULL,
    `ratePerClient` DECIMAL(19, 2) NOT NULL,
    `unitPerMarket` INTEGER NOT NULL,
    `ratePerMarket` DECIMAL(19, 2) NOT NULL,

    INDEX `Parking_parkingTypeId_fkey`(`parkingTypeId`),
    INDEX `Parking_plotId_fkey`(`plotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ParkingType` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Plot` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `globalId` VARCHAR(191) NOT NULL,
    `propertyId` INTEGER NOT NULL,
    `plotNumber` VARCHAR(191) NOT NULL,
    `council` BOOLEAN NOT NULL DEFAULT false,
    `hasBeenZeroReviewed` BOOLEAN NOT NULL DEFAULT false,
    `ZoneValue` VARCHAR(191) NOT NULL DEFAULT '',
    `valuedById` VARCHAR(191) NULL,
    `reviewedById` VARCHAR(191) NULL,
    `valuer` VARCHAR(191) NOT NULL,
    `inspectionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `analysisDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `plotDesc` VARCHAR(191) NULL,
    `accommodation` VARCHAR(191) NULL,
    `construction` VARCHAR(191) NULL,
    `constructionDesc` VARCHAR(191) NULL,
    `propertyLocation` VARCHAR(191) NULL,
    `plotExtent` DECIMAL(19, 2) NOT NULL,
    `address` MEDIUMTEXT NOT NULL,
    `zoning` VARCHAR(191) NOT NULL,
    `classification` VARCHAR(191) NOT NULL,
    `usage` VARCHAR(191) NOT NULL,
    `undevelopedPortion` DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    `rateForUndevelopedPortion` DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    `services` LONGTEXT NULL,
    `summaryOfValuation` LONGTEXT NULL,
    `opinionOfValue` LONGTEXT NULL,
    `scopeOfWork` LONGTEXT NULL,
    `basesOfValue` LONGTEXT NULL,
    `propertyDetails` LONGTEXT NULL,
    `scopeOfEquity` LONGTEXT NULL,
    `tableOfContents` LONGTEXT NULL,
    `reportTemplateId` VARCHAR(191) NULL,
    `rptTemplateId` VARCHAR(191) NULL,
    `capRate` DECIMAL(19, 2) NULL,
    `marketValue` DECIMAL(19, 2) NULL,
    `highest` LONGTEXT NULL,
    `commentOnLeases` LONGTEXT NULL,
    `marketCondition` LONGTEXT NULL,
    `numAirCon` INTEGER NULL DEFAULT 0,
    `numParkingBays` INTEGER NULL DEFAULT 0,
    `numOfStructures` INTEGER NULL DEFAULT 0,
    `SwimmingPool` VARCHAR(191) NULL,
    `Paving` VARCHAR(191) NULL,
    `Boundary` VARCHAR(191) NULL,
    `Perimeter` DECIMAL(19, 2) NULL,
    `titleDeedNum` VARCHAR(191) NULL,
    `titleDeedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `valuationType` VARCHAR(191) NOT NULL,
    `valuationDone` BOOLEAN NOT NULL DEFAULT false,
    `valuerComments` LONGTEXT NULL,
    `longitude` DECIMAL(19, 15) NULL,
    `latitude` DECIMAL(19, 15) NULL,
    `mapLabel` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `coverImageId` VARCHAR(191) NOT NULL DEFAULT '',
    `mapImageId` VARCHAR(191) NOT NULL DEFAULT '',
    `companyId` VARCHAR(191) NOT NULL,
    `valuationsHistoryId` VARCHAR(191) NULL,
    `constructionItems` LONGTEXT NULL,
    `footerNote` VARCHAR(191) NULL,
    `headerTitle` VARCHAR(191) NULL,
    `reportComments` TEXT NOT NULL DEFAULT '',
    `reportReviewedById` VARCHAR(191) NULL,
    `reportValuedById` VARCHAR(191) NULL,

    UNIQUE INDEX `Plot_plotNumber_key`(`plotNumber`),
    INDEX `Plot_companyId_fkey`(`companyId`),
    INDEX `Plot_reportReviewedById_fkey`(`reportReviewedById`),
    INDEX `Plot_reportValuedById_fkey`(`reportValuedById`),
    INDEX `Plot_reviewedById_fkey`(`reviewedById`),
    INDEX `Plot_rptTemplateId_fkey`(`rptTemplateId`),
    INDEX `Plot_userId_fkey`(`userId`),
    INDEX `Plot_valuationsHistoryId_fkey`(`valuationsHistoryId`),
    INDEX `Plot_valuedById_fkey`(`valuedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ComparablePlot` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `plotNumber` VARCHAR(191) NOT NULL,
    `plotExtent` DECIMAL(19, 2) NOT NULL,
    `propertyType` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `suburb` VARCHAR(191) NOT NULL,
    `price` DECIMAL(19, 2) NOT NULL,
    `transactionDate` DATETIME(3) NOT NULL,
    `titleDeed` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT '',
    `plotDesc` VARCHAR(191) NOT NULL DEFAULT '',
    `numAirCons` INTEGER NOT NULL DEFAULT 0,
    `numParkingBays` INTEGER NOT NULL DEFAULT 0,
    `numOfStructures` INTEGER NOT NULL DEFAULT 0,
    `numToilets` INTEGER NOT NULL DEFAULT 0,
    `numStorerooms` INTEGER NOT NULL DEFAULT 0,
    `numBathrooms` INTEGER NOT NULL DEFAULT 0,
    `swimmingPool` VARCHAR(191) NOT NULL DEFAULT 'No',
    `paving` VARCHAR(191) NOT NULL DEFAULT 'None',
    `boundary` VARCHAR(191) NOT NULL DEFAULT 'None',
    `garageType` VARCHAR(191) NOT NULL DEFAULT 'None',
    `kitchen` VARCHAR(191) NOT NULL DEFAULT 'No',
    `wardrobe` VARCHAR(191) NOT NULL DEFAULT 'No',
    `roofModel` VARCHAR(191) NOT NULL DEFAULT 'None',
    `ceiling` VARCHAR(191) NOT NULL DEFAULT 'None',
    `interiorWallFinish` VARCHAR(191) NOT NULL DEFAULT 'Unknown',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ComparableImage` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `imageId` VARCHAR(191) NOT NULL,
    `comparablePlotId` VARCHAR(191) NOT NULL,

    INDEX `ComparableImage_comparablePlotId_fkey`(`comparablePlotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlotAndComparable` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `plotId` VARCHAR(191) NOT NULL,
    `comparablePlotId` VARCHAR(191) NOT NULL,

    INDEX `PlotAndComparable_comparablePlotId_fkey`(`comparablePlotId`),
    INDEX `PlotAndComparable_plotId_fkey`(`plotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Image` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `imageId` VARCHAR(191) NOT NULL,
    `plotId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,

    INDEX `Image_companyId_fkey`(`companyId`),
    INDEX `Image_plotId_fkey`(`plotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyImage` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `imageId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,

    INDEX `CompanyImage_companyId_fkey`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Client` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `postalAddress` VARCHAR(191) NOT NULL,
    `postalCode` VARCHAR(191) NULL,
    `phyAddress` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `telephone` VARCHAR(191) NOT NULL,
    `clientType` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NULL,
    `position` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL DEFAULT '',
    `repEmail` VARCHAR(191) NOT NULL DEFAULT '',
    `repPhone` VARCHAR(191) NOT NULL DEFAULT '',
    `plotId` VARCHAR(191) NOT NULL,

    INDEX `Client_plotId_fkey`(`plotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Valuer` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `practicingCertificate` VARCHAR(191) NOT NULL,
    `practicingCertificateNum` VARCHAR(191) NULL,
    `postalAddress` VARCHAR(191) NULL,
    `physicalAddress` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `telephone` VARCHAR(191) NOT NULL,
    `firm` VARCHAR(191) NOT NULL,
    `declaration` BOOLEAN NOT NULL,
    `reportTemplateId` VARCHAR(191) NULL,
    `plotId` VARCHAR(191) NOT NULL,

    INDEX `Valuer_plotId_fkey`(`plotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Grc` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `plotId` VARCHAR(191) NOT NULL,
    `constructionPropId` VARCHAR(191) NULL,
    `bull` BOOLEAN NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `size` DECIMAL(19, 4) NOT NULL,
    `rate` DECIMAL(19, 4) NOT NULL DEFAULT 0.0000,

    INDEX `Grc_constructionPropId_fkey`(`constructionPropId`),
    INDEX `Grc_plotId_fkey`(`plotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GrcFee` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `plotId` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `perc` DECIMAL(19, 4) NOT NULL,

    INDEX `GrcFee_plotId_fkey`(`plotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GrcDepr` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `plotId` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `perc` DECIMAL(19, 4) NOT NULL,

    INDEX `GrcDepr_plotId_fkey`(`plotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Mv` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `plotId` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `size` DECIMAL(19, 4) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `price` DECIMAL(19, 4) NOT NULL,

    INDEX `Mv_plotId_fkey`(`plotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Password` (
    `hash` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Password_userId_key`(`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL DEFAULT '',
    `lastName` VARCHAR(191) NOT NULL DEFAULT '',
    `practicingCertificate` VARCHAR(191) NOT NULL DEFAULT '',
    `practicingCertificateNum` VARCHAR(191) NULL DEFAULT '',
    `physicalAddress` MEDIUMTEXT NOT NULL DEFAULT '',
    `postalAddress` MEDIUMTEXT NULL DEFAULT '',
    `phone` VARCHAR(191) NOT NULL DEFAULT '',
    `email` VARCHAR(50) NOT NULL,
    `firm` VARCHAR(191) NOT NULL DEFAULT '',
    `declaration` BOOLEAN NOT NULL DEFAULT false,
    `reportTemplateId` VARCHAR(191) NULL,
    `isSuper` BOOLEAN NOT NULL DEFAULT false,
    `isSuspended` BOOLEAN NOT NULL DEFAULT false,
    `isBanker` BOOLEAN NOT NULL DEFAULT false,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `verToken` VARCHAR(191) NOT NULL DEFAULT '',
    `profilePic` VARCHAR(191) NULL DEFAULT 'wi6eipxtrg9kj77exi87',
    `target` INTEGER NOT NULL DEFAULT 0,
    `userGroupId` VARCHAR(191) NULL,
    `profileSignature` VARCHAR(191) NULL DEFAULT 'signature_placeholder',
    `isSignatory` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_userGroupId_fkey`(`userGroupId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `noteId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdById` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `plotNum` VARCHAR(191) NOT NULL DEFAULT '',
    `message` VARCHAR(191) NOT NULL DEFAULT '',
    `messageBody` VARCHAR(191) NULL,
    `approved` BOOLEAN NOT NULL DEFAULT true,
    `approvedById` VARCHAR(191) NULL,
    `approvedDate` DATETIME(3) NULL,
    `accepted` VARCHAR(191) NOT NULL DEFAULT 'Unread',
    `userId` VARCHAR(191) NOT NULL,
    `acceptedDate` DATETIME(3) NULL,
    `plotId` VARCHAR(191) NOT NULL DEFAULT '',
    `clientType` VARCHAR(191) NOT NULL DEFAULT 'Individual',
    `companyName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL DEFAULT '',
    `firstName` VARCHAR(191) NOT NULL DEFAULT '',
    `lastName` VARCHAR(191) NOT NULL DEFAULT '',
    `phyAddress` VARCHAR(191) NOT NULL DEFAULT '',
    `position` VARCHAR(191) NULL,
    `postalAddress` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `repEmail` VARCHAR(191) NOT NULL DEFAULT '',
    `repPhone` VARCHAR(191) NOT NULL DEFAULT '',
    `telephone` VARCHAR(191) NOT NULL DEFAULT '',
    `title` VARCHAR(191) NOT NULL DEFAULT '',
    `declineReason` VARCHAR(191) NULL,
    `location` VARCHAR(191) NOT NULL DEFAULT '',
    `neighbourhood` VARCHAR(191) NOT NULL DEFAULT '',
    `declaration` BOOLEAN NOT NULL DEFAULT false,
    `valuerAttachments` VARCHAR(191) NULL DEFAULT '',
    `valuationKind` VARCHAR(191) NOT NULL,

    INDEX `Notification_createdById_fkey`(`createdById`),
    INDEX `Notification_plotId_fkey`(`plotId`),
    INDEX `Notification_userId_fkey`(`userId`),
    PRIMARY KEY (`noteId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Message` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `notificationId` VARCHAR(191) NOT NULL,

    INDEX `Message_notificationId_fkey`(`notificationId`),
    INDEX `Message_userId_fkey`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attachment` (
    `id` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `notificationId` VARCHAR(191) NOT NULL,
    `fileType` VARCHAR(191) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL DEFAULT 'Instructor',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Attachment_fileUrl_key`(`fileUrl`),
    INDEX `Attachment_notificationId_fkey`(`notificationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserGroup` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `name` VARCHAR(191) NOT NULL DEFAULT '',
    `allowCompanySettings` BOOLEAN NOT NULL DEFAULT false,
    `allowCreateNewCompany` BOOLEAN NOT NULL DEFAULT false,
    `allowDeleteCompany` BOOLEAN NOT NULL DEFAULT false,
    `allowUserManagement` BOOLEAN NOT NULL DEFAULT false,
    `allowUserActivity` BOOLEAN NOT NULL DEFAULT false,
    `allowSetValuerTargets` BOOLEAN NOT NULL DEFAULT false,
    `allowCreateNewUser` BOOLEAN NOT NULL DEFAULT false,
    `allowValuationsDownload` BOOLEAN NOT NULL DEFAULT false,
    `allowUnvaluedProperties` BOOLEAN NOT NULL DEFAULT false,
    `allowMarkAsReviewed` BOOLEAN NOT NULL DEFAULT false,
    `isSuper` BOOLEAN NOT NULL DEFAULT false,
    `isInstructor` BOOLEAN NOT NULL DEFAULT false,
    `companyId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `UserGroup_name_key`(`name`),
    INDEX `UserGroup_companyId_fkey`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Company` (
    `id` VARCHAR(191) NOT NULL,
    `FullName` VARCHAR(191) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `CompanyName` VARCHAR(191) NOT NULL DEFAULT '',
    `LocationAddress` VARCHAR(191) NOT NULL DEFAULT '',
    `PostalAddress` VARCHAR(191) NOT NULL DEFAULT '',
    `Phone` VARCHAR(191) NOT NULL DEFAULT '',
    `Mobile` VARCHAR(191) NOT NULL DEFAULT '',
    `Fax` VARCHAR(191) NULL DEFAULT '',
    `Email` VARCHAR(191) NOT NULL DEFAULT '',
    `Website` VARCHAR(191) NULL DEFAULT '',
    `LogoLink` LONGTEXT NULL DEFAULT '',
    `footerNote` VARCHAR(191) NULL,
    `headerTitle` VARCHAR(191) NULL,
    `isSuspended` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Company_Email_key`(`Email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RptTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `RptTemplate_name_key`(`name`),
    INDEX `RptTemplate_companyId_fkey`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReportTemplateSection` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `refNumber` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,

    INDEX `ReportTemplateSection_templateId_fkey`(`templateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TemplateSubSection` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `sectionId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `content` LONGTEXT NOT NULL DEFAULT '',

    INDEX `TemplateSubSection_sectionId_fkey`(`sectionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReportSection` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `templateSectionId` VARCHAR(191) NULL,
    `refNumber` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `plotId` VARCHAR(191) NOT NULL,

    INDEX `ReportSection_plotId_fkey`(`plotId`),
    INDEX `ReportSection_templateSectionId_fkey`(`templateSectionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReportSubSection` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `templateSubSectionId` VARCHAR(191) NULL,
    `sectionId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `content` LONGTEXT NOT NULL DEFAULT '',

    INDEX `ReportSubSection_sectionId_fkey`(`sectionId`),
    INDEX `ReportSubSection_templateSubSectionId_fkey`(`templateSubSectionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReportTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `scopeOfWork` LONGTEXT NULL,
    `purposeOfValuation` LONGTEXT NULL,
    `propertyDescription` LONGTEXT NULL,
    `relevance` LONGTEXT NULL,
    `instruction` LONGTEXT NULL,
    `intent` LONGTEXT NULL,
    `interestBeingValued` LONGTEXT NULL,
    `purpose` LONGTEXT NULL,
    `basisOfValue` LONGTEXT NULL,
    `valuationStandard` LONGTEXT NULL,
    `landUse` LONGTEXT NULL,
    `limitationLiability` LONGTEXT NULL,
    `pecularityInterest` LONGTEXT NULL,
    `condition` LONGTEXT NULL,
    `environment` LONGTEXT NULL,
    `disclaimer` LONGTEXT NULL,
    `marketValue` LONGTEXT NULL,
    `forcedSaleValue` LONGTEXT NULL,
    `insuranceReplacementCost` LONGTEXT NULL,
    `plotDesc` LONGTEXT NULL,
    `location` LONGTEXT NULL,
    `construction` LONGTEXT NULL,
    `accommodation` LONGTEXT NULL,
    `conditionAndRepair` LONGTEXT NULL,
    `services` LONGTEXT NULL,
    `tenure` LONGTEXT NULL,
    `highestBestUse` LONGTEXT NULL,
    `inspectionAndValuation` LONGTEXT NULL,
    `extentOfInvestigations` LONGTEXT NULL,
    `natureSourceOfInfo` LONGTEXT NULL,
    `assumptions` LONGTEXT NULL,
    `specialAssumptions` LONGTEXT NULL,
    `enableCapRate` BOOLEAN NULL DEFAULT false,
    `commentsOnCapRates` LONGTEXT NULL,
    `valuationMethodology` LONGTEXT NULL,
    `market` LONGTEXT NULL,
    `planning` LONGTEXT NULL,
    `companyId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `ReportTemplate_name_key`(`name`),
    INDEX `ReportTemplate_companyId_fkey`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReportHeader` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `headerTitle` VARCHAR(191) NOT NULL,
    `reportTemplateId` VARCHAR(191) NOT NULL,

    INDEX `ReportHeader_reportTemplateId_fkey`(`reportTemplateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReportSubHeader` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `subHeaderTitle` VARCHAR(191) NOT NULL,
    `reportHeaderId` VARCHAR(191) NULL,

    INDEX `ReportSubHeader_reportHeaderId_fkey`(`reportHeaderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReportBodyContent` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `bodyContentInfo` LONGTEXT NOT NULL,
    `subHeaderId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `ReportBodyContent_subHeaderId_key`(`subHeaderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ValuationsHistory` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `plotNumber` VARCHAR(191) NOT NULL,
    `council` BOOLEAN NOT NULL DEFAULT false,
    `hasBeenZeroReviewed` BOOLEAN NOT NULL DEFAULT false,
    `ZoneValue` VARCHAR(191) NOT NULL DEFAULT '',
    `valuer` VARCHAR(191) NOT NULL,
    `inspectionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `analysisDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `plotDesc` VARCHAR(191) NULL,
    `accommodation` VARCHAR(191) NULL,
    `construction` VARCHAR(191) NULL,
    `constructionDesc` VARCHAR(191) NULL,
    `propertyLocation` VARCHAR(191) NULL,
    `plotExtent` DECIMAL(19, 2) NOT NULL,
    `address` MEDIUMTEXT NOT NULL,
    `zoning` VARCHAR(191) NOT NULL,
    `classification` VARCHAR(191) NOT NULL,
    `usage` VARCHAR(191) NOT NULL,
    `undevelopedPortion` DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    `rateForUndevelopedPortion` DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    `services` LONGTEXT NULL,
    `summaryOfValuation` LONGTEXT NULL,
    `opinionOfValue` LONGTEXT NULL,
    `scopeOfWork` LONGTEXT NULL,
    `basesOfValue` LONGTEXT NULL,
    `propertyDetails` LONGTEXT NULL,
    `scopeOfEquity` LONGTEXT NULL,
    `reportTemplateId` VARCHAR(191) NULL,
    `tableOfContents` LONGTEXT NULL,
    `highest` LONGTEXT NULL,
    `commentOnLeases` LONGTEXT NULL,
    `marketCondition` LONGTEXT NULL,
    `numAirCon` INTEGER NULL DEFAULT 0,
    `numParkingBays` INTEGER NULL DEFAULT 0,
    `numOfStructures` INTEGER NULL DEFAULT 0,
    `SwimmingPool` VARCHAR(191) NULL,
    `Paving` VARCHAR(191) NULL,
    `Boundary` VARCHAR(191) NULL,
    `Perimeter` DECIMAL(19, 2) NULL,
    `titleDeedNum` VARCHAR(191) NULL,
    `titleDeedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `valuationType` VARCHAR(191) NOT NULL,
    `valuationDone` BOOLEAN NOT NULL DEFAULT false,
    `valuerComments` LONGTEXT NULL,
    `longitude` DECIMAL(19, 15) NULL,
    `latitude` DECIMAL(19, 15) NULL,
    `mapLabel` VARCHAR(191) NULL,
    `capRate` DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    `marketValue` DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    `fairValue` DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    `forcedSaleValue` DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    `insuranceReplacementCost` DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    `landValue` DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    `capitalValue` DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    `valuerFullname` VARCHAR(191) NULL,
    `valuerQualification` VARCHAR(191) NULL,
    `plotId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `reportStatus` VARCHAR(191) NOT NULL DEFAULT 'Draft',
    `reportFile` VARCHAR(191) NULL,

    INDEX `ValuationsHistory_companyId_fkey`(`companyId`),
    INDEX `ValuationsHistory_valuer_fkey`(`valuer`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoredValue` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `plotId` VARCHAR(191) NULL,
    `identifier` VARCHAR(50) NOT NULL,
    `value` DECIMAL(19, 2) NOT NULL,

    INDEX `StoredValue_plotId_fkey`(`plotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SavedConfig` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `plotId` VARCHAR(191) NULL,
    `identifier` VARCHAR(50) NOT NULL,
    `value` VARCHAR(400) NULL,

    INDEX `SavedConfig_plotId_fkey`(`plotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Suburb` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `identifier` VARCHAR(400) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Event` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `domain` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `recordId` VARCHAR(191) NOT NULL,
    `recordData` LONGTEXT NOT NULL,

    INDEX `Event_userId_fkey`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConstructionProp` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `floorArea` DECIMAL(19, 2) NOT NULL,
    `verandaFloorArea` DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    `devYear` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConstructionPropertyItem` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `element` VARCHAR(191) NOT NULL,
    `propertyOption` VARCHAR(191) NOT NULL,
    `qualityOfFinish` VARCHAR(191) NOT NULL,
    `multiplierIdentifier` VARCHAR(191) NULL,
    `multiplier` DECIMAL(19, 2) NULL,
    `propId` VARCHAR(191) NOT NULL,

    INDEX `ConstructionPropertyItem_propId_fkey`(`propId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `YearRangeValue` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `first` DECIMAL(19, 2) NOT NULL,
    `second` DECIMAL(19, 2) NOT NULL,
    `third` DECIMAL(19, 2) NOT NULL,
    `kind` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoredStructureData` (
    `objectid` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `globalid` VARCHAR(191) NOT NULL,
    `parentglobalid` VARCHAR(191) NOT NULL,
    `MeasuredArea` DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    `RoomStructure` VARCHAR(191) NOT NULL,
    `StructureType` VARCHAR(191) NOT NULL,
    `OfficeNo` INTEGER NULL DEFAULT 0,
    `ToiletsNo` INTEGER NULL DEFAULT 0,
    `StoreroomNo` INTEGER NULL DEFAULT 0,
    `Aircon` INTEGER NULL DEFAULT 0,
    `DevStatus` VARCHAR(191) NOT NULL,
    `Bathrooms` INTEGER NULL DEFAULT 0,
    `GarageType` VARCHAR(191) NOT NULL,
    `Kitchen` VARCHAR(191) NOT NULL,
    `Wardrobe` VARCHAR(191) NOT NULL,
    `Wall` VARCHAR(191) NOT NULL,
    `WallFinish` VARCHAR(191) NOT NULL,
    `FloorConstruction` VARCHAR(191) NOT NULL,
    `Roof` VARCHAR(191) NOT NULL,
    `Services` VARCHAR(191) NOT NULL,
    `Rental` DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    `HouseType` VARCHAR(191) NOT NULL,
    `RoofModel` VARCHAR(191) NOT NULL,
    `Ceiling1` VARCHAR(191) NOT NULL,
    `InteriorWallFinish` VARCHAR(191) NOT NULL,
    `Property_Type` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`objectid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Tenant` ADD CONSTRAINT `Tenant_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tenant` ADD CONSTRAINT `Tenant_propertyTypeId_fkey` FOREIGN KEY (`propertyTypeId`) REFERENCES `PropertyType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Insurance` ADD CONSTRAINT `Insurance_constructionPropId_fkey` FOREIGN KEY (`constructionPropId`) REFERENCES `ConstructionProp`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Insurance` ADD CONSTRAINT `Insurance_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `InsuranceItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Insurance` ADD CONSTRAINT `Insurance_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Insurance` ADD CONSTRAINT `Insurance_roofTypeId_fkey` FOREIGN KEY (`roofTypeId`) REFERENCES `RoofType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Outgoing` ADD CONSTRAINT `Outgoing_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Parking` ADD CONSTRAINT `Parking_parkingTypeId_fkey` FOREIGN KEY (`parkingTypeId`) REFERENCES `ParkingType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Parking` ADD CONSTRAINT `Parking_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Plot` ADD CONSTRAINT `Plot_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Plot` ADD CONSTRAINT `Plot_reportReviewedById_fkey` FOREIGN KEY (`reportReviewedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Plot` ADD CONSTRAINT `Plot_reportValuedById_fkey` FOREIGN KEY (`reportValuedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Plot` ADD CONSTRAINT `Plot_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Plot` ADD CONSTRAINT `Plot_rptTemplateId_fkey` FOREIGN KEY (`rptTemplateId`) REFERENCES `RptTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Plot` ADD CONSTRAINT `Plot_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Plot` ADD CONSTRAINT `Plot_valuationsHistoryId_fkey` FOREIGN KEY (`valuationsHistoryId`) REFERENCES `ValuationsHistory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Plot` ADD CONSTRAINT `Plot_valuedById_fkey` FOREIGN KEY (`valuedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComparableImage` ADD CONSTRAINT `ComparableImage_comparablePlotId_fkey` FOREIGN KEY (`comparablePlotId`) REFERENCES `ComparablePlot`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlotAndComparable` ADD CONSTRAINT `PlotAndComparable_comparablePlotId_fkey` FOREIGN KEY (`comparablePlotId`) REFERENCES `ComparablePlot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlotAndComparable` ADD CONSTRAINT `PlotAndComparable_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Image` ADD CONSTRAINT `Image_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Image` ADD CONSTRAINT `Image_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyImage` ADD CONSTRAINT `CompanyImage_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Client` ADD CONSTRAINT `Client_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Valuer` ADD CONSTRAINT `Valuer_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Grc` ADD CONSTRAINT `Grc_constructionPropId_fkey` FOREIGN KEY (`constructionPropId`) REFERENCES `ConstructionProp`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Grc` ADD CONSTRAINT `Grc_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GrcFee` ADD CONSTRAINT `GrcFee_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GrcDepr` ADD CONSTRAINT `GrcDepr_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mv` ADD CONSTRAINT `Mv_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Password` ADD CONSTRAINT `Password_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_userGroupId_fkey` FOREIGN KEY (`userGroupId`) REFERENCES `UserGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_notificationId_fkey` FOREIGN KEY (`notificationId`) REFERENCES `Notification`(`noteId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_notificationId_fkey` FOREIGN KEY (`notificationId`) REFERENCES `Notification`(`noteId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserGroup` ADD CONSTRAINT `UserGroup_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RptTemplate` ADD CONSTRAINT `RptTemplate_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportTemplateSection` ADD CONSTRAINT `ReportTemplateSection_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `RptTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TemplateSubSection` ADD CONSTRAINT `TemplateSubSection_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `ReportTemplateSection`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportSection` ADD CONSTRAINT `ReportSection_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportSection` ADD CONSTRAINT `ReportSection_templateSectionId_fkey` FOREIGN KEY (`templateSectionId`) REFERENCES `ReportTemplateSection`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportSubSection` ADD CONSTRAINT `ReportSubSection_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `ReportSection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportSubSection` ADD CONSTRAINT `ReportSubSection_templateSubSectionId_fkey` FOREIGN KEY (`templateSubSectionId`) REFERENCES `TemplateSubSection`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportTemplate` ADD CONSTRAINT `ReportTemplate_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportHeader` ADD CONSTRAINT `ReportHeader_reportTemplateId_fkey` FOREIGN KEY (`reportTemplateId`) REFERENCES `ReportTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportSubHeader` ADD CONSTRAINT `ReportSubHeader_reportHeaderId_fkey` FOREIGN KEY (`reportHeaderId`) REFERENCES `ReportHeader`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportBodyContent` ADD CONSTRAINT `ReportBodyContent_subHeaderId_fkey` FOREIGN KEY (`subHeaderId`) REFERENCES `ReportSubHeader`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ValuationsHistory` ADD CONSTRAINT `ValuationsHistory_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ValuationsHistory` ADD CONSTRAINT `ValuationsHistory_valuer_fkey` FOREIGN KEY (`valuer`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoredValue` ADD CONSTRAINT `StoredValue_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SavedConfig` ADD CONSTRAINT `SavedConfig_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConstructionPropertyItem` ADD CONSTRAINT `ConstructionPropertyItem_propId_fkey` FOREIGN KEY (`propId`) REFERENCES `ConstructionProp`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
