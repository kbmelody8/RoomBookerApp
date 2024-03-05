const express = require("express");
const db = require('../models')
const router = express.Router()
const isAuthenticated = require("../controllers/isAuthenticated")
router.use(isAuthenticated)
require("dotenv").config();



//INDUCES

//INDEX route
router.get("/", isAuthenticated,  (req, res) => {
    db.Room.find({})
    .then (rooms=> {
        console.log(rooms)
        res.render("rooms.ejs",  {
            rooms: rooms,
            currentUser: req.session.currentUser 
        })
    })
    .catch(err => res.status(500).json({error: err.message}));
})


//SHOW route






/* Export these routes so that they are accessible in `server.js`
--------------------------------------------------------------- */
module.exports = router