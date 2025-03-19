-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetOtpExpiry" TIMESTAMP(3),
ADD COLUMN     "resetOtpHash" TEXT;
