const router = require('express').Router()
const db = require('../models')
const bcrypt = require('bcrypt');
const isAuthenticated = require("../controllers/isAuthenticated")
router.use(isAuthenticated)

router.get("/", isAuthenticated,  (req, res) => {
    db.Employee.findById({_id: req.session.currentUser._id})
    .then (employee=> {
        res.render("profile.ejs",  {
            employee: employee,
            currentUser: req.session.currentUser 
        })
    })
    .catch(err => res.status(500).json({error: err.message}));
})


module.exports = router