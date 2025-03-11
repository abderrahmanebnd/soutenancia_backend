const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Ton adresse Gmail
    pass: process.env.EMAIL_PASSWORD // Ton mot de passe d'application Gmail
  }
});

exports.sendOTP = async (email, otp) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Code de vérification pour réinitialiser votre mot de passe',
      html: `
        <h1>Réinitialisation de mot de passe</h1>
        <p>Voici votre code de vérification à 4 chiffres :</p>
        <h2 style="letter-spacing: 5px; font-size: 24px;">${otp}</h2>
        <p>Ce code est valable pendant 15 minutes.</p>
        <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Email envoyé avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email:", error);
    throw new Error("Erreur lors de l'envoi de l'email");
  }
};
