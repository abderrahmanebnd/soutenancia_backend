const prisma = require("../prisma/prismaClient");


const isTeamLeader = async (req, res, next) => {
  try {
    const { teamOfferId } = req.params;
    const studentId = req.user.Student.id;

    const teamOffer = await prisma.teamOffer.findUnique({
      where: { id: teamOfferId }
    });

    if (!teamOffer) {
      return res.status(404).json({ error: "Offre d'équipe introuvable" });
    }

    if (teamOffer.leader_id !== studentId) {
      return res.status(403).json({ error: "Accès réservé au leader" });
    }

    next();
  } catch (error) {
    console.error("Erreur isTeamLeader:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};

module.exports = isTeamLeader;