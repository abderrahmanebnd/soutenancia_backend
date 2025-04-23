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
    const fullName = `${user.firstName} ${user.lastName}`;

    const containerStyle =
      "max-width: 600px; margin: 20px auto; padding: 30px; font-family: Arial, sans-serif;";
    const headerStyle = `color: ${
      status === "accepted" ? "#2ecc71" : "#e74c3c"
    }; text-align: center; margin-bottom: 25px;`;
    const contentStyle =
      "margin: 25px 0; line-height: 1.6; color: #333; font-size: 16px;";
    const signatureStyle =
      "margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; color: #666;";

    if (status === "accepted") {
      subject = "🎉 Congratulations! Your Application Has Been Accepted";
      htmlContent = `
      <div style="${containerStyle}">
        <h1 style="${headerStyle}">Application Accepted</h1>
        <div style="${contentStyle}">
          <p>Dear ${fullName},</p>
          <p>We are pleased to inform you that your application for <strong>${teamName}</strong> has been <span style="color: #2ecc71;">accepted</span>!</p>
          <p>Welcome to the team! You can now access the collaboration space through your dashboard.</p>
        </div>
        <div style="${signatureStyle}">
          <p>Best regards,</p>
          <p>The Team Platform</p>
        </div>
      </div>
    `;
    } else {
      subject = `Application Update: Your Application for "${teamName}"`;
      htmlContent = `
        <div style="${containerStyle}">
          <h1 style="${headerStyle}">Application Status</h1>
          <div style="${contentStyle}">
            <p>Dear ${fullName},</p>
            <p>Thank you for your interest in <strong>${teamName}</strong>.</p>
            <p>After careful consideration, we regret to inform you that we cannot proceed with your application at this time.</p>
            <p>We encourage you to explore other opportunities on our platform.</p>
          </div>
          <div style="${signatureStyle}">
            <p>Best regards,</p>
            <p>The Team Platform</p>
          </div>
        </div>
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

exports.sendEmailToLeader = async (
  application,
  leaderEmail,
  leaderName,
  studentName
) => {
  try {
    const { teamOffer } = application;
    const teamName = teamOffer.title;

    const subject = `🔔 New Application For Your Offer "${teamName}"`;
    const containerStyle =
      "max-width: 600px; margin: 20px auto; padding: 30px; font-family: Arial, sans-serif;";
    const headerStyle =
      "color: #3498db; text-align: center; margin-bottom: 25px;";
    const contentStyle =
      "margin: 25px 0; line-height: 1.6; color: #333; font-size: 16px;";
    const signatureStyle =
      "margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; color: #666;";

    const htmlContent = `
      <div style="${containerStyle}">
        <h1 style="${headerStyle}">New Application</h1>
        <div style="${contentStyle}">
          <p>Dear ${leaderName},</p>
          <p>A new application has been submitted for your team offer <strong>${teamName}</strong>.</p>
          <p>The student <strong>${studentName}</strong> would like to join your team.</p>
          <p>You can review this application and make a decision through your dashboard.</p>
        </div>
        <div style="${signatureStyle}">
          <p>Best regards,</p>
          <p>The Soutenancia Platform</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: leaderEmail,
      subject,
      html: htmlContent,
    });
    console.log(`email sent to ${leaderEmail}`);
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email:", error);
    throw new Error("Erreur lors de l'envoi de l'email");
  }
};

exports.EmailToDeletedStudent = async (
  studentEmail,
  studentName,
  teamOfferName,
  leaderName
) => {
  try {
    const subject = `Information regarding the team "${teamOfferName}"`;

    const containerStyle =
      "max-width: 600px; margin: 20px auto; padding: 30px; font-family: Arial, sans-serif;";
    const headerStyle =
      "color: #e67e22; text-align: center; margin-bottom: 25px;";
    const contentStyle =
      "margin: 25px 0; line-height: 1.6; color: #333; font-size: 16px;";
    const signatureStyle =
      "margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; color: #666;";

    const htmlContent = `
      <div style="${containerStyle}">
        <h1 style="${headerStyle}">Change in your team</h1>
        <div style="${contentStyle}">
          <p>Dear ${studentName},</p>
          <p>We inform you that you are no longer a member of the team <strong>"${teamOfferName}"</strong>.</p>
          <p>This decision was made by the team leader, ${leaderName}.</p>
          <p>You can now apply to other team offers on the platform. Your previous applications that had been automatically canceled have been reactivated if the concerned teams still have available spots.</p>
        </div>
        <div style="${signatureStyle}">
          <p>Best regards,</p>
          <p>The Soutenancia platform</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: studentEmail,
      subject,
      html: htmlContent,
    });

    console.log(`Removal notification email sent to ${studentEmail}`);
  } catch (error) {
    console.error("❌ Error while sending removal email:", error);
    throw new Error("Error while sending removal email");
  }
};

exports.sendProjectApplicationNotification = async (
  teacherEmail,
  teacherName,
  projectTitle,
  studentName,
  teamTitle
) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: teacherEmail,
      subject: `New application for your project: ${projectTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Project Application</h2>
          <p>Hello ${teacherName},</p>
          <p>You have received a new application for your project <strong>${projectTitle}</strong>.</p>
          <p><strong>Details:</strong></p>
          <ul>
            <li>Team: ${teamTitle}</li>
            <li>Team Leader: ${studentName}</li>
          </ul>
          <p>Please log in to the platform to review this application and make a decision.</p>
          <p>Best regards,<br>The Soutenancia Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error(
      "Error sending project application notification email:",
      error
    );
    return false;
  }
};

exports.sendProjectApplicationAccepted = async (
  studentEmail,
  studentName,
  projectTitle
) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: studentEmail,
      subject: `Application accepted for the project: ${projectTitle}`,
      html: `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Congratulations! Your application has been accepted</h2>
    <p>Hello ${studentName},</p>
    <p>We are pleased to inform you that your application for the project <strong>${projectTitle}</strong> has been accepted!</p>
    <p>Your team can now start working on this project. More details are available on the platform.</p>
    <p>Best regards,<br>The Soutenancia Team</p>
  </div>
`,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending project application accepted email:", error);
    return false;
  }
};
exports.sendProjectApplicationRejected = async (
  studentEmail,
  studentName,
  projectTitle
) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: studentEmail,
      subject: `Application rejected for the project: ${projectTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Information about your application</h2>
          <p>Hello ${studentName},</p>
          <p>We regret to inform you that your application for the project <strong>${projectTitle}</strong> was not accepted.</p>
          <p>We encourage you to apply to other available projects on the platform.</p>
          <p>Best regards,<br>The Soutenancia Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending project application rejected email:", error);
    return false;
  }
};
