// Load environment variables from a .env file for secure access to sensitive information
require("dotenv").config()
// Import Luxon for date and time manipulation for handling dates in bookins
const { DateTime } = require('luxon')
const express = require("express")
// Import the database models to interact with MongoDB
const db = require('../models')
// Create a new router for handling routes related to bookings
const router = express.Router()
const isAuthenticated = require("../controllers/isAuthenticated")
router.use(isAuthenticated)

//I.N.D.U.C.E.S

// INDEX - displaying all bookingsrelated to the current user
router.get("/", isAuthenticated, (req, res) => {
    // Use Promise.all to perform two find below operations in parallel
    Promise.all([
        db.Booking.find({ bookerId: req.session.currentUser._id }), // Fetch bookings where the employee is the booker
        db.Booking.find({ participants: req.session.currentUser._id }) // Fetch bookings where the employee is a participant
    ])
        .then(([bookingsAsBooker, bookingsAsParticipant]) => {
            // Initialize a Set to keep track of unique booking IDs and an array to store the combined bookings
            const allBookingsSet = new Set();
            const allRelevantBookings = [];
            // Combine bookings from both queries and filter out duplicates by checking against the Set
            [...bookingsAsBooker, ...bookingsAsParticipant].forEach(booking => {
                // Convert ObjectId to string for comparison
                const bookingIdStr = booking._id.toString()
                if (!allBookingsSet.has(bookingIdStr)) {
                    allBookingsSet.add(bookingIdStr) // Mark this booking Id as seen
                    allRelevantBookings.push(booking) // Add to the combined list of unique bookings
                }
            })
            // Process the eliminated list of bookings to include participant names and room details
            const bookingPromises = allRelevantBookings.map(async (item) => {
                // Find the room details for each booking
                const room = await db.Room.findById(item.room)
                // Fetch the names of all participants for each booking
                // and map participant IDs to formatted names, handling any missing participants
                const participantNames = await Promise.all(item.participants.map(async (participantId) => {
                    const participant = await db.Employee.findById(participantId);
                    // Format participant names, falling back to 'Unknown Participant' if not found
                    if (participant) {
                        return `${participant.firstName[0].toUpperCase()}${participant.firstName.slice(1)} ${participant.lastName[0].toUpperCase()}${participant.lastName.slice(1)}`
                    } else {
                        return 'Unknown Participant'
                    }
                }))
                // Return the booking enhanced with participant names and room details
                return { ...item._doc, participants: participantNames.join(", "), room: room.room }
            })

            // Resolve all promises to get the fully processed bookings and render the bookings page
            Promise.all(bookingPromises)
                .then(modifiedBookings => {
                    // Render the template with the list of processed bookings for the current user
                    res.render("bookings.ejs", { bookings: modifiedBookings, currentUser: req.session.currentUser })
                })
                .catch(error => {
                    // Handle any errors during the booking processing
                    console.error("Error processing bookings:", error)
                })
        })
        .catch(error => {
            // Handle errors from the initial booking fetch operations
            console.error("Error fetching bookings:", error)
            res.status(500).send(error.message)
        })
})


// // NEW - show form to make new bookings
router.get("/new", isAuthenticated, (req, res) => {
    // Fetch all room details to allow the employee to choose where the booking is made
    db.Room.find({})
        .then(rooms => {
            // Render the new booking form, passing in available rooms, the current session's employee details, and any booking error message if present
            res.render("new-booking.ejs", { rooms: rooms, currentUser: req.session.currentUser, bookingErrorMessage: req.session.bookingErrorMessage })
        })
        .catch(error => {
            res.status(500).send(error.message)
        })
})


// DELETE - delete a particular booking, then redirect
router.delete("/:id", isAuthenticated, (req, res) => {
    // Find the booking by its ID to verify the current employee is authorized to delete it
    db.Booking.findById(req.params.id)
        .then((booking) => {
            // Check if the currently logged-in user is the one who created the booking
            if (booking.bookerId.toString() !== req.session.currentUser._id.toString()) {
                // If not, redirect them with an error message or to a different page
                return res.send("Unauthorized: You can only delete bookings you have created.")
            }
            // If authorized, proceed with deletion
            db.Booking.findByIdAndDelete(req.params.id)
                .then(() => {
                    res.redirect("/booking")
                })
                .catch(error => {
                    res.status(500).send(error.message)
                })
        })
        .catch(error => {
            res.status(500).send("Booking not found.")
        })
})


// UPDATE - update the existing booking, then redirect
router.put("/:id", isAuthenticated, async (req, res) => {
    // Convert provided start and end times to UTC for consistent time zone handling
    const timeZone = "local"
    const startTimeUTC = DateTime.fromISO(req.body.startTime, { zone: timeZone }).toUTC().toISO()
    const endTimeUTC = DateTime.fromISO(req.body.endTime, { zone: timeZone }).toUTC().toISO()

    // Check for any existing bookings for the same room that overlap with the requested time, excluding the current booking by its ID
    const overlappingBookings = await db.Booking.find({
        room: req.body.room,
        $or: [
            { startTime: { $lte: new Date(endTimeUTC) }, endTime: { $gte: new Date(startTimeUTC) } },
            { endTime: { $gte: new Date(startTimeUTC) }, startTime: { $lte: new Date(endTimeUTC) } }
        ],
        _id: { $ne: req.params.id }
    });
    // If there are overlapping bookings, display an error message 
    if (overlappingBookings.length > 0) {
        req.session.bookingErrorMessage = "The room is already booked for the requested time."
        res.redirect("/booking/new")
        return
    }
    // If no overlap - clear the error message 
    req.session.bookingErrorMessage = null

    // If there's no overlap, proceed to update the booking
    // Process the participants list, ensuring each participant is correctly identified and included
    let participants = []
    if (req.body.participants.trim()) {
        participants = await Promise.all(req.body.participants.split(',').map(async (participant) => {
            let lastName = participant.trim().split(" ")[1]
            lastName = lastName[0].toUpperCase() + lastName.slice(1).toLowerCase()
            const colleague = await db.Employee.findOne({ lastName: lastName })
            return colleague ? colleague._id : null
        }))
        // Filter out any null values to ensure all participants are valid
        participants = participants.filter(id => id !== null)
    }

    // Ensure the booker's ID is included in the participants list without duplicates
    participants = [...new Set([req.session.currentUser._id, ...participants])].filter(id => id.toString() !== req.session.currentUser._id.toString())

    // Construct the updated booking obj with the new details
    const updatedBooking = {
        room: req.body.room,
        bookerId: req.session.currentUser._id,
        startTime: startTimeUTC,
        endTime: endTimeUTC,
        subject: req.body.subject,
        participants
    }
    // Save the updated booking details to the database
    await db.Booking.findByIdAndUpdate(req.params.id, updatedBooking, { new: true });
    // Update the room document with the new booking details
    await db.Room.updateOne({ _id: req.body.room }, { $set: { bookings: updatedBooking } }, { new: true })
    // Redirect to the main booking page after successful update
    res.redirect("/booking")
})


//CREATE route for making a new booking
router.post('/', isAuthenticated, async (req, res) => {
    const timeZone = 'America/New_York'// Time zone for converting provided times
    // Convert start and end times to UTC for comparison and storage
    const startTimeUTC = DateTime.fromISO(req.body.startTime, { zone: timeZone }).toUTC().toISO()
    const endTimeUTC = DateTime.fromISO(req.body.endTime, { zone: timeZone }).toUTC().toISO()

    // Check the database for any bookings that would overlap with the requested time for the specified room
    const overlappingBookings = await db.Booking.find({
        room: req.body.room,
        $or: [
            // Conditions to identify overlapping bookings based on start and end times
            { startTime: { $lte: new Date(endTimeUTC) }, endTime: { $gte: new Date(startTimeUTC) } },
            { endTime: { $gte: new Date(startTimeUTC) }, startTime: { $lte: new Date(endTimeUTC) } }
        ]
    })
    // If there are overlapping bookings, set an error message in the session and redirect the user to try again
    if (overlappingBookings.length > 0) {
        req.session.bookingErrorMessage = "The room is already booked for the requested time."
        res.redirect("/booking/new"); // Prevent further execution of this function
        return;
    }

    // Clear the error message if no overlap
    req.session.bookingErrorMessage = null

    // Proceed with booking creation if no overlap
    // Define a new booking obj with details from the req body and the current user's ID as the booker
    const newBooking = {
        room: req.body.room,
        bookerId: req.session.currentUser._id,
        startTime: startTimeUTC,
        endTime: endTimeUTC,
        subject: req.body.subject,
        participants: [] // Initialize participants array
    }
    // Handling participants: splitting the provided string, converting names, and fetching corresponding employee IDs
    if (req.body.participants.trim()) {
        newBooking.participants = await Promise.all(req.body.participants.split(',').map(async (participant) => {
            let lastName = participant.trim().split(" ")[1]
            lastName = lastName[0].toUpperCase() + lastName.slice(1).toLowerCase()
            const colleague = await db.Employee.findOne({ lastName: lastName })
            return colleague ? colleague._id : null
        }))
        // Remove any null values from the participants array
        newBooking.participants = newBooking.participants.filter(id => id !== null)
    }
    // Ensure the booker is included in the participants and remove duplicates
    newBooking.participants = [req.session.currentUser._id, ...newBooking.participants]

    // Save the new booking to the database
    const book = await db.Booking.create(newBooking)

    // Update participant documents with the new booking ID
    await db.Employee.updateMany(
        { _id: { $in: newBooking.participants } }, // Add this booking ID to the participants' records
        { $push: { bookings: book._id } }
    )

    // Update room document with the new booking ID
    await db.Room.findByIdAndUpdate(
        req.body.room,
        { $push: { bookings: book._id } }  // Add this booking ID to the room's record
    )

    // Redirect after successful booking creation
    res.redirect("/booking")
})


// EDIT -  Display the form for editing a specific booking
router.get("/:id/edit", isAuthenticated, (req, res) => {
    // Find the booking by its ID in the database
    db.Booking.findById(req.params.id)
        .then(booking => {
            // Check if the currently logged-in user is the one who created the booking
            if (booking.bookerId.toString() !== req.session.currentUser._id.toString()) {
                // If not, redirect them with an error message or to a different page
                return res.send("Unauthorized: You can only edit bookings you have created.")
            }
            // If authorized, proceed to fetch room details for dropdown options in the edit form
            db.Room.find({})
                .then(rooms => {
                    // For each participant in the booking, find and format their names
                    Promise.all(booking.participants.map(async (participantId) => {
                        const participant = await db.Employee.findById(participantId)
                        if (participant) {
                            // Format participant names to "FirstName LastName" with proper capitalization
                            return `${participant.firstName[0].toUpperCase()}${participant.firstName.slice(1)} ${participant.lastName[0].toUpperCase()}${participant.lastName.slice(1)}`
                        } else {
                            return 'Unknown Participant'; // Handle missing participant data properly
                        }
                    }))
                        .then(participantNames => {
                            // Update the booking obj with a string of participant names separated by commas
                            booking = {
                                ...booking._doc,
                                participants: participantNames.join(", ")
                            }
                            console.log(booking)
                            // Render the edit form, passing booking details, room options, current user info, and any booking error messages
                            res.render("edit-booking.ejs", { booking: booking, rooms: rooms, currentUser: req.session.currentUser, dateTime: DateTime, bookingErrorMessage: req.session.bookingErrorMessage })
                        })
                })
                .catch(error => {
                    console.error("Error processing bookings:", error)

                })

        })
        .catch(error => {
            res.status(500).send(error.message)
        })
})

// SHOW - Display details of a specific booking, including options for update and deletion
router.get("/:id", isAuthenticated, (req, res) => {
    // Find the booking by its ID in the database
    db.Booking.findById(req.params.id)
        .then(bookings => {
            // Luxon is used to convert the startTime and endTime to a specific format and timezone
            const timeZone = 'America/New_York'
            bookings.startTime = DateTime.fromISO(bookings.startTime).setZone(timeZone).toFormat("yyyy-LL-dd'T'HH:mm")
            bookings.endTime = DateTime.fromISO(bookings.endTime).setZone(timeZone).toFormat("yyyy-LL-dd'T'HH:mm")
            // Find the room associated with this booking to get the room name
            db.Room.findById(bookings.room)
                .then(room => {
                    // For each participant in the booking, find their full name
                    Promise.all(bookings.participants.map(async (participantId) => {
                        const participant = await db.Employee.findById(participantId) // Correctly await the document
                        if (participant) {
                            // If the participant is found, format their name, ensuring the first letter of both the first name and the last name are capitalized
                            return `${participant.firstName[0].toUpperCase()}${participant.firstName.slice(1)} ${participant.lastName[0].toUpperCase()}${participant.lastName.slice(1)}`
                        } else {
                            // If a participant isn't found, label them as 'Unknown Participant'
                            return 'Unknown Participant'
                        }
                    }))
                        .then(participantNames => {
                            // Return a new object that spreads the original and updates participants to a string
                            bookings = { ...bookings._doc, participants: participantNames.join(", "), room: room.room }
                            res.render("details-booking.ejs", { booking: bookings, currentUser: req.session.currentUser })
                        })
                        .catch(error => {
                            console.error("Error processing bookings:", error)
                        })
                })
        })
        .catch(error => {
            res.status(500).send(error.message)
        })
})



/* Export these routes so that they are accessible in `server.js`
--------------------------------------------------------------- */
module.exports = router