// Import necessary modules: express for routing, the database connection, bcrypt for password hashing, and the isAuthenticated middleware
const router = require('express').Router()
const db = require('../models')
const bcrypt = require('bcrypt')
// Middleware to check if an employee is authenticated before allowing access to certain routes
const isAuthenticated = require("../controllers/isAuthenticated")
// Apply isAuthenticated middleware to all routes in this router to ensure only authenticated employees have access
router.use(isAuthenticated)
// Define the route for accessing the profile page
router.get("/", isAuthenticated, (req, res) => {
    // Find the currently authenticated employee in the database using their ID stored in the session
    db.Employee.findById({ _id: req.session.currentUser._id })
        .then(employee => {
            // If the employee is found, render the profile page and pass the employee and currentUser data to the template
            res.render("profile.ejs", {
                employee: employee,
                // Enabling personalized content to be displayed by passing currentUser to the template
                currentUser: req.session.currentUser
            })
        })
        .catch(err => res.status(500).json({ error: err.message }))
})


module.exports = router