const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY");
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
}

function isAdmin(req, res, next) {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Forbidden: Admin access required" });
  }
}

function isFaculty(req, res, next) {
  if (req.user && req.user.role === "faculty") {
    next();
  } else {
    res.status(403).json({ message: "Forbidden: Faculty access required" });
  }
}

function isStudent(req, res, next) {
  if (req.user && req.user.role === "student") {
    next();
  } else {
    res.status(403).json({ message: "Forbidden: Student access required" });
  }
}

module.exports = { auth, isAdmin, isFaculty, isStudent };
