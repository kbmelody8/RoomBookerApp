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


//SHOW route
// SHOW Route: Display details for a specific room
router.get("/:id", isAuthenticated, (req, res) => {
    db.Room.findById(req.params.id)
        .then(room => {

            const statusView = room.bookings.map(({ startTime, endTime }) => {
                let duration = Math.floor((new Date(endTime) - new Date(startTime)) / 1000 / 60)
                return (
                    { startTime, endTime, duration }
                )
            })

            const filtered = statusView.filter(({ startTime }) => {
                const today = new Date()
                const startDay = new Date(startTime)
                const todayPlusWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6)
                return today <= startDay && startDay <= todayPlusWeek

            })

            const sorted = [...filtered].sort((a, b) => {
                return new Date(a.startTime) - new Date(b.startTime)
            })
            let daysArray = [];
            let today = new Date();

            for (let i = 0; i < 7; i++) {
                let futureDate = new Date(today);
                futureDate.setDate(today.getDate() + i);

                let dayOfWeek = futureDate.toLocaleString('en-US', { weekday: 'long' }); 
                let date = futureDate.getDate();
                let month = futureDate.toLocaleString('en-US', { month: 'long' });

                daysArray.push({ dayOfWeek, date, month });
            }
            console.log(sorted)
            res.render("room-details.ejs", { room: {...room._doc, bookings: sorted}, graphic: daysArray, currentUser: req.session.currentUser });
        })
        .catch(err => {
            res.status(500).json({ error: err.message });
        });
});






/* Export these routes so that they are accessible in `server.js`
--------------------------------------------------------------- */
module.exports = router