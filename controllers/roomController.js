require("dotenv").config();
const express = require("express");
const db = require('../models')
const router = express.Router()
const isAuthenticated = require("../controllers/isAuthenticated")
router.use(isAuthenticated)

//INDUCES

//INDEX route
router.get("/", isAuthenticated, (req, res) => {
    db.Room.find({})
        .then(rooms => {
            res.render("rooms.ejs", {
                rooms: rooms,
                currentUser: req.session.currentUser
            })
        })
        .catch(err => res.status(500).json({ error: err.message }));
})


// SHOW Route: Display details for a specific room
router.get("/:id", isAuthenticated, (req, res) => {
    db.Room.findById(req.params.id)
    .then(room => {
        res.render("room-details.ejs", { room: room, currentUser: req.session.currentUser});
    })
    .catch(err => {
        res.status(500).json({error: err.message});
    });
});


/* Export these routes so that they are accessible in `server.js`
--------------------------------------------------------------- */
module.exports = router

