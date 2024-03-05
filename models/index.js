//First, we need to connect our Express app to MongoDB.
// This file will define the mongoose connection to the mongodbatlas database
const mongoose = require("mongoose")
const axios = require("axios");
const MONGODBURI = process.env.MONGODBURI
require("dotenv").config()
//const models = require("./models");
// Connect to MongoDB Atlas
// use mongoose to connect to our mongodb URI ( the serve string) - Will move this soon to a .env file
// this uri string should be stored in a .env file, lets do that
mongoose.connect(MONGODBURI);


// connect and notify the developer we are ready to go
const db = mongoose.connection;


db.on("connected", function() {
    console.log(`Connected to MongoDB @{db.name} at ${db.host}: $db.port`)
})

module.exports = {
    Employee: require("./Employee"),
    Booking: require("./Booking"),
    Room: require("./Room"),
    seedRooms: require("../seed/roomseed")
}
