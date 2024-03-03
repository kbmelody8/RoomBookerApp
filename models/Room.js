const mongoose = require('mongoose');

const meetingRoomSchema = new mongoose.Schema({
    room: {
        type: String,
        required: true,
        enum: ["Astana", "Tokyo", "New York", "Paris", "London", "Sydney", "Prague", 'Singapore', 'Dubai', 'Rome'] 
    },
    floor: {
        type: Number,
        required: true,
        enum: [1, 2]
    },
    capacity: {
        type: Number,
        required: true
    },
    booked: {
        type: Boolean,
        required: true
    },
    bookings: [{
        type: mongoose.ObjectId,
        ref: "Booking"
    }]
});

module.exports = mongoose.model("MeetingRoom", meetingRoomSchema);
