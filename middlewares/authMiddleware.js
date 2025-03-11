// middleware/auth.js
const jwt = require('jsonwebtoken');

exports.verifyResetCookie = (req, res, next) => {
  const token = req.cookies.resetToken;

  if (!token) {
    return res.status(401).json({ message: "Authorization cookie manquante" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Cookie invalide ou expiré" });
    }
    req.userId = decoded.userId;
    next();
  });
};
