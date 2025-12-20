const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect("mongodb://127.0.0.1:27017/faculty_locator")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

app.use("/api/faculty", require("./routes/facultyRoutes"));

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});

