const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
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
        required: true,
        enum: [5, 10, 15, 20, 25, 30, 35, 40, 50]
    },
    bookedStatus: {
        type: Boolean,
        required: true
    },
    bookings: [{
        type: mongoose.ObjectId,
        ref: "Booking"
    }],
    photo: {
        type: String,
        required: true
    },
});

module.exports = mongoose.model("Room", roomSchema);
