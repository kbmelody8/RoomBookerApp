// Middleware function to check employee authentication status
const isAuthenticated = (req, res, next) => {
  // Check if the session has a currentUser object, indicating the employee is logged in
  if (req.session.currentUser) {
    return next()
  } else {
    // If the employee is not authenticated, redirect them to the sign-in page
    res.redirect('/session/signin')
  }
}

module.exports = isAuthenticated
