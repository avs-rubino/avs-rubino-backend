const admin = require("../config/firebase");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    if (decodedToken.role !== 'Super_Admin' && decodedToken.role !== 'Editor_Admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = authMiddleware;
