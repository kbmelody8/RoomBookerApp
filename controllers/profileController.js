const router = require('express').Router()
const db = require('../models')
const bcrypt = require('bcrypt');
const isAuthenticated = require("../controllers/isAuthenticated")
router.use(isAuthenticated)

router.get("/", isAuthenticated,  (req, res) => {
res.render("profile.ejs")
})




module.exports = router