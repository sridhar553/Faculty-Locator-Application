const mongoose = require("mongoose");

const FacultySchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: String,
  department: String,
  timetableLocation: String,

  // AUTH FIELDS
  password: String,
  role: { type: String, default: "faculty" },

  liveStatus: {
    availability: String,
    location: String,
    updatedAt: String
  }
});

module.exports = mongoose.model("Faculty", FacultySchema);


