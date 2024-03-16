//Import bcrypt for password hashing, allowing secure storage and comparison of employee passwords
const bcrypt = require("bcrypt")
// Import the database models to interact with the MongoDB database, specifically for employee-related operations
const db = require("../models")
// Create a new Express router to define routes related to session management (signin, signup, signout)
const router = require("express").Router()

// Route to display the signin page. 
router.get("/signin", (req, res) => {
    res.render("signin.ejs", { currentUser: null }) //'currentUser' is null since the user is not authenticated yet
})
//SIGNIN
// POST route for handling signin form submission
router.post("/signin", async (req, res) => {
    try {
        // Attempt to find an existing employee in the database by their email
        const foundEmployee = await db.Employee.findOne({ email: req.body.email })
        // If no employee is found, inform the client that no existing user was found
        if (!foundEmployee) {
            return res.send('No existing user found. Please sign up')
        } else if (bcrypt.compareSync(req.body.password, foundEmployee.password)) {
            // If an employee is found and the submitted password matches the hashed password in the database
            //save the employee's information in the session to signify they are logged in 
            req.session.currentUser = foundEmployee
            // Redirect the employee to their profile page after successful signin
            res.redirect('/profile')
        } else {
            // If the passwords do not match, inform of the below
            res.send('password does not match')
        }
    }
    catch (err) {
        console.log(err)
    }
})
// Route to display the signup page. Similar to the signin route, 'currentUser' is null here
router.get("/signup", (req, res) => {
    res.render("signup.ejs", { currentUser: null }) //'currentUser' is null since the user is not authenticated yet
})

//SIGNUP
// POST route for handling signup form submission
router.post('/signup', async (req, res) => {
    // Enforce the use of a corporate email domain for signing up
    const email = req.body.email
    const domain = "@example.com"
    if (!email.endsWith(domain)) {
        return res.send(`Please use your corporate email domain`)
    }
    // Find by email the existing employee trying to sign up, so that passwords can be compared
    try {
        // Attempt to find an existing employee in the database by their email
        const foundEmployee = await db.Employee.findOne({ email: req.body.email })
        // If an employee is already registered with the given email, prompt them to sign in instead
        if (foundEmployee) {
            return res.send('Found existing employee record. Please sign in.')

        } else {
            // Check if the provided password and confirmation password match
            if (req.body.password !== req.body.confirmPassword) {
                return res.send('Password does not match')
            }
            // Hash the provided password before storing it in the database for security
            const hashedString = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10))
            // Exclude the confirmPassword field from the request body before creating a new employee record
            const { confirmPassword, ...rest } = req.body
            // Create a new employee record in the database with the hashed password.
            const newEmployee = await db.Employee.create({
                ...rest, password: hashedString
            })
            // Sign in the newly registered employee by saving their information in the session
            req.session.currentUser = newEmployee
            // Redirect the employee to their profile page after successful signup
            res.redirect('/profile')
        }
    }
    catch (err) {
        console.log(err)
    }
})

//SIGNOUT
// Route to handle signout by destroying the session and then redirecting to the signin page
router.get("/signout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/session/signin")
    })
})

module.exports = router