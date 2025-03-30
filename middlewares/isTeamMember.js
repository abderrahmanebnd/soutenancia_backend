const prisma = require("../prisma/prismaClient");

const isTeamMember = async (req, res, next) => {
  try {
    const { teamOfferId } = req.params;
    const studentId = req.user.Student.id;

    
    const teamOffer = await prisma.teamOffer.findUnique({
      where: { id: teamOfferId }
    });

    if (!teamOffer) {
      return res.status(404).json({ error: "Offre d'équipe introuvable" });
    }

   
    if (teamOffer.leader_id === studentId) {
      return next();
    }

    
    const isMember = await prisma.teamMember.findFirst({
      where: { teamOfferId, studentId }
    });

    if (!isMember) {
      return res.status(403).json({ error: "you are not a memeber of the team" });
    }

    next();
  } catch (error) {
    console.error("Erreur isTeamMember:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};

module.exports = isTeamMember;