-- DropForeignKey
ALTER TABLE "Skill" DROP CONSTRAINT "Skill_teamOfferId_fkey";

-- CreateTable
CREATE TABLE "_SkillToTeamOffer" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SkillToTeamOffer_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_SkillToTeamOffer_B_index" ON "_SkillToTeamOffer"("B");

-- AddForeignKey
ALTER TABLE "_SkillToTeamOffer" ADD CONSTRAINT "_SkillToTeamOffer_A_fkey" FOREIGN KEY ("A") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SkillToTeamOffer" ADD CONSTRAINT "_SkillToTeamOffer_B_fkey" FOREIGN KEY ("B") REFERENCES "TeamOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
