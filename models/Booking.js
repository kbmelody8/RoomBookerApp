const mongoose = require("mongoose")

const bookingSchema = new mongoose.Schema({
  room: {
    type: mongoose.ObjectId,
    ref: "Room",
    required: true
  },
  bookerId: {
    type: mongoose.ObjectId,
    ref: 'Employee',
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  participants: [{
    type: mongoose.ObjectId,
    ref: "Employee"
  }]
  
});


module.exports = mongoose.model("Booking", bookingSchema);
