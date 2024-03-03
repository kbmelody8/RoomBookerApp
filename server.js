/* Require modules
--------------------------------------------------------------- */
/* Require the routes in the controllers folder
--------------------------------------------------------------- */
const empCtrl = require("./controllers/employeeController")
// const bookingCtrl = require('./controllers/bookingController')
// const roomCtrl = require('./controllers/roomController')
const sessionCtrl = require("./controllers/sessionController")
const profileCtrl = require("./controllers/profileController")

const axios = require("axios");
const session = require("express-session")
require("dotenv").config()
const path = require("path");
const express = require("express");
const methodOverride = require("method-override");
const livereload = require("livereload");
const connectLiveReload = require("connect-livereload");
const morgan = require("morgan")

/* Require the db connection, models, and seed data
--------------------------------------------------------------- */
const db = require("./models");

/* Create the Express app
--------------------------------------------------------------- */
const app = express();

/* Configure the app to refresh the browser when nodemon restarts
--------------------------------------------------------------- */
const liveReloadServer = livereload.createServer();
liveReloadServer.server.once("connection", () => {
    // wait for nodemon to fully restart before refreshing the page
    setTimeout(() => {
        liveReloadServer.refresh("/");
    }, 100);
});

/* Configure the app (app.set)
--------------------------------------------------------------- */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* Middleware (app.use)
--------------------------------------------------------------- */
app.use(express.static("public"))
app.use(connectLiveReload());
// Allows us to interpret POST requests from the browser as another request type: DELETE, PUT, etc.
app.use(methodOverride("_method"));
//Allows to recognize the incoming request as a JSON object
app.use(express.json()) //this creates an empty object { } , before that it’s a str, undefined
///Body parser: used for POST/PUT/PATCH (create, update) routes that allows to use req.body to get form data
// this will take incoming strings from the body that are URL encoded and parse them 
// into an object that can be accessed in the request parameter as a property called body (req.body).
app.use(express.urlencoded({ extended: true }))
app.use(morgan("tiny"))
app.use("/employee", empCtrl)
app.use("/session", sessionCtrl)
app.use("/profile", profileCtrl)
// app.use("/booking", bookingCtrl)
// app.use("/room", roomCtrl)

app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false, 
    saveUninitialized: false 
  })
)


// Mount ROUTES
// INDUCES
//INDEX route for fetching all employees
app.get("/", (req, res) => {
    db.Employee.find({})
      .then(employees => res.json(employees))
      .catch(error => res.status(500).json({ error: 'An error occurred fetching employees' }));
  });
  
  

/* App listening on the specified in ENV port
--------------------------------------------------------------- */
app.listen(process.env.PORT, function () {
    console.log('Express is listening to port', process.env.PORT);
});