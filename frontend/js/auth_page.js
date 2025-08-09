


// 1. User Registration:

const form = document.querySelector('form');
form.addEventListener('submit', (event) => {
    const password = event.target.password.value;
    if (!isValidPassword(password)) {
        alert('Password does not meet security criteria.');
        event.preventDefault();
    }
});
function isValidPassword(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
}


// Hash and store the password:
// Use AWS Aurora
const bcrypt = require('bcrypt');
const saltRounds = 10;
const plainTextPassword = 'userPassword';
bcrypt.hash(plainTextPassword, saltRounds, (err, hash) => {
    if (err) throw err;
    // Store hash in your password database.
    console.log('Hashed Password:', hash);
});



// Upon login attempt, compare user password with hashed password from database

bcrypt.compare(plainTextPassword, storedHash, (err, result) => {
    if (result) {
        console.log('Authentication successful');
        // Proceed with session creation or token generation
    } else {
        console.log('Authentication failed');
        // Handle failed authentication
    }
});