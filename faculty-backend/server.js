const express = require("express");

const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(cors());
app.use(express.json());

// Inject socket io into routes
app.use((req, res, next) => {
  req.io = io;
  next();
});



app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/faculty", require("./routes/facultyRoutes"));
app.use("/api/config", require("./routes/configRoutes"));

const jwt = require("jsonwebtoken");

io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    socket.user = { role: "student" };
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY");
    socket.user = decoded;
    next();
  } catch (err) {
    // If token is invalid, we could still allow as student or reject
    socket.user = { role: "student" };
    next();
  }
});

io.on("connection", (socket) => {
  console.log("A secure user connected:", socket.user.role);

  // Join role-specific rooms if needed
  if (socket.user.role) socket.join(socket.user.role);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
});

// Serve frontend static files
const path = require("path");
app.use(express.static(path.join(__dirname, "../faculty-locator/dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../faculty-locator/dist/index.html"));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

