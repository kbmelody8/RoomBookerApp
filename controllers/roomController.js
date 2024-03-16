// Load environment variables from the .env file
require("dotenv").config()
const express = require("express")
const db = require('../models')
const router = express.Router()
// Middleware to check if an employee is authenticated before allowing access to certain routes
const isAuthenticated = require("../controllers/isAuthenticated")
// Apply isAuthenticated middleware to all routes in this router to ensure only authenticated employees have access
router.use(isAuthenticated)

//INDUCES

// INDEX route: List all rooms
router.get("/", isAuthenticated, (req, res) => {
    db.Room.find({})
        .then(rooms => {
            res.render("rooms.ejs", {
                rooms: rooms,
                currentUser: req.session.currentUser
            })
        })
        .catch(err => res.status(500).json({ error: err.message }))
})


// SHOW Route: Display details for a specific room
router.get("/:id", isAuthenticated, (req, res) => {
    db.Room.findById(req.params.id)
        .then(room => {
            res.render("room-details.ejs", { room: room, currentUser: req.session.currentUser })
        })
        .catch(err => {
            res.status(500).json({ error: err.message })
        })
})


/* Export these routes so that they are accessible in `server.js`
--------------------------------------------------------------- */
module.exports = router
