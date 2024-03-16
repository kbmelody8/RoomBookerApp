//Express.js framework for building web applications
const express = require("express")
//Middleware for handling sessions in Express
const session = require("express-session")
//Controller for session-related routes
const sessionCtrl = require("./controllers/sessionController")
//Controller for employee-related routes
const empCtrl = require("./controllers/employeeController")
//Controller for booking-related routes
const bookingCtrl = require('./controllers/bookingController')
//Controller for room-related routes
const roomCtrl = require('./controllers/roomController')
//Controller for profile-related routes
const profileCtrl = require("./controllers/profileController")

//Promise based HTTP client for making requests to external API
const axios = require("axios")
//Loading environment variables from a .env file into process.env
require("dotenv").config()
//Provides utilities for working with file and directory paths
const path = require("path")
//Middleware that allows use of HTTP verbs such as PUT or DELETE in places where the client doesn't support it
const methodOverride = require("method-override")
//Enables live reloading of the app during development
const livereload = require("livereload")
//Connects live reload with Express
const connectLiveReload = require("connect-livereload")
//HTTP request logger middleware for node.js
const morgan = require("morgan")

/* Setting up database connection and importing models and seed data
--------------------------------------------------------------- */
const db = require("./models")

/* Create the Express app
--------------------------------------------------------------- */
const app = express()
app.use(
  session({
    secret: process.env.SECRET_KEY,//Secret used to sign the session ID cookie
    resave: false,
    saveUninitialized: false
  })
)
/* Configure the app to refresh the browser when nodemon restarts
--------------------------------------------------------------- */
//Setting up live reload to refresh the browser automatically on changes
const liveReloadServer = livereload.createServer()
liveReloadServer.server.once("connection", () => {
  //Ensuring nodemon has fully restarted before triggering a page refresh
  setTimeout(() => {
    liveReloadServer.refresh("/")
  }, 100)
})

/* Configure the app (app.set)
--------------------------------------------------------------- */
//Setting up view engine and views directory for rendering templates
app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))

/* Middleware (app.use)
--------------------------------------------------------------- */
//Configuring middleware for static files, live reload, method override, JSON parsing, and logging
app.use(express.static("public"))
app.use(connectLiveReload())
// Allows us to interpret POST requests from the browser as another request type: DELETE, PUT, etc.
app.use(methodOverride("_method"))
//Allows to recognize the incoming request as a JSON object
app.use(express.json()) //this creates an empty object { } , before that it’s a str, undefined
///Body parser: used for POST/PUT/PATCH (create, update) routes that allows to use req.body to get form data
// this will take incoming strings from the body that are URL encoded and parse them 
// into an object that can be accessed in the request parameter as a property called body (req.body).
app.use(express.urlencoded({ extended: true }))

//Setting up route handlers for different parts of the application
app.use(morgan("tiny"))
app.use("/session", sessionCtrl)
app.use("/employee", empCtrl)
app.use("/profile", profileCtrl)
app.use("/booking", bookingCtrl)
app.use("/rooms", roomCtrl)


// HOME route to render the homepage template
app.get("/", (req, res) => {
  res.render("home.ejs", { currentUser: null })
})

//SEEDING route for rooms
//Route to delete existing rooms and seed the database with initial data
app.get("/seed", function (req, res) {
  // Remove any existing rooms
  db.Room.deleteMany({})
    .then(removedRoom => {
      console.log(`Removed ${removedRoom.deletedCount} rooms`)
      // Seed the room collection with the seed data
      db.Room.insertMany(db.seedRooms)
        .then(addedRoom => {
          console.log(`Added ${addedRoom.length} rooms`)
          res.json(addedRoom)
        })
    })
})

/* App listening on the specified in ENV port
--------------------------------------------------------------- */
app.listen(process.env.PORT, function () {
  console.log('Express is listening to port', process.env.PORT)
})