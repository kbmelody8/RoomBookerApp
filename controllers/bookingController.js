require("dotenv").config();
const express = require("express");
const db = require('../models')
const router = express.Router()
const isAuthenticated = require("../controllers/isAuthenticated")
router.use(isAuthenticated)


//INDEX  - logged in employee can see all their bookings
router.get("/", isAuthenticated, (req, res) => {
    db.Booking.find({ bookerId: req.session.currentUser._id })
.populate('room') //ref room document
    .then(bookings => {
        res.render("bookings.ejs", { bookings });
    })
    .catch(error => {
        res.status(500).send(error.message);
    });
});



/* Export these routes so that they are accessible in `server.js`
--------------------------------------------------------------- */
module.exports = router