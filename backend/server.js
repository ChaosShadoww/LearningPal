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
app.use(express.static('frontend'));

// Session management setup
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', learningRoutes);

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
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Frontend available at http://localhost:${PORT}`);
});