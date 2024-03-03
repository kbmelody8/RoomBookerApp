const express = require("express");

require("dotenv").config();
// const Employee = require("../models/Employee"); 
const db = require('../models')
const router = express.Router()








/* Export these routes so that they are accessible in `server.js`
--------------------------------------------------------------- */
module.exports = router