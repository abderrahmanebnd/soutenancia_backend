-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "customSkills" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetOtpExpiry" TIMESTAMP(3),
ADD COLUMN     "resetOtpHash" TEXT;
