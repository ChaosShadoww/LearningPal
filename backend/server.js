const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const session = require('express-session');

// Password hashing (server-side only)
const saltRounds = 10;
async function hashPassword(plainTextPassword) {
    return await bcrypt.hash(plainTextPassword, saltRounds);
}

// Password comparison (server-side only)
async function verifyPassword(plainTextPassword, storedHash) {
    return await bcrypt.compare(plainTextPassword, storedHash);
}

// Session management setup
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// JWT middleware (server-side only)
function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    if (token) {
        jwt.verify(token, 'yourSecretKey', (err, decoded) => {
            if (err) {
                return res.status(401).send('Unauthorized access');
            } else {
                req.user = decoded;
                next();
            }
        });
    } else {
        return res.status(401).send('Token not provided');
    }
}

// OTP generation and validation (server-side only)
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000);
}

function validateOtp(inputOtp, storedOtp) {
    return inputOtp === storedOtp;
}