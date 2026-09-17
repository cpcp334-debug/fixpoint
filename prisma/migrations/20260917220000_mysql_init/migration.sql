-- CreateTable
CREATE TABLE `ServiceCategory` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `sopCode` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('draft', 'review', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ServiceCategory_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceCategoryI18n` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL DEFAULT '',

    UNIQUE INDEX `ServiceCategoryI18n_categoryId_locale_key`(`categoryId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Service` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `serviceType` VARCHAR(191) NOT NULL,
    `status` ENUM('draft', 'active', 'requires_approval', 'subcontracted', 'unavailable', 'archived') NOT NULL DEFAULT 'draft',
    `riskLevel` ENUM('green', 'yellow', 'red') NOT NULL DEFAULT 'yellow',
    `diyAvailable` BOOLEAN NOT NULL DEFAULT false,
    `quoteMethod` ENUM('fixed', 'per_hour', 'per_item', 'per_unit', 'per_sqft', 'per_sqm', 'per_room', 'material_labor', 'project', 'inspection', 'amc') NOT NULL DEFAULT 'inspection',
    `inspectionRequired` BOOLEAN NOT NULL DEFAULT true,
    `bookingEnabled` BOOLEAN NOT NULL DEFAULT true,
    `emergencyAvailable` BOOLEAN NOT NULL DEFAULT false,
    `amcAvailable` BOOLEAN NOT NULL DEFAULT false,
    `indexable` BOOLEAN NOT NULL DEFAULT false,
    `heroImage` VARCHAR(191) NULL,
    `gallery` LONGTEXT NOT NULL DEFAULT '[]',
    `relatedServiceSlugs` LONGTEXT NOT NULL DEFAULT '[]',
    `aiIntakeQuestions` LONGTEXT NOT NULL DEFAULT '[]',
    `schemaData` LONGTEXT NOT NULL DEFAULT '{}',
    `sopCode` VARCHAR(191) NULL,
    `sopPublic` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `primaryDiyGuideId` VARCHAR(191) NULL,

    UNIQUE INDEX `Service_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceI18n` (
    `id` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `shortDescription` TEXT NOT NULL,
    `longDescription` LONGTEXT NOT NULL,
    `whoItIsFor` TEXT NOT NULL DEFAULT '',
    `whatWeDo` LONGTEXT NOT NULL DEFAULT '',
    `whenProfessional` TEXT NOT NULL DEFAULT '',
    `process` LONGTEXT NOT NULL DEFAULT '',
    `pricingInfo` TEXT NOT NULL DEFAULT '',
    `professionalFallback` TEXT NOT NULL,
    `safetyNotes` TEXT NOT NULL DEFAULT '',
    `seoTitle` TEXT NOT NULL,
    `metaDescription` TEXT NOT NULL,
    `keywords` TEXT NOT NULL DEFAULT '',
    `faq` LONGTEXT NOT NULL DEFAULT '[]',

    UNIQUE INDEX `ServiceI18n_serviceId_locale_key`(`serviceId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Location` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `type` ENUM('country', 'emirate', 'city', 'community') NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `status` ENUM('draft', 'active', 'archived') NOT NULL DEFAULT 'draft',
    `serves` BOOLEAN NOT NULL DEFAULT false,
    `indexable` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Location_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LocationI18n` (
    `id` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `intro` LONGTEXT NOT NULL,
    `localServiceInfo` LONGTEXT NOT NULL DEFAULT '',
    `propertyTypes` TEXT NOT NULL DEFAULT '',
    `nearbyAreas` TEXT NOT NULL DEFAULT '',
    `seoTitle` TEXT NOT NULL,
    `metaDescription` TEXT NOT NULL,
    `faq` LONGTEXT NOT NULL DEFAULT '[]',

    UNIQUE INDEX `LocationI18n_locationId_locale_key`(`locationId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceLocation` (
    `id` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `indexable` BOOLEAN NOT NULL DEFAULT false,
    `qualityScore` INTEGER NOT NULL DEFAULT 0,
    `covered` BOOLEAN NOT NULL DEFAULT false,
    `coverageStatus` ENUM('draft', 'review', 'approved', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `qualityStatus` ENUM('incomplete', 'ready_for_review', 'approved', 'publishable', 'indexable', 'failed_quality') NOT NULL DEFAULT 'incomplete',
    `indexableEn` BOOLEAN NOT NULL DEFAULT false,
    `indexableAr` BOOLEAN NOT NULL DEFAULT false,
    `bookingEnabledOverride` BOOLEAN NULL,
    `amcAvailableOverride` BOOLEAN NULL,
    `emergencyAvailableOverride` BOOLEAN NULL,
    `diyRestricted` BOOLEAN NOT NULL DEFAULT false,
    `heroImageOverride` VARCHAR(191) NULL,
    `publishedAt` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServiceLocation_coverageStatus_indexable_idx`(`coverageStatus`, `indexable`),
    INDEX `ServiceLocation_indexable_updatedAt_idx`(`indexable`, `updatedAt`),
    INDEX `ServiceLocation_locationId_coverageStatus_idx`(`locationId`, `coverageStatus`),
    INDEX `ServiceLocation_serviceId_coverageStatus_idx`(`serviceId`, `coverageStatus`),
    INDEX `ServiceLocation_qualityStatus_idx`(`qualityStatus`),
    UNIQUE INDEX `ServiceLocation_serviceId_locationId_key`(`serviceId`, `locationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceLocationI18n` (
    `id` VARCHAR(191) NOT NULL,
    `serviceLocationId` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(191) NOT NULL,
    `intro` LONGTEXT NOT NULL,
    `localInfo` LONGTEXT NOT NULL,
    `seoTitle` TEXT NOT NULL,
    `metaDescription` TEXT NOT NULL,
    `faq` LONGTEXT NOT NULL DEFAULT '[]',
    `h1` TEXT NOT NULL DEFAULT '',
    `body` LONGTEXT NOT NULL DEFAULT '',
    `directAnswer` TEXT NOT NULL DEFAULT '',
    `geoIntro` TEXT NOT NULL DEFAULT '',
    `imageAlt` TEXT NOT NULL DEFAULT '',

    UNIQUE INDEX `ServiceLocationI18n_serviceLocationId_locale_key`(`serviceLocationId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceLocationRevision` (
    `id` VARCHAR(191) NOT NULL,
    `serviceLocationId` VARCHAR(191) NOT NULL,
    `revisionNumber` INTEGER NOT NULL,
    `locale` VARCHAR(191) NOT NULL,
    `snapshotJson` LONGTEXT NOT NULL,
    `generatedBy` VARCHAR(191) NOT NULL DEFAULT 'system',
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `changeReason` TEXT NOT NULL DEFAULT '',
    `previousRevisionId` VARCHAR(191) NULL,
    `status` ENUM('draft', 'approved', 'published', 'superseded') NOT NULL DEFAULT 'draft',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ServiceLocationRevision_serviceLocationId_status_idx`(`serviceLocationId`, `status`),
    INDEX `ServiceLocationRevision_serviceLocationId_locale_status_idx`(`serviceLocationId`, `locale`, `status`),
    UNIQUE INDEX `ServiceLocationRevision_serviceLocationId_locale_revisionNum_key`(`serviceLocationId`, `locale`, `revisionNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DiyCategory` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `status` ENUM('draft', 'review', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `indexable` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DiyCategory_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DiyCategoryI18n` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL DEFAULT '',
    `seoTitle` TEXT NOT NULL DEFAULT '',
    `metaDescription` TEXT NOT NULL DEFAULT '',

    UNIQUE INDEX `DiyCategoryI18n_categoryId_locale_key`(`categoryId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DiyGuide` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `categorySlug` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NULL,
    `difficulty` VARCHAR(191) NOT NULL,
    `estimatedTime` VARCHAR(191) NOT NULL,
    `riskLevel` ENUM('green', 'yellow', 'red') NOT NULL DEFAULT 'green',
    `schemaType` VARCHAR(191) NOT NULL DEFAULT 'article',
    `status` ENUM('draft', 'review', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `indexable` BOOLEAN NOT NULL DEFAULT false,
    `relatedSlugs` LONGTEXT NOT NULL DEFAULT '[]',
    `relatedServiceSlugs` LONGTEXT NOT NULL DEFAULT '[]',
    `locationSlugs` LONGTEXT NOT NULL DEFAULT '[]',
    `profileJson` LONGTEXT NOT NULL DEFAULT '{}',
    `profileStatus` ENUM('draft', 'safety_review', 'translation_review', 'approved', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `profileVersion` INTEGER NOT NULL DEFAULT 1,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `arabicReviewStatus` ENUM('not_started', 'translation_review', 'ready_for_translation', 'reviewed') NOT NULL DEFAULT 'not_started',
    `safetyReviewedBy` VARCHAR(191) NULL,
    `safetyReviewedAt` DATETIME(3) NULL,
    `createdBy` VARCHAR(191) NOT NULL DEFAULT 'system',
    `updatedBy` VARCHAR(191) NOT NULL DEFAULT 'system',
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DiyGuide_slug_key`(`slug`),
    INDEX `DiyGuide_serviceId_isPrimary_idx`(`serviceId`, `isPrimary`),
    INDEX `DiyGuide_profileStatus_idx`(`profileStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DiyGuideI18n` (
    `id` VARCHAR(191) NOT NULL,
    `guideId` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(191) NOT NULL,
    `title` TEXT NOT NULL,
    `problem` TEXT NOT NULL,
    `quickAnswer` TEXT NOT NULL,
    `difficulty` VARCHAR(191) NOT NULL DEFAULT '',
    `estimatedTime` VARCHAR(191) NOT NULL DEFAULT '',
    `tools` LONGTEXT NOT NULL DEFAULT '[]',
    `materials` LONGTEXT NOT NULL DEFAULT '[]',
    `safety` LONGTEXT NOT NULL,
    `steps` LONGTEXT NOT NULL DEFAULT '[]',
    `checkWork` TEXT NOT NULL DEFAULT '',
    `whenToStop` TEXT NOT NULL,
    `professionalFallback` TEXT NOT NULL,
    `seoTitle` TEXT NOT NULL,
    `metaDescription` TEXT NOT NULL,
    `faq` LONGTEXT NOT NULL DEFAULT '[]',

    UNIQUE INDEX `DiyGuideI18n_guideId_locale_key`(`guideId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DiyVote` (
    `id` VARCHAR(191) NOT NULL,
    `guideId` VARCHAR(191) NOT NULL,
    `helpful` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Article` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `status` ENUM('draft', 'review', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `indexable` BOOLEAN NOT NULL DEFAULT false,
    `categorySlugs` LONGTEXT NOT NULL DEFAULT '[]',
    `heroImage` VARCHAR(191) NULL,
    `relatedServiceSlugs` LONGTEXT NOT NULL DEFAULT '[]',
    `relatedDiySlugs` LONGTEXT NOT NULL DEFAULT '[]',
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Article_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ArticleI18n` (
    `id` VARCHAR(191) NOT NULL,
    `articleId` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(191) NOT NULL,
    `title` TEXT NOT NULL,
    `excerpt` TEXT NOT NULL DEFAULT '',
    `body` LONGTEXT NOT NULL DEFAULT '',
    `diySection` LONGTEXT NOT NULL DEFAULT '',
    `faq` LONGTEXT NOT NULL DEFAULT '[]',
    `imageAlt` TEXT NOT NULL DEFAULT '',
    `seoTitle` TEXT NOT NULL,
    `metaDescription` TEXT NOT NULL,

    UNIQUE INDEX `ArticleI18n_articleId_locale_key`(`articleId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Project` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `serviceSlug` VARCHAR(191) NULL,
    `locationSlug` VARCHAR(191) NULL,
    `propertyType` VARCHAR(191) NULL,
    `workDate` DATETIME(3) NULL,
    `status` ENUM('draft', 'review', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `indexable` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Project_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectI18n` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(191) NOT NULL,
    `title` TEXT NOT NULL,
    `problem` TEXT NOT NULL DEFAULT '',
    `scope` VARCHAR(191) NOT NULL DEFAULT '',
    `work` TEXT NOT NULL DEFAULT '',
    `result` TEXT NOT NULL DEFAULT '',
    `testimonial` TEXT NOT NULL DEFAULT '',
    `seoTitle` TEXT NOT NULL,
    `metaDescription` TEXT NOT NULL,

    UNIQUE INDEX `ProjectI18n_projectId_locale_key`(`projectId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Faq` (
    `id` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NULL,
    `locationId` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('draft', 'review', 'published', 'archived') NOT NULL DEFAULT 'published',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FaqI18n` (
    `id` VARCHAR(191) NOT NULL,
    `faqId` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(191) NOT NULL,
    `question` TEXT NOT NULL,
    `answer` TEXT NOT NULL,

    UNIQUE INDEX `FaqI18n_faqId_locale_key`(`faqId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MediaAsset` (
    `id` VARCHAR(191) NOT NULL,
    `storageKey` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `alt` TEXT NOT NULL DEFAULT '',
    `caption` TEXT NOT NULL DEFAULT '',
    `visibility` VARCHAR(191) NOT NULL DEFAULT 'private',
    `status` VARCHAR(191) NOT NULL DEFAULT 'ready',
    `conversationId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MediaAsset_storageKey_key`(`storageKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `whatsapp` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `preferredLanguage` VARCHAR(191) NOT NULL DEFAULT 'en',
    `consentMarketing` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NOT NULL DEFAULT '',
    `visitorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Customer_visitorId_idx`(`visitorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Property` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `notes` TEXT NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lead` (
    `id` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `whatsapp` VARCHAR(191) NULL,
    `serviceId` VARCHAR(191) NULL,
    `locationId` VARCHAR(191) NULL,
    `propertyType` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `area` VARCHAR(191) NULL,
    `requirement` VARCHAR(191) NOT NULL,
    `urgency` VARCHAR(191) NOT NULL DEFAULT 'normal',
    `estimatedValue` VARCHAR(191) NULL,
    `status` ENUM('NEW', 'QUALIFIED', 'INSPECTION', 'QUOTATION', 'QUOTATION_SENT', 'FOLLOW_UP', 'APPROVED', 'SCHEDULED', 'COMPLETED', 'LOST', 'CANCELLED') NOT NULL DEFAULT 'NEW',
    `assignedStaffId` VARCHAR(191) NULL,
    `photos` LONGTEXT NOT NULL DEFAULT '[]',
    `aiSummary` VARCHAR(191) NOT NULL DEFAULT '',
    `notes` TEXT NOT NULL DEFAULT '',
    `preferredDate` VARCHAR(191) NULL,
    `preferredTime` VARCHAR(191) NULL,
    `locale` VARCHAR(191) NOT NULL DEFAULT 'en',
    `visitorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Lead_visitorId_idx`(`visitorId`),
    INDEX `Lead_customerId_idx`(`customerId`),
    INDEX `Lead_createdAt_idx`(`createdAt`),
    INDEX `Lead_status_idx`(`status`),
    INDEX `Lead_serviceId_idx`(`serviceId`),
    INDEX `Lead_locationId_idx`(`locationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadScore` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `score` INTEGER NOT NULL,
    `systemClass` ENUM('HOT', 'WARM', 'NORMAL', 'REVIEW', 'SPAM') NOT NULL,
    `humanClass` ENUM('HOT', 'WARM', 'NORMAL', 'REVIEW', 'SPAM') NULL,
    `effectiveClass` ENUM('HOT', 'WARM', 'NORMAL', 'REVIEW', 'SPAM') NOT NULL,
    `reasonsJson` LONGTEXT NOT NULL DEFAULT '[]',
    `modelVersion` VARCHAR(191) NOT NULL DEFAULT '2f2.1',
    `computedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `overrideAt` DATETIME(3) NULL,
    `overrideBy` VARCHAR(191) NULL,
    `overrideNote` VARCHAR(191) NOT NULL DEFAULT '',
    `quarantined` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `LeadScore_leadId_key`(`leadId`),
    INDEX `LeadScore_effectiveClass_idx`(`effectiveClass`),
    INDEX `LeadScore_quarantined_idx`(`quarantined`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadScoreHistory` (
    `id` VARCHAR(191) NOT NULL,
    `leadScoreId` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `score` INTEGER NOT NULL,
    `systemClass` ENUM('HOT', 'WARM', 'NORMAL', 'REVIEW', 'SPAM') NOT NULL,
    `effectiveClass` ENUM('HOT', 'WARM', 'NORMAL', 'REVIEW', 'SPAM') NOT NULL,
    `reasonsJson` LONGTEXT NOT NULL DEFAULT '[]',
    `actor` VARCHAR(191) NOT NULL,
    `cause` ENUM('SYSTEM', 'OVERRIDE', 'RECOMPUTE') NOT NULL,
    `note` VARCHAR(191) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LeadScoreHistory_leadId_createdAt_idx`(`leadId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Quote` (
    `id` VARCHAR(191) NOT NULL,
    `quoteNumber` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `customerId` VARCHAR(191) NULL,
    `leadId` VARCHAR(191) NULL,
    `serviceId` VARCHAR(191) NULL,
    `locationId` VARCHAR(191) NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `locationLabel` VARCHAR(191) NOT NULL DEFAULT '',
    `serviceLabel` VARCHAR(191) NOT NULL DEFAULT '',
    `customerName` VARCHAR(191) NOT NULL DEFAULT '',
    `customerPhone` VARCHAR(191) NOT NULL DEFAULT '',
    `customerEmail` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NOT NULL DEFAULT '',
    `materials` LONGTEXT NOT NULL DEFAULT '',
    `labor` TEXT NOT NULL DEFAULT '',
    `exclusions` TEXT NOT NULL DEFAULT '',
    `taxesNote` TEXT NOT NULL DEFAULT '',
    `validity` TEXT NOT NULL DEFAULT '',
    `paymentTerms` TEXT NOT NULL DEFAULT '',
    `estimatedDuration` TEXT NOT NULL DEFAULT '',
    `warrantyTerms` TEXT NOT NULL DEFAULT '',
    `notes` TEXT NOT NULL DEFAULT '',
    `subtotalLabel` TEXT NOT NULL DEFAULT '',
    `discountLabel` TEXT NOT NULL DEFAULT '',
    `taxLabel` TEXT NOT NULL DEFAULT '',
    `totalLabel` TEXT NOT NULL DEFAULT '',
    `humanApproved` BOOLEAN NOT NULL DEFAULT false,
    `sentAt` DATETIME(3) NULL,
    `sourceKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Quote_quoteNumber_key`(`quoteNumber`),
    UNIQUE INDEX `Quote_sourceKey_key`(`sourceKey`),
    INDEX `Quote_leadId_idx`(`leadId`),
    INDEX `Quote_customerId_idx`(`customerId`),
    INDEX `Quote_createdAt_idx`(`createdAt`),
    INDEX `Quote_status_idx`(`status`),
    INDEX `Quote_serviceId_idx`(`serviceId`),
    INDEX `Quote_locationId_idx`(`locationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuoteItem` (
    `id` VARCHAR(191) NOT NULL,
    `quoteId` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `quantity` VARCHAR(191) NOT NULL DEFAULT '1',
    `unit` VARCHAR(191) NOT NULL DEFAULT '',
    `unitPrice` VARCHAR(191) NOT NULL DEFAULT '',
    `lineTotal` VARCHAR(191) NOT NULL DEFAULT '',
    `kind` VARCHAR(191) NOT NULL DEFAULT 'item',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invoice` (
    `id` VARCHAR(191) NOT NULL,
    `number` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `customerId` VARCHAR(191) NULL,
    `quoteId` VARCHAR(191) NULL,
    `bookingId` VARCHAR(191) NULL,
    `workOrderId` VARCHAR(191) NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `customerName` VARCHAR(191) NOT NULL DEFAULT '',
    `customerPhone` VARCHAR(191) NOT NULL DEFAULT '',
    `customerEmail` VARCHAR(191) NULL,
    `locationLabel` VARCHAR(191) NOT NULL DEFAULT '',
    `serviceLabel` VARCHAR(191) NOT NULL DEFAULT '',
    `notes` TEXT NOT NULL DEFAULT '',
    `subtotalLabel` TEXT NOT NULL DEFAULT '',
    `discountLabel` TEXT NOT NULL DEFAULT '',
    `taxLabel` TEXT NOT NULL DEFAULT '',
    `totalLabel` TEXT NOT NULL DEFAULT '',
    `issueDate` VARCHAR(191) NULL,
    `dueDate` VARCHAR(191) NULL,
    `paymentRef` VARCHAR(191) NULL,
    `sourceKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Invoice_number_key`(`number`),
    UNIQUE INDEX `Invoice_sourceKey_key`(`sourceKey`),
    INDEX `Invoice_customerId_idx`(`customerId`),
    INDEX `Invoice_quoteId_idx`(`quoteId`),
    INDEX `Invoice_bookingId_idx`(`bookingId`),
    INDEX `Invoice_workOrderId_idx`(`workOrderId`),
    INDEX `Invoice_createdAt_idx`(`createdAt`),
    INDEX `Invoice_updatedAt_idx`(`updatedAt`),
    INDEX `Invoice_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvoiceItem` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `quantity` VARCHAR(191) NOT NULL DEFAULT '1',
    `unit` VARCHAR(191) NOT NULL DEFAULT '',
    `unitPrice` VARCHAR(191) NOT NULL DEFAULT '',
    `lineTotal` VARCHAR(191) NOT NULL DEFAULT '',
    `kind` VARCHAR(191) NOT NULL DEFAULT 'item',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PricingRule` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NULL,
    `method` ENUM('fixed', 'per_hour', 'per_item', 'per_unit', 'per_sqft', 'per_sqm', 'per_room', 'material_labor', 'project', 'inspection', 'amc') NOT NULL DEFAULT 'inspection',
    `unitLabel` VARCHAR(191) NOT NULL DEFAULT '',
    `notes` TEXT NOT NULL DEFAULT '',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'customer_service',
    `staffId` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Session_tokenHash_key`(`tokenHash`),
    INDEX `Session_userId_idx`(`userId`),
    INDEX `Session_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuthLoginGuard` (
    `emailHash` VARCHAR(191) NOT NULL,
    `failedCount` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`emailHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RateLimitBucket` (
    `keyHash` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `resetAt` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RateLimitBucket_resetAt_idx`(`resetAt`),
    PRIMARY KEY (`keyHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffAiConversation` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `frozenRole` TEXT NOT NULL,
    `messagesJson` LONGTEXT NOT NULL DEFAULT '[]',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StaffAiConversation_userId_updatedAt_idx`(`userId`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffAiDailyUsage` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `dayKey` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StaffAiDailyUsage_dayKey_idx`(`dayKey`),
    UNIQUE INDEX `StaffAiDailyUsage_userId_dayKey_key`(`userId`, `dayKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffAiProposal` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NULL,
    `actorEmail` TEXT NOT NULL DEFAULT '',
    `frozenRole` TEXT NOT NULL DEFAULT '',
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `actionType` TEXT NOT NULL,
    `title` TEXT NOT NULL,
    `reason` TEXT NOT NULL DEFAULT '',
    `sopCode` VARCHAR(191) NOT NULL DEFAULT '',
    `sopTitle` TEXT NOT NULL DEFAULT '',
    `sideEffects` LONGTEXT NOT NULL DEFAULT '',
    `itemsJson` LONGTEXT NOT NULL DEFAULT '[]',
    `resultJson` LONGTEXT NOT NULL DEFAULT '{}',
    `error` TEXT NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `approvedAt` DATETIME(3) NULL,
    `approvedBy` VARCHAR(191) NOT NULL DEFAULT '',
    `cancelledAt` DATETIME(3) NULL,
    `cancelledBy` VARCHAR(191) NOT NULL DEFAULT '',
    `executedAt` DATETIME(3) NULL,

    INDEX `StaffAiProposal_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `StaffAiProposal_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `StaffAiProposal_conversationId_idx`(`conversationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExportLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `dataset` TEXT NOT NULL,
    `format` TEXT NOT NULL,
    `filters` LONGTEXT NOT NULL DEFAULT '{}',
    `resultCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NumberSequence` (
    `id` VARCHAR(191) NOT NULL,
    `lastValue` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `id` VARCHAR(191) NOT NULL,
    `number` VARCHAR(191) NOT NULL,
    `type` ENUM('standard', 'site_inspection', 'emergency', 'recurring_cleaning', 'amc_visit') NOT NULL DEFAULT 'standard',
    `priority` VARCHAR(191) NOT NULL DEFAULT 'normal',
    `customerId` VARCHAR(191) NULL,
    `leadId` VARCHAR(191) NULL,
    `conversationId` VARCHAR(191) NULL,
    `serviceId` VARCHAR(191) NULL,
    `locationId` VARCHAR(191) NULL,
    `cityId` VARCHAR(191) NULL,
    `areaId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `whatsapp` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `propertyType` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `area` VARCHAR(191) NULL,
    `preferredDate` VARCHAR(191) NULL,
    `preferredTime` VARCHAR(191) NULL,
    `confirmedDate` VARCHAR(191) NULL,
    `confirmedTime` VARCHAR(191) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `calendarEventId` VARCHAR(191) NULL,
    `frequency` TEXT NULL,
    `amcReference` VARCHAR(191) NULL,
    `technicianId` VARCHAR(191) NULL,
    `supervisorId` VARCHAR(191) NULL,
    `requirement` VARCHAR(191) NOT NULL,
    `photos` LONGTEXT NOT NULL DEFAULT '[]',
    `status` ENUM('requested', 'pending_confirmation', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled', 'rescheduled') NOT NULL DEFAULT 'requested',
    `notes` TEXT NOT NULL DEFAULT '',
    `locale` VARCHAR(191) NOT NULL DEFAULT 'en',
    `visitorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Booking_number_key`(`number`),
    INDEX `Booking_visitorId_idx`(`visitorId`),
    INDEX `Booking_leadId_idx`(`leadId`),
    INDEX `Booking_customerId_idx`(`customerId`),
    INDEX `Booking_technicianId_idx`(`technicianId`),
    INDEX `Booking_supervisorId_idx`(`supervisorId`),
    INDEX `Booking_createdAt_idx`(`createdAt`),
    INDEX `Booking_status_idx`(`status`),
    INDEX `Booking_type_idx`(`type`),
    INDEX `Booking_serviceId_idx`(`serviceId`),
    INDEX `Booking_locationId_idx`(`locationId`),
    INDEX `Booking_updatedAt_idx`(`updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inspection` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NULL,
    `assignedTo` VARCHAR(191) NULL,
    `scheduledAt` DATETIME(3) NULL,
    `locationLabel` VARCHAR(191) NOT NULL DEFAULT '',
    `checklist` VARCHAR(191) NOT NULL DEFAULT '[]',
    `measurements` VARCHAR(191) NOT NULL DEFAULT '',
    `photos` LONGTEXT NOT NULL DEFAULT '[]',
    `findings` VARCHAR(191) NOT NULL DEFAULT '',
    `materials` LONGTEXT NOT NULL DEFAULT '',
    `proposedScope` VARCHAR(191) NOT NULL DEFAULT '',
    `recommendations` VARCHAR(191) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkOrder` (
    `id` VARCHAR(191) NOT NULL,
    `number` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `serviceId` VARCHAR(191) NULL,
    `locationId` VARCHAR(191) NULL,
    `bookingId` VARCHAR(191) NULL,
    `locationLabel` VARCHAR(191) NOT NULL DEFAULT '',
    `propertyLabel` TEXT NOT NULL DEFAULT '',
    `serviceLabel` VARCHAR(191) NOT NULL DEFAULT '',
    `scope` VARCHAR(191) NOT NULL DEFAULT '',
    `supervisorId` VARCHAR(191) NULL,
    `technicianId` VARCHAR(191) NULL,
    `materials` LONGTEXT NOT NULL DEFAULT '[]',
    `tools` LONGTEXT NOT NULL DEFAULT '[]',
    `ppe` VARCHAR(191) NOT NULL DEFAULT '[]',
    `scheduledDate` VARCHAR(191) NULL,
    `scheduledTime` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'created',
    `notes` TEXT NOT NULL DEFAULT '',
    `photos` LONGTEXT NOT NULL DEFAULT '[]',
    `qcResult` TEXT NOT NULL DEFAULT '',
    `customerSignOff` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WorkOrder_number_key`(`number`),
    INDEX `WorkOrder_bookingId_idx`(`bookingId`),
    INDEX `WorkOrder_customerId_idx`(`customerId`),
    INDEX `WorkOrder_technicianId_idx`(`technicianId`),
    INDEX `WorkOrder_supervisorId_idx`(`supervisorId`),
    INDEX `WorkOrder_createdAt_idx`(`createdAt`),
    INDEX `WorkOrder_updatedAt_idx`(`updatedAt`),
    INDEX `WorkOrder_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AmcContract` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL DEFAULT '',
    `propertyLabel` TEXT NOT NULL DEFAULT '',
    `locationLabel` VARCHAR(191) NOT NULL DEFAULT '',
    `coveredServices` LONGTEXT NOT NULL DEFAULT '',
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `frequency` TEXT NOT NULL DEFAULT '',
    `sla` TEXT NOT NULL DEFAULT '',
    `included` LONGTEXT NOT NULL DEFAULT '',
    `excluded` LONGTEXT NOT NULL DEFAULT '',
    `notes` TEXT NOT NULL DEFAULT '',
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `assignedStaffId` VARCHAR(191) NULL,
    `contractValue` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AmcContract_customerId_idx`(`customerId`),
    INDEX `AmcContract_endDate_idx`(`endDate`),
    INDEX `AmcContract_status_endDate_idx`(`status`, `endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'unconfigured',
    `reference` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Staff` (
    `id` VARCHAR(191) NOT NULL,
    `staffCode` VARCHAR(191) NOT NULL,
    `role` ENUM('admin', 'manager', 'customer_service', 'sales', 'supervisor', 'technician', 'subcontractor', 'customer') NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `supervisorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Staff_staffCode_key`(`staffCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffSkill` (
    `id` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `categorySlug` VARCHAR(191) NOT NULL,
    `locationSlug` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subcontractor` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `specialization` TEXT NOT NULL DEFAULT '',
    `coverage` TEXT NOT NULL DEFAULT '',
    `approvalStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `documentationOk` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Subcontractor_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Review` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('service', 'article', 'guide') NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN', 'FLAGGED', 'VERIFIED') NOT NULL DEFAULT 'PENDING',
    `stars` INTEGER NOT NULL,
    `title` TEXT NOT NULL DEFAULT '',
    `body` LONGTEXT NOT NULL DEFAULT '',
    `authorName` VARCHAR(191) NOT NULL,
    `photoKey` VARCHAR(191) NULL,
    `serviceId` VARCHAR(191) NULL,
    `locationId` VARCHAR(191) NULL,
    `bookingId` VARCHAR(191) NULL,
    `guideId` VARCHAR(191) NULL,
    `articleId` VARCHAR(191) NULL,
    `workOrderId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NULL,
    `area` VARCHAR(191) NULL,
    `locale` VARCHAR(191) NOT NULL DEFAULT 'en',
    `adminResponse` TEXT NOT NULL DEFAULT '',
    `adminRespondedAt` DATETIME(3) NULL,
    `flagCount` INTEGER NOT NULL DEFAULT 0,
    `helpful` BOOLEAN NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `visitorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Review_visitorId_idx`(`visitorId`),
    INDEX `Review_createdAt_idx`(`createdAt`),
    INDEX `Review_type_status_idx`(`type`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReviewVote` (
    `id` VARCHAR(191) NOT NULL,
    `reviewId` VARCHAR(191) NOT NULL,
    `helpful` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReviewInsight` (
    `id` VARCHAR(191) NOT NULL,
    `reviewId` VARCHAR(191) NULL,
    `serviceId` VARCHAR(191) NULL,
    `locationId` VARCHAR(191) NULL,
    `sentiment` VARCHAR(191) NOT NULL DEFAULT 'unknown',
    `themes` VARCHAR(191) NOT NULL DEFAULT '[]',
    `punctuality` VARCHAR(191) NOT NULL DEFAULT '',
    `communication` VARCHAR(191) NOT NULL DEFAULT '',
    `visibility` ENUM('PUBLIC', 'INTERNAL', 'PRIVATE') NOT NULL DEFAULT 'INTERNAL',
    `notes` TEXT NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Question` (
    `id` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NULL,
    `locationId` VARCHAR(191) NULL,
    `guideId` VARCHAR(191) NULL,
    `articleId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NULL,
    `askerName` VARCHAR(191) NOT NULL DEFAULT '',
    `body` LONGTEXT NOT NULL,
    `answer` TEXT NOT NULL DEFAULT '',
    `status` ENUM('draft', 'review', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `moderationStatus` ENUM('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN', 'FLAGGED', 'VERIFIED') NOT NULL DEFAULT 'PENDING',
    `flagCount` INTEGER NOT NULL DEFAULT 0,
    `locale` VARCHAR(191) NOT NULL DEFAULT 'en',
    `visitorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Question_visitorId_idx`(`visitorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContentReport` (
    `id` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `reason` TEXT NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiConversation` (
    `id` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(191) NOT NULL DEFAULT 'en',
    `messages` VARCHAR(191) NOT NULL DEFAULT '[]',
    `summary` VARCHAR(191) NOT NULL DEFAULT '',
    `leadId` VARCHAR(191) NULL,
    `bookingId` VARCHAR(191) NULL,
    `tokenHash` VARCHAR(191) NOT NULL DEFAULT '',
    `photoIds` VARCHAR(191) NOT NULL DEFAULT '[]',
    `visitorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AiConversation_visitorId_idx`(`visitorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Visitor` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `locale` VARCHAR(191) NULL,
    `optedOut` BOOLEAN NOT NULL DEFAULT false,
    `customerId` VARCHAR(191) NULL,

    INDEX `Visitor_lastSeenAt_idx`(`lastSeenAt`),
    INDEX `Visitor_customerId_idx`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VisitSession` (
    `id` VARCHAR(191) NOT NULL,
    `visitorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VisitSession_visitorId_idx`(`visitorId`),
    INDEX `VisitSession_lastSeenAt_idx`(`lastSeenAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnalyticsEvent` (
    `id` VARCHAR(191) NOT NULL,
    `visitorId` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `path` TEXT NULL,
    `locale` VARCHAR(191) NULL,
    `entityType` TEXT NULL,
    `entityId` VARCHAR(191) NULL,
    `meta` VARCHAR(191) NOT NULL DEFAULT '{}',
    `source` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AnalyticsEvent_createdAt_idx`(`createdAt`),
    INDEX `AnalyticsEvent_visitorId_createdAt_idx`(`visitorId`, `createdAt`),
    INDEX `AnalyticsEvent_name_createdAt_idx`(`name`, `createdAt`),
    INDEX `AnalyticsEvent_sessionId_idx`(`sessionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KnowledgeDocument` (
    `id` VARCHAR(191) NOT NULL,
    `scope` ENUM('PUBLIC', 'INTERNAL', 'PRIVATE') NOT NULL,
    `title` TEXT NOT NULL,
    `body` LONGTEXT NOT NULL DEFAULT '',
    `sopCode` VARCHAR(191) NULL,
    `description` TEXT NOT NULL DEFAULT '',
    `status` ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `version` INTEGER NOT NULL DEFAULT 1,
    `audienceJson` LONGTEXT NOT NULL DEFAULT '[]',
    `categorySlug` VARCHAR(191) NOT NULL DEFAULT '',
    `serviceSlug` VARCHAR(191) NOT NULL DEFAULT '',
    `effectiveDate` VARCHAR(191) NOT NULL DEFAULT '',
    `reviewDate` VARCHAR(191) NOT NULL DEFAULT '',
    `updatedBy` VARCHAR(191) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `KnowledgeDocument_sopCode_key`(`sopCode`),
    INDEX `KnowledgeDocument_scope_status_idx`(`scope`, `status`),
    INDEX `KnowledgeDocument_status_sopCode_idx`(`status`, `sopCode`),
    INDEX `KnowledgeDocument_categorySlug_idx`(`categorySlug`),
    INDEX `KnowledgeDocument_serviceSlug_idx`(`serviceSlug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KnowledgeDocumentRevision` (
    `id` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `title` TEXT NOT NULL,
    `description` TEXT NOT NULL DEFAULT '',
    `body` LONGTEXT NOT NULL DEFAULT '',
    `status` ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') NOT NULL,
    `audienceJson` LONGTEXT NOT NULL DEFAULT '[]',
    `updatedBy` VARCHAR(191) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `KnowledgeDocumentRevision_documentId_version_idx`(`documentId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `actor` VARCHAR(191) NOT NULL DEFAULT 'system',
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL DEFAULT '',
    `meta` VARCHAR(191) NOT NULL DEFAULT '{}',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entity_entityId_createdAt_idx`(`entity`, `entityId`, `createdAt`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteSetting` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'site',
    `json` VARCHAR(191) NOT NULL DEFAULT '{}',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AutomationRule` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL DEFAULT '',
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `priority` INTEGER NOT NULL DEFAULT 100,
    `trigger` ENUM('NEW_LEAD', 'HOT_LEAD', 'QUOTE_CREATED', 'QUOTE_SENT', 'QUOTE_ACCEPTED', 'QUOTE_REJECTED', 'BOOKING_REQUESTED', 'BOOKING_CONFIRMED', 'BOOKING_RESCHEDULED', 'WORK_ORDER_ASSIGNED', 'WORK_ORDER_STARTED', 'WORK_ORDER_COMPLETED', 'INVOICE_ISSUED', 'INVOICE_PAID', 'REVIEW_RECEIVED', 'LOW_RATING_REVIEW', 'QNA_RECEIVED', 'AMC_RENEWAL_APPROACHING') NOT NULL,
    `delaySeconds` INTEGER NOT NULL DEFAULT 0,
    `conditionsJson` LONGTEXT NOT NULL DEFAULT '[]',
    `actionsJson` LONGTEXT NOT NULL DEFAULT '[]',
    `ownerUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedBy` VARCHAR(191) NOT NULL DEFAULT '',

    UNIQUE INDEX `AutomationRule_key_key`(`key`),
    INDEX `AutomationRule_enabled_trigger_priority_idx`(`enabled`, `trigger`, `priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AutomationJob` (
    `id` VARCHAR(191) NOT NULL,
    `status` ENUM('pending', 'running', 'succeeded', 'failed', 'dead') NOT NULL DEFAULT 'pending',
    `trigger` ENUM('NEW_LEAD', 'HOT_LEAD', 'QUOTE_CREATED', 'QUOTE_SENT', 'QUOTE_ACCEPTED', 'QUOTE_REJECTED', 'BOOKING_REQUESTED', 'BOOKING_CONFIRMED', 'BOOKING_RESCHEDULED', 'WORK_ORDER_ASSIGNED', 'WORK_ORDER_STARTED', 'WORK_ORDER_COMPLETED', 'INVOICE_ISSUED', 'INVOICE_PAID', 'REVIEW_RECEIVED', 'LOW_RATING_REVIEW', 'QNA_RECEIVED', 'AMC_RENEWAL_APPROACHING') NOT NULL,
    `subjectType` VARCHAR(191) NOT NULL,
    `subjectId` VARCHAR(191) NOT NULL,
    `payloadJson` LONGTEXT NOT NULL DEFAULT '{}',
    `runAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `startedAt` DATETIME(3) NULL,
    `attempt` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 3,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `lastError` VARCHAR(191) NOT NULL DEFAULT '',
    `ruleId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AutomationJob_idempotencyKey_key`(`idempotencyKey`),
    INDEX `AutomationJob_status_runAt_idx`(`status`, `runAt`),
    INDEX `AutomationJob_status_startedAt_idx`(`status`, `startedAt`),
    INDEX `AutomationJob_trigger_subjectType_subjectId_idx`(`trigger`, `subjectType`, `subjectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AutomationRun` (
    `id` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `ruleId` VARCHAR(191) NULL,
    `trigger` ENUM('NEW_LEAD', 'HOT_LEAD', 'QUOTE_CREATED', 'QUOTE_SENT', 'QUOTE_ACCEPTED', 'QUOTE_REJECTED', 'BOOKING_REQUESTED', 'BOOKING_CONFIRMED', 'BOOKING_RESCHEDULED', 'WORK_ORDER_ASSIGNED', 'WORK_ORDER_STARTED', 'WORK_ORDER_COMPLETED', 'INVOICE_ISSUED', 'INVOICE_PAID', 'REVIEW_RECEIVED', 'LOW_RATING_REVIEW', 'QNA_RECEIVED', 'AMC_RENEWAL_APPROACHING') NOT NULL,
    `subjectType` VARCHAR(191) NOT NULL,
    `subjectId` VARCHAR(191) NOT NULL,
    `conditionPassed` BOOLEAN NOT NULL,
    `conditionDetailJson` LONGTEXT NOT NULL DEFAULT '[]',
    `actionsJson` LONGTEXT NOT NULL DEFAULT '[]',
    `ok` BOOLEAN NOT NULL,
    `error` TEXT NOT NULL DEFAULT '',
    `attempt` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AutomationRun_ruleId_createdAt_idx`(`ruleId`, `createdAt`),
    INDEX `AutomationRun_ok_createdAt_idx`(`ok`, `createdAt`),
    INDEX `AutomationRun_createdAt_idx`(`createdAt`),
    INDEX `AutomationRun_jobId_idx`(`jobId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OpsTask` (
    `id` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL DEFAULT 'generic',
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `title` TEXT NOT NULL,
    `dueAt` DATETIME(3) NULL,
    `assigneeStaffId` VARCHAR(191) NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'normal',
    `source` VARCHAR(191) NOT NULL DEFAULT 'automation',
    `subjectType` VARCHAR(191) NOT NULL,
    `subjectId` VARCHAR(191) NOT NULL,
    `ruleId` VARCHAR(191) NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `notes` TEXT NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OpsTask_idempotencyKey_key`(`idempotencyKey`),
    INDEX `OpsTask_status_dueAt_idx`(`status`, `dueAt`),
    INDEX `OpsTask_subjectType_subjectId_idx`(`subjectType`, `subjectId`),
    INDEX `OpsTask_assigneeStaffId_idx`(`assigneeStaffId`),
    INDEX `OpsTask_priority_idx`(`priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminNotification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `staffId` VARCHAR(191) NULL,
    `channel` TEXT NOT NULL DEFAULT 'in_app',
    `title` TEXT NOT NULL,
    `body` LONGTEXT NOT NULL DEFAULT '',
    `readAt` DATETIME(3) NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AdminNotification_idempotencyKey_key`(`idempotencyKey`),
    INDEX `AdminNotification_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `AdminNotification_staffId_createdAt_idx`(`staffId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContentGenerationJob` (
    `id` VARCHAR(191) NOT NULL,
    `kind` ENUM('diy_profile', 'service_canonical', 'service_location_locale', 'image_asset', 'sitemap_shard', 'arabic_locale', 'blog_article', 'engine_validate', 'diy_primary_mapping') NOT NULL,
    `status` ENUM('pending', 'running', 'succeeded', 'failed', 'dead') NOT NULL DEFAULT 'pending',
    `serviceId` VARCHAR(191) NULL,
    `locationId` VARCHAR(191) NULL,
    `serviceLocationId` VARCHAR(191) NULL,
    `locale` VARCHAR(191) NULL,
    `batchKey` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `generationVersion` INTEGER NOT NULL,
    `contentHash` VARCHAR(191) NULL,
    `attempt` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 3,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `error` TEXT NULL,
    `payloadJson` LONGTEXT NOT NULL DEFAULT '{}',
    `resultJson` LONGTEXT NOT NULL DEFAULT '{}',
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ContentGenerationJob_idempotencyKey_key`(`idempotencyKey`),
    INDEX `ContentGenerationJob_status_idx`(`status`),
    INDEX `ContentGenerationJob_kind_idx`(`kind`),
    INDEX `ContentGenerationJob_batchKey_idx`(`batchKey`),
    INDEX `ContentGenerationJob_updatedAt_idx`(`updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContentEngineManifest` (
    `id` VARCHAR(191) NOT NULL,
    `contentKey` VARCHAR(191) NOT NULL,
    `contentType` ENUM('SERVICE', 'SERVICE_LOCATION', 'DIY', 'BLOG', 'CATEGORY') NOT NULL,
    `locale` VARCHAR(191) NOT NULL DEFAULT 'en',
    `serviceSlug` VARCHAR(191) NULL,
    `locationSlug` VARCHAR(191) NULL,
    `diySlug` VARCHAR(191) NULL,
    `articleSlug` VARCHAR(191) NULL,
    `safetyClass` VARCHAR(191) NULL,
    `coverageRequired` BOOLEAN NOT NULL DEFAULT false,
    `required` BOOLEAN NOT NULL DEFAULT true,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `generationVersion` VARCHAR(191) NOT NULL DEFAULT '2026.09.10',
    `metaJson` LONGTEXT NOT NULL DEFAULT '{}',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ContentEngineManifest_contentType_idx`(`contentType`),
    INDEX `ContentEngineManifest_priority_idx`(`priority`),
    UNIQUE INDEX `ContentEngineManifest_contentKey_locale_generationVersion_key`(`contentKey`, `locale`, `generationVersion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContentEngineValidation` (
    `id` VARCHAR(191) NOT NULL,
    `manifestId` VARCHAR(191) NOT NULL,
    `passed` BOOLEAN NOT NULL DEFAULT false,
    `lifecycle` ENUM('DISCOVERED', 'QUEUED', 'GENERATING', 'GENERATED', 'VALIDATING', 'NEEDS_REWRITE', 'VALIDATED', 'READY_FOR_REVIEW', 'APPROVED', 'READY_TO_PUBLISH', 'PUBLISHED', 'BLOCKED_SAFETY', 'BLOCKED_COVERAGE', 'BLOCKED_QUALITY', 'BLOCKED_LOCALIZATION', 'BLOCKED_IMAGE', 'BLOCKED_DUPLICATE', 'BLOCKED_CLAIM', 'BLOCKED_SEO', 'BLOCKED_AEO', 'BLOCKED_GEO', 'BLOCKED_WORDS') NOT NULL DEFAULT 'VALIDATING',
    `scoreJson` LONGTEXT NOT NULL DEFAULT '{}',
    `issuesJson` LONGTEXT NOT NULL DEFAULT '[]',
    `wordCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContentEngineValidation_manifestId_createdAt_idx`(`manifestId`, `createdAt`),
    INDEX `ContentEngineValidation_passed_idx`(`passed`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContentEngineBatch` (
    `id` VARCHAR(191) NOT NULL,
    `batchKey` VARCHAR(191) NOT NULL,
    `generationVersion` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `costEstimateUsd` DOUBLE NOT NULL DEFAULT 0,
    `metaJson` LONGTEXT NOT NULL DEFAULT '{}',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ContentEngineBatch_batchKey_key`(`batchKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContentEngineRunItem` (
    `id` VARCHAR(191) NOT NULL,
    `batchId` VARCHAR(191) NOT NULL,
    `manifestId` VARCHAR(191) NOT NULL,
    `lifecycle` ENUM('DISCOVERED', 'QUEUED', 'GENERATING', 'GENERATED', 'VALIDATING', 'NEEDS_REWRITE', 'VALIDATED', 'READY_FOR_REVIEW', 'APPROVED', 'READY_TO_PUBLISH', 'PUBLISHED', 'BLOCKED_SAFETY', 'BLOCKED_COVERAGE', 'BLOCKED_QUALITY', 'BLOCKED_LOCALIZATION', 'BLOCKED_IMAGE', 'BLOCKED_DUPLICATE', 'BLOCKED_CLAIM', 'BLOCKED_SEO', 'BLOCKED_AEO', 'BLOCKED_GEO', 'BLOCKED_WORDS') NOT NULL DEFAULT 'QUEUED',
    `attempt` INTEGER NOT NULL DEFAULT 0,
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ContentEngineRunItem_lifecycle_idx`(`lifecycle`),
    UNIQUE INDEX `ContentEngineRunItem_batchId_manifestId_key`(`batchId`, `manifestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteShellDocument` (
    `id` VARCHAR(191) NOT NULL,
    `section` VARCHAR(191) NOT NULL,
    `status` ENUM('draft', 'review', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `payloadEn` LONGTEXT NOT NULL DEFAULT '{}',
    `payloadAr` LONGTEXT NOT NULL DEFAULT '{}',
    `updatedBy` VARCHAR(191) NOT NULL DEFAULT 'system',
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SiteShellDocument_section_key`(`section`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ServiceCategoryI18n` ADD CONSTRAINT `ServiceCategoryI18n_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ServiceCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Service` ADD CONSTRAINT `Service_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ServiceCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Service` ADD CONSTRAINT `Service_primaryDiyGuideId_fkey` FOREIGN KEY (`primaryDiyGuideId`) REFERENCES `DiyGuide`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceI18n` ADD CONSTRAINT `ServiceI18n_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Location` ADD CONSTRAINT `Location_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LocationI18n` ADD CONSTRAINT `LocationI18n_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceLocation` ADD CONSTRAINT `ServiceLocation_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceLocation` ADD CONSTRAINT `ServiceLocation_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceLocationI18n` ADD CONSTRAINT `ServiceLocationI18n_serviceLocationId_fkey` FOREIGN KEY (`serviceLocationId`) REFERENCES `ServiceLocation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceLocationRevision` ADD CONSTRAINT `ServiceLocationRevision_serviceLocationId_fkey` FOREIGN KEY (`serviceLocationId`) REFERENCES `ServiceLocation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DiyCategoryI18n` ADD CONSTRAINT `DiyCategoryI18n_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `DiyCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DiyGuide` ADD CONSTRAINT `DiyGuide_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `DiyCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DiyGuide` ADD CONSTRAINT `DiyGuide_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DiyGuideI18n` ADD CONSTRAINT `DiyGuideI18n_guideId_fkey` FOREIGN KEY (`guideId`) REFERENCES `DiyGuide`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DiyVote` ADD CONSTRAINT `DiyVote_guideId_fkey` FOREIGN KEY (`guideId`) REFERENCES `DiyGuide`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArticleI18n` ADD CONSTRAINT `ArticleI18n_articleId_fkey` FOREIGN KEY (`articleId`) REFERENCES `Article`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectI18n` ADD CONSTRAINT `ProjectI18n_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Faq` ADD CONSTRAINT `Faq_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Faq` ADD CONSTRAINT `Faq_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FaqI18n` ADD CONSTRAINT `FaqI18n_faqId_fkey` FOREIGN KEY (`faqId`) REFERENCES `Faq`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MediaAsset` ADD CONSTRAINT `MediaAsset_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `AiConversation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_visitorId_fkey` FOREIGN KEY (`visitorId`) REFERENCES `Visitor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Property` ADD CONSTRAINT `Property_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_visitorId_fkey` FOREIGN KEY (`visitorId`) REFERENCES `Visitor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadScore` ADD CONSTRAINT `LeadScore_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadScoreHistory` ADD CONSTRAINT `LeadScoreHistory_leadScoreId_fkey` FOREIGN KEY (`leadScoreId`) REFERENCES `LeadScore`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuoteItem` ADD CONSTRAINT `QuoteItem_quoteId_fkey` FOREIGN KEY (`quoteId`) REFERENCES `Quote`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_quoteId_fkey` FOREIGN KEY (`quoteId`) REFERENCES `Quote`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `WorkOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceItem` ADD CONSTRAINT `InvoiceItem_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffAiConversation` ADD CONSTRAINT `StaffAiConversation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffAiDailyUsage` ADD CONSTRAINT `StaffAiDailyUsage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffAiProposal` ADD CONSTRAINT `StaffAiProposal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffAiProposal` ADD CONSTRAINT `StaffAiProposal_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `StaffAiConversation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_visitorId_fkey` FOREIGN KEY (`visitorId`) REFERENCES `Visitor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_technicianId_fkey` FOREIGN KEY (`technicianId`) REFERENCES `Staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_supervisorId_fkey` FOREIGN KEY (`supervisorId`) REFERENCES `Staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inspection` ADD CONSTRAINT `Inspection_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrder` ADD CONSTRAINT `WorkOrder_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrder` ADD CONSTRAINT `WorkOrder_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrder` ADD CONSTRAINT `WorkOrder_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrder` ADD CONSTRAINT `WorkOrder_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AmcContract` ADD CONSTRAINT `AmcContract_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffSkill` ADD CONSTRAINT `StaffSkill_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `Staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_guideId_fkey` FOREIGN KEY (`guideId`) REFERENCES `DiyGuide`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_articleId_fkey` FOREIGN KEY (`articleId`) REFERENCES `Article`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `WorkOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_visitorId_fkey` FOREIGN KEY (`visitorId`) REFERENCES `Visitor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewVote` ADD CONSTRAINT `ReviewVote_reviewId_fkey` FOREIGN KEY (`reviewId`) REFERENCES `Review`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewInsight` ADD CONSTRAINT `ReviewInsight_reviewId_fkey` FOREIGN KEY (`reviewId`) REFERENCES `Review`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Question` ADD CONSTRAINT `Question_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Question` ADD CONSTRAINT `Question_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Question` ADD CONSTRAINT `Question_guideId_fkey` FOREIGN KEY (`guideId`) REFERENCES `DiyGuide`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Question` ADD CONSTRAINT `Question_articleId_fkey` FOREIGN KEY (`articleId`) REFERENCES `Article`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Question` ADD CONSTRAINT `Question_visitorId_fkey` FOREIGN KEY (`visitorId`) REFERENCES `Visitor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiConversation` ADD CONSTRAINT `AiConversation_visitorId_fkey` FOREIGN KEY (`visitorId`) REFERENCES `Visitor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VisitSession` ADD CONSTRAINT `VisitSession_visitorId_fkey` FOREIGN KEY (`visitorId`) REFERENCES `Visitor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnalyticsEvent` ADD CONSTRAINT `AnalyticsEvent_visitorId_fkey` FOREIGN KEY (`visitorId`) REFERENCES `Visitor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnalyticsEvent` ADD CONSTRAINT `AnalyticsEvent_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `VisitSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KnowledgeDocumentRevision` ADD CONSTRAINT `KnowledgeDocumentRevision_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `KnowledgeDocument`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AutomationJob` ADD CONSTRAINT `AutomationJob_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `AutomationRule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AutomationRun` ADD CONSTRAINT `AutomationRun_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `AutomationJob`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AutomationRun` ADD CONSTRAINT `AutomationRun_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `AutomationRule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OpsTask` ADD CONSTRAINT `OpsTask_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `AutomationRule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentEngineValidation` ADD CONSTRAINT `ContentEngineValidation_manifestId_fkey` FOREIGN KEY (`manifestId`) REFERENCES `ContentEngineManifest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentEngineRunItem` ADD CONSTRAINT `ContentEngineRunItem_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `ContentEngineBatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentEngineRunItem` ADD CONSTRAINT `ContentEngineRunItem_manifestId_fkey` FOREIGN KEY (`manifestId`) REFERENCES `ContentEngineManifest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

