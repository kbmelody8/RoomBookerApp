// Required modules
const express = require("express")
// Axios takes the response from external API and stores data it in 
const axios = require("axios")
//Loads environment variables from a .env file
require("dotenv").config()
//Used for hashing passwords
const bcrypt = require('bcrypt')
// Database models for MongoDB
const db = require('../models')
// Creates a new router object to manage routes
const router = express.Router()

// Predefined departments and their respective positions
const departments = {
  Sales: ['Account Executive', 'Sales Manager', 'Business Development Representative'],
  CustomerSupport: ['Customer Support Specialist', 'Technical Support Engineer', 'Customer Success Manager'],
  InfoSys: ['Systems Analyst', 'IT Support Specialist', 'Database Administrator'],
  Engineering: ['Software Engineer', 'DevOps Engineer', 'Frontend Developer', 'Backend Developer'],
  Data: ['Data Analyst', 'Data Scientist', 'Data Engineer'],
  Analytics: ['Business Analyst', 'Data Analyst', 'Analytics Consultant'],
  Marketing: ['Marketing Coordinator', 'SEO Specialist', 'Content Strategist'],
  Accounting: ['Accountant', 'Financial Analyst', 'Payroll Specialist'],
  HR: ['HR Manager', 'Recruitment Specialist', 'HR Coordinator'],
  Cybersecurity: ['Security Analyst', 'Cybersecurity Specialist', 'Information Security Manager'],
  NewsAndMedia: ['Content Writer', 'Social Media Manager', 'Public Relations Specialist'],
  Managers: ['Project Manager', 'Product Manager', 'Team Lead']
}

// Function to randomly select a department and a position within that department
function getRandomDepartmentAndPosition(departments) {
  // Convert department keys into an array and select one at random
  const departmentKeys = Object.keys(departments)
  const randomDeptKey = departmentKeys[Math.floor(Math.random() * departmentKeys.length)]
  // Select a random position from within the chosen department
  const randomPosition = departments[randomDeptKey][Math.floor(Math.random() * departments[randomDeptKey].length)]
  return { department: randomDeptKey, position: randomPosition }
}

// Route handler function to clear and seed the Employee collection from randomuser.me API
// Function to clear and then seed the Employee collection
function fetchAndCreateEmployees(req, res) {
  // Clearing the existing Employee collection first
  return db.Employee.deleteMany({})
    .then(deletedData => {
      console.log(`Removed ${deletedData.deletedCount} employees`)
      // Fetch and insert new employee data from API
      return axios.get('https://randomuser.me/api/', {
        params: { results: 30, nat: "US" } //An object containing the query string parameters to be appended to the URL. Reference: https://apidog.com/blog/params-axios-get-request/
      })
    })
    .then(response => {
      const employeesData = response.data.results
      const employees = employeesData.map(user => {
        //For each employee, getRandomDepartmentAndPosition is called to assign a department and position
        const { department, position } = getRandomDepartmentAndPosition(departments)
        return {
          firstName: user.name.first,
          lastName: user.name.last,
          department: department,
          position: position,
          email: user.email,
          phoneNumber: user.phone,
          picture: user.picture.large,
          username: user.login.username,
          password: bcrypt.hashSync(user.login.password, bcrypt.genSaltSync(10))
        }
      })
      // Insert the new employee data into the collection
      return db.Employee.insertMany(employees)
    })
    .then(addedEmployees => {
      console.log(`Added ${addedEmployees.length} new employees`)
      res.json(addedEmployees)
    })
    .catch(error => {
      console.error('Error in the seeding process:', error)
    })
}

//Route to trigger the fetchAndCreateEmployees function when a GET request is made 
router.get('/', fetchAndCreateEmployees)


/* Export these routes so that they are accessible in `server.js`
--------------------------------------------------------------- */
module.exports = router