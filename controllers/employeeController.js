const express = require("express");
//axios takes the response from the api an stores it in data
const axios = require("axios");
require("dotenv").config();
const bcrypt = require('bcrypt');
const db = require('../models')
const router = express.Router()

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
};

function getRandomDepartmentAndPosition(departments) {
  const departmentKeys = Object.keys(departments); //returns an array iterator object with the keys of an object.
  const randomDeptKey = departmentKeys[Math.floor(Math.random() * departmentKeys.length)];
  const randomPosition = departments[randomDeptKey] [Math.floor(Math.random() * departments[randomDeptKey].length)]; 
  return { department: randomDeptKey, position: randomPosition };
}
// console.log(getRandomDepartmentAndPosition(departments))


  // Function to clear and then seed the Employee collection
   function fetchAndCreateEmployees (req, res) {
    // Clearing the existing Employee collection first
    return db.Employee.deleteMany({})
      .then(deletedData => {
        console.log(`Removed ${deletedData.deletedCount} employees`)
        // Fetch and insert new employees
        return axios.get('https://randomuser.me/api/', {
          params: { results: 30, nat: "US"}
        });
      })
      .then(response => {
        const employeesData = response.data.results;
        const employees = employeesData.map(user => {
          // Calling the getRandomDepartmentAndPosition()
          const { department, position } = getRandomDepartmentAndPosition(departments);
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
          };
        });
        return db.Employee.insertMany(employees);
      })
      .then(addedEmployees => {
        console.log(`Added ${addedEmployees.length} new employees`);
      res.json (addedEmployees)
      })
      .catch(error => {
        console.error('Error in the seeding process:', error);
      });
  }

  
//INDUCES
router.get('/', fetchAndCreateEmployees)


/* Export these routes so that they are accessible in `server.js`
--------------------------------------------------------------- */
module.exports = router