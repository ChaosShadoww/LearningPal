const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const router = express.Router();

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'yourSecretKey';

// Email transporter setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'elishajaen75@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'your-app-password-here'
    }
});

// Function to send OTP email
async function sendOTPEmail(email, otp) {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER || 'elishajaen75@gmail.com',
            to: email,
            subject: '🔐 Your LearningPal Login Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">LearningPal</h1>
                        <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Your personal learning companion</p>
                    </div>
                    
                    <div style="background: white; padding: 30px; margin-top: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                        <h2 style="color: #333; margin-top: 0;">Your Login Code</h2>
                        <p style="color: #666; font-size: 16px; line-height: 1.5;">
                            Enter this code to complete your login to LearningPal:
                        </p>
                        
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 10px; margin: 25px 0; letter-spacing: 5px;">
                            ${otp}
                        </div>
                        
                        <p style="color: #999; font-size: 14px; text-align: center;">
                            This code expires in 10 minutes for your security.
                        </p>
                    </div>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`✅ OTP email sent successfully to ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send OTP email:', error);
        return false;
    }
}




// Local PostgreSQL Database Configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'learningpal_user',
    password: process.env.DB_PASSWORD || 'learningpal_password',
    database: process.env.DB_NAME || 'learningpal',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 60000
};

console.log('Database configuration:');
console.log('- host:', dbConfig.host);
console.log('- port:', dbConfig.port);
console.log('- user:', dbConfig.user);
console.log('- database:', dbConfig.database);

// Create connection pool
const pool = new Pool(dbConfig);

// Database initialization
async function initializeDatabase() {
    try {
        const client = await pool.connect();
        
        // Create users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create index on email if not exists
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
        `);
        
        // Create OTP storage table
        await client.query(`
            CREATE TABLE IF NOT EXISTS otp_storage (
                id VARCHAR(255) PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                otp_code INTEGER NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // Create indexes
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_otp_user_id ON otp_storage(user_id)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_storage(expires_at)
        `);
        
        client.release();
        console.log('Local PostgreSQL database tables initialized successfully');
        
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
}

// Initialize database on startup
initializeDatabase().catch(console.error);

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

// Generate unique ID
function generateUserId() {
    return Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
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

// Database helper functions
async function createUser(userData) {
    const client = await pool.connect();
    try {
        const userId = generateUserId();
        const hashedPassword = await hashPassword(userData.password);
        
        await client.query(
            'INSERT INTO users (id, name, email, password) VALUES ($1, $2, $3, $4)',
            [userId, userData.name, userData.email, hashedPassword]
        );
        
        return userId;
    } finally {
        client.release();
    }
}

async function getUserByEmail(email) {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        
        return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
        client.release();
    }
}

async function storeOTP(userId, email, otp) {
    const client = await pool.connect();
    try {
        const otpId = generateUserId();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        // Clean up expired OTPs for this user
        await client.query(
            'DELETE FROM otp_storage WHERE user_id = $1 OR expires_at < NOW()',
            [userId]
        );
        
        // Store new OTP
        await client.query(
            'INSERT INTO otp_storage (id, user_id, email, otp_code, expires_at) VALUES ($1, $2, $3, $4, $5)',
            [otpId, userId, email, otp, expiresAt]
        );
        
        return otpId;
    } finally {
        client.release();
    }
}

async function getOTPData(otpId) {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT * FROM otp_storage WHERE id = $1 AND expires_at > NOW()',
            [otpId]
        );
        
        return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
        client.release();
    }
}

async function deleteOTP(otpId) {
    const client = await pool.connect();
    try {
        await client.query(
            'DELETE FROM otp_storage WHERE id = $1',
            [otpId]
        );
    } finally {
        client.release();
    }
}

async function updateOTP(otpId, newOtp) {
    const client = await pool.connect();
    try {
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        await client.query(
            'UPDATE otp_storage SET otp_code = $1, expires_at = $2 WHERE id = $3',
            [newOtp, expiresAt, otpId]
        );
    } finally {
        client.release();
    }
}

// Registration endpoint
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        
        // Check if user already exists
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        // Create user
        await createUser({ name, email, password });
        
        res.status(201).json({ message: 'User created successfully' });
        
    } catch (error) {
        console.error('Registration error:', error);
        
        if (error.code === '23505') { // PostgreSQL unique violation
            return res.status(400).json({ message: 'Email already exists' });
        }
        
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        
        // Find user
        const user = await getUserByEmail(email);
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
        const otpId = await storeOTP(user.id, user.email, otp);
        
        // Create temporary token for MFA
        const tempToken = jwt.sign(
            { userId: user.id, otpId, type: 'temp' },
            JWT_SECRET,
            { expiresIn: '10m' }
        );
        
        // Send OTP via email
        try {
            const emailSent = await sendOTPEmail(user.email, otp);
            if (emailSent) {
                console.log(`✅ OTP sent to ${email}: ${otp}`);
            } else {
                console.log(`❌ Email failed, OTP for ${email}: ${otp}`);
            }
        } catch (error) {
            console.log(`❌ Email error, OTP for ${email}: ${otp}`);
        }
        
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
router.post('/verify-mfa', async (req, res) => {
    try {
        const { mfaCode } = req.body;
        const authHeader = req.headers['authorization'];
        const tempToken = authHeader && authHeader.split(' ')[1];
        
        if (!tempToken) {
            return res.status(401).json({ message: 'Temporary token required' });
        }
        
        if (!mfaCode) {
            return res.status(400).json({ message: 'MFA code is required' });
        }
        
        // Verify temp token
        const decoded = jwt.verify(tempToken, JWT_SECRET);
        if (decoded.type !== 'temp') {
            return res.status(401).json({ message: 'Invalid token type' });
        }
        
        // Get OTP data
        const otpData = await getOTPData(decoded.otpId);
        if (!otpData) {
            return res.status(401).json({ message: 'OTP expired or invalid' });
        }
        
        // Validate OTP
        if (!validateOtp(parseInt(mfaCode), otpData.otp_code)) {
            return res.status(401).json({ message: 'Invalid OTP' });
        }
        
        // Get user data
        const user = await getUserByEmail(otpData.email);
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }
        
        // Generate final JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Clean up OTP
        await deleteOTP(decoded.otpId);
        
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            message: 'Login successful'
        });
        
    } catch (error) {
        console.error('MFA verification error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Resend MFA code
router.post('/resend-mfa', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const tempToken = authHeader && authHeader.split(' ')[1];
        
        if (!tempToken) {
            return res.status(401).json({ message: 'Temporary token required' });
        }
        
        const decoded = jwt.verify(tempToken, JWT_SECRET);
        const otpData = await getOTPData(decoded.otpId);
        
        if (!otpData) {
            return res.status(401).json({ message: 'Session expired' });
        }
        
        // Generate new OTP
        const newOtp = generateOTP();
        await updateOTP(decoded.otpId, newOtp);
        
        // Send new OTP via email
        try {
            const emailSent = await sendOTPEmail(otpData.email, newOtp);
            if (emailSent) {
                console.log(`✅ New OTP sent to ${otpData.email}: ${newOtp}`);
            } else {
                console.log(`❌ Email failed, New OTP for ${otpData.email}: ${newOtp}`);
            }
        } catch (error) {
            console.log(`❌ Email error, New OTP for ${otpData.email}: ${newOtp}`);
        }
        
        res.json({ message: 'New OTP sent' });
        
    } catch (error) {
        console.error('Resend MFA error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Health check endpoint
router.get('/health', async (req, res) => {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        
        res.json({ 
            status: 'Database connected', 
            database: 'PostgreSQL',
            timestamp: new Date() 
        });
    } catch (error) {
        console.error('Database health check failed:', error);
        res.status(500).json({ status: 'Database connection failed' });
    }
});

// Test email endpoint (temporary)
router.post('/test-email', async (req, res) => {
    console.log('🚀 test-email route HIT!'); // Add this line
    try {
        const testOTP = 123456;
        const emailSent = await sendOTPEmail('elishajaen75@gmail.com', testOTP);
        
        if (emailSent) {
            res.json({ message: 'Test email sent successfully! Check your Gmail inbox.' });
        } else {
            res.status(500).json({ message: 'Failed to send test email' });
        }
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({ message: 'Error sending test email', error: error.message });
    }
});

console.log('✅ test-email route registered');




// Export the middleware for use in other routes
router.authenticateToken = authenticateToken;
module.exports = router;