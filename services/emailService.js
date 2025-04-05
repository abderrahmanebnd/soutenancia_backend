const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Ton adresse Gmail
    pass: process.env.EMAIL_PASSWORD, // Ton mot de passe d'application Gmail
  },
});

exports.sendOTP = async (email, otp) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Code de vérification pour réinitialiser votre mot de passe",
      html: `
        <h1>Réinitialisation de mot de passe</h1>
        <p>Voici votre code de vérification à 4 chiffres :</p>
        <h2 style="letter-spacing: 5px; font-size: 24px;">${otp}</h2>
        <p>Ce code est valable pendant 15 minutes.</p>
        <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Email envoyé avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email:", error);
    throw new Error("Erreur lors de l'envoi de l'email");
  }
};

exports.sendEmailApplication = async (status, application) => {
  try {
    const {
      student: { user },
      teamOffer,
    } = application;
    const teamName = teamOffer.title;

    let subject, htmlContent;
    const teamTitle = teamOffer.title;
    const fullName = `${user.firstName} ${user.lastName}`;
    const baseStyle = `
    <style>
        .container { max-width: 600px; margin: 20px auto; padding: 30px; font-family: Arial, sans-serif; }
        .header { color: ${
          status === "accepted" ? "#2ecc71" : "#e74c3c"
        }; text-align: center; }
        .content { margin: 25px 0; line-height: 1.6; color: #333; }
        .signature { margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    `;

    if (status === "accepted") {
      subject = "🎉 Congratulations! Your Application Has Been Accepted";
      htmlContent = `<!DOCTYPE html>
    <html>
    <head>${baseStyle}</head>
    <body>
      <div class="container">
        <h1 class="header">Application Accepted</h1>
        <div class="content">
          <p>Dear ${fullName},</p>
          <p>We are pleased to inform you that your application has been <span style="color: #2ecc71;">accepted</span>!</p>
          <p>Welcome to the team!</p>
        </div>
        <div class="signature">
          <p>Best regards,</p>
          <p>The Team Platform</p>
        </div>
      </div>
    </body>
    </html>
  `;
    } else {
      subject = `Application Update: Your Application for "${teamTitle}"`;
      htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>${baseStyle}</head>
      <body>
        <div class="container">
          <h1 class="header">Application Status</h1>
          <div class="content">
            <p>Dear ${fullName},</p>
            <p>Thank you for your interest for our team.</p>
            <p>After careful consideration, we regret to inform you that we cannot proceed with your application at this time.</p>
            <p>We encourage you to explore other opportunities on our platform.</p>
          </div>
          <div class="signature">
            <p>Best regards,</p>
            <p>The Team Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject,
      html: htmlContent,
    });

    console.log(`"${status}" email sent to ${user.email}`);
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email:", error);
    throw new Error("Erreur lors de l'envoi de l'email");
  }
};
