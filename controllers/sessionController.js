const bcrypt = require("bcrypt")
const db = require("../models")
const router = require("express").Router()


router.get("/signin", (req, res) => {
    res.render("signin.ejs")
})

//SIGNIN

router.post("/signin", async (req, res)=> {
    try {
        const foundEmployee = await db.Employee.findOne({ email: req.body.email })
        if (!foundEmployee) {
            return res.send('No existing user found. Please sign up') // after we find the employee - compare passwords
        } else if (bcrypt.compareSync(req.body.password, foundEmployee.password)) { 
            // if employee is found in DB and passwords match, add the user to  the session
            req.session.currentUser = foundEmployee
            // redirect back to profile page
            res.redirect('/profile')
        } else {
            // if passwords do not match, display the below message:
            res.send('password does not match')
        }
    }
    catch (err) {
        console.log(err)
    }
})

router.get("/signup", (req, res) => {
    res.render("signup.ejs")
})

//SIGNUP
router.post('/signup', async (req, res) => {
    // Find the employee trying to log inby email  (so that we can compare passwords)
    try {
        const foundEmployee = await db.Employee.findOne({ email: req.body.email })
        // After the  employee is found in DB - compare passwords
        if (foundEmployee) {
            return res.send('Found existing employee record. Please sign in.')

        } else {// if the passwords don't match, send an error message
            if (req.body.password !== req.body.confirmPassword) {
                return res.send('Password does not match')
            }
            const hashedString = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10))
            const { confirmPassword, ...rest } = req.body
            const newEmployee = await db.Employee.create({
                ...rest, password: hashedString
            })
            //       2a) if the passwords match, create a new session
            // req["session"].currentUser = newEmployee
            res.redirect('/profile')
        }
    }
    catch (err) {
        console.log(err)
    }
})





module.exports = router