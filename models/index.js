// Load environment variables from .env file
require("dotenv").config()
// Import mongoose to interact with MongoDB
const mongoose = require("mongoose")
// Import axios for making HTTP requests
const axios = require("axios")
// Retrieve MongoDB connection URI from environment variables
const MONGODBURI = process.env.MONGODBURI
// Connect to MongoDB 
mongoose.connect(MONGODBURI)
const db = mongoose.connection

// Event listener for successful connection to MongoDB
db.on("connected", function() {
    console.log(`Connected to MongoDB @{db.name} at ${db.host}: $db.port`)
})
// Export the models and seed data for use in other parts of Room-Booker application
module.exports = {
    Employee: require("./Employee"),
    Booking: require("./Booking"),
    Room: require("./Room"),
    seedRooms: require("../seed/roomseed")
}
