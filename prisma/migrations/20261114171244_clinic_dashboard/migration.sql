-- AlterTable
ALTER TABLE "Mother" ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "consentRecordedById" TEXT;

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "contactNo" INTEGER,
ADD COLUMN     "gestationWeek" INTEGER;

-- AlterTable
ALTER TABLE "RiskFlag" ADD COLUMN     "code" TEXT,
ADD COLUMN     "referralId" TEXT,
ADD COLUMN     "resolutionNote" TEXT,
ADD COLUMN     "resolvedById" TEXT;

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "motherId" TEXT NOT NULL,
    "fromFacilityId" TEXT NOT NULL,
    "toFacilityId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "visitId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Referral_motherId_idx" ON "Referral"("motherId");

-- CreateIndex
CREATE INDEX "Referral_fromFacilityId_idx" ON "Referral"("fromFacilityId");

-- CreateIndex
CREATE INDEX "Referral_toFacilityId_idx" ON "Referral"("toFacilityId");

-- CreateIndex
CREATE INDEX "Mother_facilityId_riskLevel_idx" ON "Mother"("facilityId", "riskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "Visit_motherId_kind_contactNo_key" ON "Visit"("motherId", "kind", "contactNo");

-- CreateIndex
CREATE INDEX "RiskFlag_referralId_idx" ON "RiskFlag"("referralId");

-- AddForeignKey
ALTER TABLE "RiskFlag" ADD CONSTRAINT "RiskFlag_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Mother"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_fromFacilityId_fkey" FOREIGN KEY ("fromFacilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_toFacilityId_fkey" FOREIGN KEY ("toFacilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

