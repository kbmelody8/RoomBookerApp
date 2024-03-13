require("dotenv").config();
const { DateTime } = require('luxon');
const express = require("express");
const db = require('../models')
const router = express.Router()
const isAuthenticated = require("../controllers/isAuthenticated")
router.use(isAuthenticated)



// INDEX - see all their bookings
router.get("/", isAuthenticated, (req, res) => {
    db.Booking.find({ bookerId: req.session.currentUser._id })
        .then(bookings => {
            // Convert each booking into a promise that resolves to the booking with participant names.
            const bookingPromises = bookings.map(async (item) => {
                // Await the resolution of all participant name fetches for this booking.
                const room = await db.Room.findById(item.room)
                const participantNames = await Promise.all(item.participants.map(async (participantId) => {
                    const participant = await db.Employee.findById(participantId); // Correctly await the document.
                    if (participant) {
                        return `${participant.firstName[0].toUpperCase()}${participant.firstName.slice(1)} ${participant.lastName[0].toUpperCase()}${participant.lastName.slice(1)}`;
                    } else {
                        return 'Unknown Participant';
                    }
                }));

                // Return a new object that spreads the original item and updates participants to a string
                return { ...item._doc, participants: participantNames.join(", "), room: room.room };
            });

            // Await the resolution of all modified bookings.
            Promise.all(bookingPromises)
                .then(modifiedBookings => {
                    res.render("bookings.ejs", { bookings: modifiedBookings, currentUser: req.session.currentUser });
                })
                .catch(error => {
                    console.error("Error processing bookings:", error);
                });
        })
        .catch(error => {
            res.status(500).send(error.message);
        });
});

// // NEW - show form to make new bookings
router.get("/new", isAuthenticated, (req, res) => {
    db.Room.find({})
        .then(rooms => {
            res.render("new-booking.ejs", { rooms: rooms, currentUser: req.session.currentUser })
        })
        .catch(error => {
            res.status(500).send(error.message)
        })
})

// DELETE - delete a particular booking, then redirect
router.delete("/:id", isAuthenticated, (req, res) => {
    db.Booking.findByIdAndDelete(req.params.id)
        .then(() => {
            res.redirect("/booking")
        })
        .catch(error => {
            res.status(500).send(error.message)
        })
})

//WORKED ON DEBUGGING
// UPDATE - update the existing booking, then redirect
router.put("/:id", isAuthenticated, async (req, res) => {
    //Luxon
    const timeZone = "local"
    //Extracting booking date
    const updatedBooking = {
        room: req.body.room,
        bookerId: req.session.currentUser._id,
        // startTime: req.body.startTime,
        // endTime: req.body.endTime,
        //luxon
        startTime: DateTime.fromISO(req.body.startTime, { zone: timeZone }).toUTC().toISO(),
        endTime: DateTime.fromISO(req.body.endTime, { zone: timeZone }).toUTC().toISO(),
        subject: req.body.subject,
    };
    updatedBooking.participants = await Promise.all(req.body.participants.split(',').map(async (participant) => {

        let lastName = participant.trim().split(" ")[1];
        lastName = lastName[0].toUpperCase() + lastName.slice(1).toLowerCase()
        const colleague = await db.Employee.findOne({ lastName: lastName });
        return colleague ? colleague._id : null;
    }));
 
    updatedBooking.participants = updatedBooking.participants.filter(id => id !== null); // Remove any nulls if colleague wasn't found
    // }
    updatedBooking.participants = [req.session.currentUser._id, ...updatedBooking.participants]
    
    //debugged and added await so that editting would be submitted properly
    await db.Booking.findByIdAndUpdate(req.params.id, updatedBooking, { new: true })
    res.redirect("/booking")
})


// CREATE - add a new booking, then redirect
// POST route to handle form submission and create a new booking
router.post('/', isAuthenticated, async (req, res) => {
    // Extracting booking data
    const newBooking = {
        room: req.body.room,
        bookerId: req.session.currentUser._id,
        // startTime: req.body.startTime,
        // endTime: req.body.endTime,
        //Luxon 
        startTime: DateTime.fromISO(req.body.startTime, { zone: timeZone }).toUTC().toISO(),
        endTime: DateTime.fromISO(req.body.endTime, { zone: timeZone }).toUTC().toISO(), 
        subject: req.body.subject,
    };
    newBooking.participants = await Promise.all(req.body.participants.split(',').map(async (participant) => {
        let lastName = participant.trim().split(" ")[1];
        lastName = lastName[0].toUpperCase() + lastName.slice(1).toLowerCase()
        const colleague = await db.Employee.findOne({ lastName: lastName });
        return colleague ? colleague._id : null;
    }));
    newBooking.participants = newBooking.participants.filter(id => id !== null); // Remove any nulls if colleague wasn't found
    // } //will debug later - only works with DB employees, but it's an optional field , smth wrong w null
    newBooking.participants = [req.session.currentUser._id, ...newBooking.participants]
    const book = await db.Booking.create(newBooking)
    res.redirect('/booking')// Redirect to /booking to see the list of all bookings or to the newly created booking's detail page
});


// EDIT - show edit form of a particular booking
router.get("/:id/edit", isAuthenticated, (req, res) => {
    db.Booking.findById(req.params.id)
        .then(booking => {
            //original booking times
            console.log("Original Booking Times:", booking.startTime, booking.endTime);

                    // Luxon convert the times right after retrieving the booking
        const timeZone = "America/New_York"; 
        // booking.startTime = DateTime.fromISO(booking.startTime).setZone(timeZone).toFormat('yyyy-LL-dd\'T\'HH:mm');
        // booking.endTime = DateTime.fromISO(booking.endTime).setZone(timeZone).toFormat('yyyy-LL-dd\'T\'HH:mm');
        
        console.log("Converted startTime:", booking.startTime);
        console.log("Converted endTime:", booking.endTime);
            db.Room.find({})
                .then(rooms => {
                            Promise.all(booking.participants.map(async (participantId) => {
                                const participant = await db.Employee.findById(participantId); // Correctly await the document
                                if (participant) {
                                    return `${participant.firstName[0].toUpperCase()}${participant.firstName.slice(1)} ${participant.lastName[0].toUpperCase()}${participant.lastName.slice(1)}`;
                                } else {
                                    return 'Unknown Participant';
                                }
                            }))
                                .then(participantNames => {
                                    // Return a new object that spreads the original item and updates participants to a string.
                                    booking = { ...booking._doc, 
                                        participants: participantNames.join(", ")
                                    };
                                 
                                   
                                    res.render("edit-booking.ejs", { booking: booking, rooms: rooms, currentUser: req.session.currentUser })
                                })
                        })
                        .catch(error => {
                            console.error("Error processing bookings:", error);
                            
                        });

        })
        .catch(error => {
            res.status(500).send(error.message)
        })
})

// SHOW - details of the bookings - //update and deletion
router.get("/:id", isAuthenticated, (req, res) => {
    db.Booking.findById(req.params.id)
        .then(bookings => {
            // Log the original booking times
            console.log("Original Booking Times:", bookings.startTime, bookings.endTime);
                        // Luxon Convert startTime and endTime 
                        const timeZone = 'America/New_York'; 
                        bookings.startTime = DateTime.fromISO(bookings.startTime).setZone(timeZone).toFormat("yyyy-LL-dd'T'HH:mm");
                        bookings.endTime = DateTime.fromISO(bookings.endTime).setZone(timeZone).toFormat("yyyy-LL-dd'T'HH:mm");
            // Await the resolution of all participant name fetches for this booking
            console.log("Converted startTime:", bookings.startTime);
            console.log("Converted endTime:", bookings.endTime);
            db.Room.findById(bookings.room)
                .then(room => {
                    Promise.all(bookings.participants.map(async (participantId) => {
                        const participant = await db.Employee.findById(participantId); // Correctly await the document.
                        if (participant) {
                            return `${participant.firstName[0].toUpperCase()}${participant.firstName.slice(1)} ${participant.lastName[0].toUpperCase()}${participant.lastName.slice(1)}`;
                        } else {
                            return 'Unknown Participant';
                        }
                    }))
                        .then(participantNames => {
                            // Return a new object that spreads the original item and updates participants to a string.
                            bookings = { ...bookings._doc, participants: participantNames.join(", "), room: room.room };
                            res.render("details-booking.ejs", { booking: bookings, currentUser: req.session.currentUser })
                        })
                        .catch(error => {
                            console.error("Error processing bookings:", error);
                        });
                })



        })
        .catch(error => {
            res.status(500).send(error.message)
        })
})




/* Export these routes so that they are accessible in `server.js`
--------------------------------------------------------------- */
module.exports = router