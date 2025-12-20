const mongoose = require("mongoose");

const FacultySchema = new mongoose.Schema({
  id: String,
  name: String,
  department: String,
  timetableLocation: String,
  liveStatus: {
    availability: String,
    location: String,
    updatedAt: String
  }
});

module.exports = mongoose.model("Faculty", FacultySchema);
