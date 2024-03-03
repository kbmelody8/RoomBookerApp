const bcrypt = require("bcrypt")
const db = require("../models")
const router = require("express").Router()


router.get("/signin", (req, res) => {
res.render("signin.ejs")
})


router.get("/signup", (req, res) => {
    res.render("signup.ejs")
    })

    router.post('/signup', async  (req, res) => {
        // 1) Find the user trying to log in (so that we can compare passwords)
        try {
            const foundEmployee = await db.Employee.findOne({ email: req.body.email})
            console.log(foundEmployee)
        // 2) after we find the user compare passwords
        if(foundEmployee){
console.log (foundEmployee)
            return res.send('Found existing employee record. Please sign in.')
        
        }else {
            if (req.body.password !== req.body.confirmPassword) {
                return res.send('Password does not match')
            }
            const hashedString = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10))
            const {confirmPassword, ...rest} = req.body
            //1st arg = delete req.body.confirmPassword
            //Destructurization 
            //const obj = {name: "Mia", age: 20, location: "USA", city: NYC } //stay unchanged
            //to ease syntax: 
            //const {name, age, ...rest} = obj //rest all the other keys (location, city) is collecting is for another obj
            // ...rest (without space) = is only for collecting, but calling is just: rest
            const newEmployee = await db.Employee.create({
                ...rest, password: hashedString
            })
            console.log(newEmployee)
            console.log(req.session)
        //       2a) if the passwords match, create a new session
        //       2b) if the passwords don't match, send an error message
        req["session"].currentUser = newEmployee
            res.redirect('/profile')
        }
    }
    catch (err) {
        console.log(err)
    }
    })

    



module.exports = router