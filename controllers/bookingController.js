require("dotenv").config();
const { DateTime } = require('luxon');
const express = require("express");
const db = require('../models')
const router = express.Router()
const isAuthenticated = require("../controllers/isAuthenticated")
router.use(isAuthenticated)


// INDEX - see all their bookings
router.get("/", isAuthenticated, (req, res) => {
    // Execute both find operations in parallel to fetch bookings where the current user is either the booker or a participant.
    Promise.all([
        db.Booking.find({ bookerId: req.session.currentUser._id }), // Fetch bookings where the user is the booker
        db.Booking.find({ participants: req.session.currentUser._id }) // Fetch bookings where the user is a participant
    ])
    .then(([bookingsAsBooker, bookingsAsParticipant]) => {
        // Initialize a Set to keep track of unique booking IDs and an array to store the combined bookings
        const allBookingsSet = new Set();
        const allRelevantBookings = [];

        // Combine bookings from both queries and filter out duplicates by checking against the Set
        [...bookingsAsBooker, ...bookingsAsParticipant].forEach(booking => {
            const bookingIdStr = booking._id.toString(); // Convert ObjectId to string for comparison
            if (!allBookingsSet.has(bookingIdStr)) {
                allBookingsSet.add(bookingIdStr); // Mark this booking ID as seen
                allRelevantBookings.push(booking); // Add to the combined list of unique bookings
            }
        });
        // Process the deduplicated list of bookings to include participant names and room details
        const bookingPromises = allRelevantBookings.map(async (item) => {
            // Find the room details for each booking
            const room = await db.Room.findById(item.room);
            // Fetch the names of all participants for each booking
            const participantNames = await Promise.all(item.participants.map(async (participantId) => {
                const participant = await db.Employee.findById(participantId);
                // Format participant names, falling back to 'Unknown Participant' if not found
                if (participant) {
                    return `${participant.firstName[0].toUpperCase()}${participant.firstName.slice(1)} ${participant.lastName[0].toUpperCase()}${participant.lastName.slice(1)}`;
                } else {
                    return 'Unknown Participant';
                }
            }));
            // Return the booking object with enhanced participant names and room details
            return { ...item._doc, participants: participantNames.join(", "), room: room.room };
        });

        // Resolve all promises to get the fully processed bookings and render the bookings page
        Promise.all(bookingPromises)
            .then(modifiedBookings => {
                // Render the template with the list of processed bookings for the current user
                res.render("bookings.ejs", { bookings: modifiedBookings, currentUser: req.session.currentUser });
            })
            .catch(error => {
                // Handle any errors during the booking processing
                console.error("Error processing bookings:", error);
            });
    })
    .catch(error => {
        // Handle errors from the initial booking fetch operations
        console.error("Error fetching bookings:", error);
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
    db.Booking.findById(req.params.id)
        .then((booking) => {
            // Check if the currently logged-in user is the one who created the booking
            if (booking.bookerId.toString() !== req.session.currentUser._id.toString()) {
                // If not, redirect them with an error message or to a different page
                return res.send("Unauthorized: You can only delete bookings you have created.");
            }

            // If authorized, proceed with deletion
            db.Booking.findByIdAndDelete(req.params.id)
                .then(() => {
                    res.redirect("/booking");
                })
                .catch(error => {
                    res.status(500).send(error.message);
                });
        })
        .catch(error => {
            res.status(500).send("Booking not found.");
        });
});


// // UPDATE - update the existing booking, then redirect
// router.put("/:id", isAuthenticated, async (req, res) => {
//     //Luxon
//     const timeZone = "local"
//         // Convert start and end times to UTC for comparison
//         const startTimeUTC = DateTime.fromISO(req.body.startTime, { zone: timeZone }).toUTC().toISO();
//         const endTimeUTC = DateTime.fromISO(req.body.endTime, { zone: timeZone }).toUTC().toISO();
    
//         // Check for overlapping bookings
//         const overlappingBookings = await db.Booking.find({
//             room: req.body.room,
//             $or: [
//                 { startTime: { $lte: new Date(endTimeUTC) }, endTime: { $gte: new Date(startTimeUTC) } },
//                 { endTime: { $gte: new Date(startTimeUTC) }, startTime: { $lte: new Date(endTimeUTC) } }
//             ]
//         });
    
//         // If there are overlapping bookings, respond with an error
//         if (overlappingBookings.length > 0) {
//             return res.send("The room is already booked for the requested time." )
//         }
//     //Extracting booking date
//     const updatedBooking = {
//         room: req.body.room,
//         bookerId: req.session.currentUser._id,
//         //luxon
//         startTime: DateTime.fromISO(req.body.startTime, { zone: timeZone }).toUTC().toISO(),
//         endTime: DateTime.fromISO(req.body.endTime, { zone: timeZone }).toUTC().toISO(),
//         subject: req.body.subject,
//         participants: []
//     };
//     if (req.body.participants.trim()) {
//         updatedBooking.participants = await Promise.all(req.body.participants.split(',').map(async (participant) => {

//             let lastName = participant.trim().split(" ")[1];
//             lastName = lastName[0].toUpperCase() + lastName.slice(1).toLowerCase()
//             const colleague = await db.Employee.findOne({ lastName: lastName });
//             return colleague ? colleague._id : null;
//         }));
//     console.log(updatedBooking.participants, 88888)
//         updatedBooking.participants = updatedBooking.participants.filter(id => id !== null); // Remove any nulls if colleague wasn't found
//     }
    
//     updatedBooking.participants = [req.session.currentUser._id, ...updatedBooking.participants]

//     //debugged and added await so that editting would be submitted properly
//     const book = await db.Booking.findByIdAndUpdate(req.params.id, updatedBooking, { new: true })
//     await db.Room.updateOne({_id: req.body.room},{$set: {bookings: book}}, { new:true })

//     res.redirect("/booking")
// })

// UPDATE - update the existing booking, then redirect
router.put("/:id", isAuthenticated, async (req, res) => {
    const timeZone = "local";
    const startTimeUTC = DateTime.fromISO(req.body.startTime, { zone: timeZone }).toUTC().toISO();
    const endTimeUTC = DateTime.fromISO(req.body.endTime, { zone: timeZone }).toUTC().toISO();

    // Check for overlapping bookings excluding the current booking
    const overlappingBookings = await db.Booking.find({
        room: req.body.room,
        $or: [
            { startTime: { $lte: new Date(endTimeUTC) }, endTime: { $gte: new Date(startTimeUTC) } },
            { endTime: { $gte: new Date(startTimeUTC) }, startTime: { $lte: new Date(endTimeUTC) } }
        ],
        _id: { $ne: req.params.id }
    });

    if (overlappingBookings.length > 0) {
        return res.send("The room is already booked for the requested time.");
    }

    let participants = [];
    if (req.body.participants.trim()) {
        participants = await Promise.all(req.body.participants.split(',').map(async (participant) => {
            let lastName = participant.trim().split(" ")[1];
            lastName = lastName[0].toUpperCase() + lastName.slice(1).toLowerCase();
            const colleague = await db.Employee.findOne({ lastName: lastName });
            return colleague ? colleague._id : null;
        }));
        participants = participants.filter(id => id !== null);
    }

    // // Add the booker's ID and remove duplicates
    // participants = [...new Set([req.session.currentUser._id, ...participants])];
// Add the booker's ID and remove duplicates, ensuring the booker's ID is not redundantly added if it's already in the participants array
participants = [...new Set([req.session.currentUser._id, ...participants])].filter(id => id.toString() !== req.session.currentUser._id.toString());

    // Update the booking
    const updatedBooking = {
        room: req.body.room,
        bookerId: req.session.currentUser._id,
        startTime: startTimeUTC,
        endTime: endTimeUTC,
        subject: req.body.subject,
        participants
    };

    await db.Booking.findByIdAndUpdate(req.params.id, updatedBooking, { new: true });
    await db.Room.updateOne({_id: req.body.room}, { $set: { bookings: updatedBooking } }, { new: true });

    res.redirect("/booking");
});


//CREATE route
router.post('/', isAuthenticated, async (req, res) => {
    const timeZone = 'America/New_York';
    // Convert start and end times to UTC for comparison
    const startTimeUTC = DateTime.fromISO(req.body.startTime, { zone: timeZone }).toUTC().toISO();
    const endTimeUTC = DateTime.fromISO(req.body.endTime, { zone: timeZone }).toUTC().toISO();

    // Check for overlapping bookings
    const overlappingBookings = await db.Booking.find({
        room: req.body.room,
        $or: [
            { startTime: { $lte: new Date(endTimeUTC) }, endTime: { $gte: new Date(startTimeUTC) } },
            { endTime: { $gte: new Date(startTimeUTC) }, startTime: { $lte: new Date(endTimeUTC) } }
        ]
    });

    // If there are overlapping bookings, respond with an error
    if (overlappingBookings.length > 0) {
        return res.send("The room is already booked for the requested time." )
    }

    // Proceed with booking creation if no overlap
    const newBooking = {
        room: req.body.room,
        bookerId: req.session.currentUser._id,
        startTime: startTimeUTC,
        endTime: endTimeUTC,
        subject: req.body.subject,
        participants: []
    };

    // Handling participants
    if (req.body.participants.trim()) {
        newBooking.participants = await Promise.all(req.body.participants.split(',').map(async (participant) => {
            let lastName = participant.trim().split(" ")[1];
            lastName = lastName[0].toUpperCase() + lastName.slice(1).toLowerCase();
            const colleague = await db.Employee.findOne({ lastName: lastName });
            return colleague ? colleague._id : null; 
        }));
        newBooking.participants = newBooking.participants.filter(id => id !== null);
    }
    newBooking.participants = [req.session.currentUser._id, ...newBooking.participants];

    // Create the booking
    const book = await db.Booking.create(newBooking);

    // Update participant documents with the new booking ID
    await db.Employee.updateMany(
        { _id: { $in: newBooking.participants } },
        { $push: { bookings: book._id } }
    );

    // Update room document with the new booking ID
    await db.Room.findByIdAndUpdate(
        req.body.room,
        { $push: { bookings: book._id } }
    );

    // Redirect after successful booking creation
    res.redirect("/booking");
});


// EDIT - show edit form of a particular booking
router.get("/:id/edit", isAuthenticated, (req, res) => {
    db.Booking.findById(req.params.id)
        .then(booking => {
         
            // Check if the currently logged-in user is the one who created the booking
            if (booking.bookerId.toString() !== req.session.currentUser._id.toString()) {
                // If not, redirect them with an error message or to a different page
                return res.send("Unauthorized: You can only edit bookings you have created.");
            }
        
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
                            booking = {
                                ...booking._doc,
                                participants: participantNames.join(", ")
                            };
                            console.log(booking)

                            res.render("edit-booking.ejs", { booking: booking, rooms: rooms, currentUser: req.session.currentUser, dateTime: DateTime })
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
            // Luxon Convert startTime and endTime 
            const timeZone = 'America/New_York';
            bookings.startTime = DateTime.fromISO(bookings.startTime).setZone(timeZone).toFormat("yyyy-LL-dd'T'HH:mm");
            bookings.endTime = DateTime.fromISO(bookings.endTime).setZone(timeZone).toFormat("yyyy-LL-dd'T'HH:mm");
            // Await the resolution of all participant name fetches for this booking
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