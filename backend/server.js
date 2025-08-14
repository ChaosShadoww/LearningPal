// Load environment variables
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/auth');
const learningRoutes = require('./routes/learning');

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables (use .env file in production)
const SESSION_SECRET = process.env.SESSION_SECRET || 'yourSessionSecret';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend'))); // ← Fixed this line

// Session management setup
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Add a simple test route
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working!', timestamp: new Date() });
});






//debugging middleware
app.use((req, res, next) => {
    console.log(`📝 ${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
});
//debugging middleware
app.use((req, res, next) => {
    console.log(`📝 ${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
});

console.log('🔧 Debugging middleware registered'); // Add this line






// Routes
app.use('/api/auth', authRoutes);


console.log('Auth routes registered. Testing route stack...');
authRoutes.stack.forEach((layer) => {
    if (layer.route) {
        console.log('Route:', layer.route.path, 'Methods:', Object.keys(layer.route.methods));
    }
});



app.use('/api', learningRoutes);

app.get('/learning-session/:sessionId', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'learning_session.html'));
});

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'auth_page.html'));
});

app.get('/auth', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'auth_page.html'));
});

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'home_page.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Frontend available at http://localhost:${PORT}`);
});