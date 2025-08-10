const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'yourSecretKey';

// Password hashing
const saltRounds = 10;
async function hashPassword(plainTextPassword) {
    return await bcrypt.hash(plainTextPassword, saltRounds);
}

async function verifyPassword(plainTextPassword, storedHash) {
    return await bcrypt.compare(plainTextPassword, storedHash);
}

// OTP functions
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000);
}

function validateOtp(inputOtp, storedOtp) {
    return inputOtp === storedOtp;
}

// JWT middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (token) {
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Unauthorized access' });
            } else {
                req.user = decoded;
                next();
            }
        });
    } else {
        return res.status(401).json({ message: 'Token not provided' });
    }
}

// Temporary storage for users and OTPs (replace with database)
const users = new Map();
const otpStorage = new Map();

// Registration endpoint
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if user already exists
        if (users.has(email)) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        // Hash password
        const hashedPassword = await hashPassword(password);
        
        // Store user (replace with database)
        const userId = Date.now().toString();
        users.set(email, {
            id: userId,
            name,
            email,
            password: hashedPassword,
            createdAt: new Date()
        });
        
        res.status(201).json({ message: 'User created successfully' });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = users.get(email);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // Verify password
        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // Generate OTP for MFA
        const otp = generateOTP();
        const otpKey = `${user.id}_${Date.now()}`;
        
        // Store OTP (expires in 10 minutes)
        otpStorage.set(otpKey, {
            otp,
            userId: user.id,
            email: user.email,
            expiresAt: Date.now() + 10 * 60 * 1000
        });
        
        // Create temporary token for MFA
        const tempToken = jwt.sign(
            { userId: user.id, otpKey, type: 'temp' },
            JWT_SECRET,
            { expiresIn: '10m' }
        );
        
        // TODO: Send OTP via email service
        console.log(`OTP for ${email}: ${otp}`);
        
        res.json({
            requiresMFA: true,
            tempToken,
            message: 'OTP sent to your email'
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// MFA verification endpoint
router.post('/verify-mfa', (req, res) => {
    try {
        const { mfaCode } = req.body;
        const authHeader = req.headers['authorization'];
        const tempToken = authHeader && authHeader.split(' ')[1];
        
        if (!tempToken) {
            return res.status(401).json({ message: 'Temporary token required' });
        }
        
        // Verify temp token
        const decoded = jwt.verify(tempToken, JWT_SECRET);
        if (decoded.type !== 'temp') {
            return res.status(401).json({ message: 'Invalid token type' });
        }
        
        // Get OTP data
        const otpData = otpStorage.get(decoded.otpKey);
        if (!otpData || Date.now() > otpData.expiresAt) {
            return res.status(401).json({ message: 'OTP expired' });
        }
        
        // Validate OTP
        if (!validateOtp(parseInt(mfaCode), otpData.otp)) {
            return res.status(401).json({ message: 'Invalid OTP' });
        }
        
        // Generate final JWT token
        const token = jwt.sign(
            { id: decoded.userId, email: otpData.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Clean up OTP
        otpStorage.delete(decoded.otpKey);
        
        res.json({
            token,
            message: 'Login successful'
        });
        
    } catch (error) {
        console.error('MFA verification error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Resend MFA code
router.post('/resend-mfa', (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const tempToken = authHeader && authHeader.split(' ')[1];
        
        if (!tempToken) {
            return res.status(401).json({ message: 'Temporary token required' });
        }
        
        const decoded = jwt.verify(tempToken, JWT_SECRET);
        const otpData = otpStorage.get(decoded.otpKey);
        
        if (!otpData) {
            return res.status(401).json({ message: 'Session expired' });
        }
        
        // Generate new OTP
        const newOtp = generateOTP();
        otpData.otp = newOtp;
        otpData.expiresAt = Date.now() + 10 * 60 * 1000;
        
        // TODO: Send new OTP via email
        console.log(`New OTP for ${otpData.email}: ${newOtp}`);
        
        res.json({ message: 'New OTP sent' });
        
    } catch (error) {
        console.error('Resend MFA error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Export the middleware for use in other routes
module.exports = router;
module.exports.authenticateToken = authenticateToken;