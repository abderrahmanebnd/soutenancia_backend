/*
  Warnings:

  - Added the required column `speciality` to the `TeamOffer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `TeamOffer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TeamOffer" ADD COLUMN     "speciality" VARCHAR(40) NOT NULL,
ADD COLUMN     "year" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "TeamOffer_year_speciality_idx" ON "TeamOffer"("year", "speciality");
