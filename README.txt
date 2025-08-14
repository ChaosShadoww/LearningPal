# 🎓 LearningPal

A full-stack web application that generates personalized learning materials using AI. Transform any topic into flashcards, practice quizzes, study guides, or practice assignments tailored to your learning level and goals.

## ✨ Features

- **AI-Powered Content Generation** - Uses Google's Gemini AI to create personalized learning materials
- **Multiple Learning Styles** - Flashcards, Practice Quizzes, Study Guides, Practice Assignments
- **Secure Authentication** - Email-based login with 2FA using OTP codes
- **Session Management** - Save, view, and manage your learning sessions
- **Source Document Support** - Upload your own materials for AI to process
- **Responsive Design** - Works on desktop and mobile devices

## 🛠️ Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **AI**: Google Gemini 1.5 Flash
- **Authentication**: JWT with email-based 2FA
- **Email**: Nodemailer with Gmail

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **PostgreSQL** (v12 or higher) - [Download here](https://www.postgresql.org/download/)
- **Gmail account** with app password for email functionality
- **Google AI Studio API key** - [Get one here](https://makersuite.google.com/app/apikey)

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd LearningPal
```

### 2. Setup PostgreSQL Database

#### Create Database and User:
```sql
-- Connect to PostgreSQL as superuser
sudo -u postgres psql

-- Create database
CREATE DATABASE learningpal;

-- Create user
CREATE USER learningpal_user WITH PASSWORD 'learningpal_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE learningpal TO learningpal_user;

-- Exit PostgreSQL
\q
```

### 3. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Install required packages
npm install express bcrypt jsonwebtoken pg nodemailer @google/generative-ai dotenv
```

### 4. Environment Configuration

Create a `.env` file in the `backend` directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=learningpal_user
DB_PASSWORD=learningpal_password
DB_NAME=learningpal

# JWT Secret (generate a secure random string)
JWT_SECRET=your_super_secure_jwt_secret_key_here

# Google Gemini AI API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Email Configuration (Gmail)
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASSWORD=your_gmail_app_password

# Server Configuration
PORT=3000
```

### 5. Gmail App Password Setup

1. Go to your [Google Account settings](https://myaccount.google.com/)
2. Security → 2-Step Verification (enable if not already)
3. Security → App passwords
4. Generate an app password for "Mail"
5. Use this app password in your `.env` file (not your regular Gmail password)

### 6. Google AI Studio API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key to your `.env` file

### 7. Start the Application

```bash
# From the backend directory
node server.js
```

You should see:
```
Server running on port 3000
Frontend available at http://localhost:3000
Local PostgreSQL database tables initialized successfully
Learning sessions table initialized successfully
```

### 8. Access the Application

Open your browser and go to: `http://localhost:3000`

## 📱 How to Use

### First Time Setup:
1. **Register**: Create an account with your email and password
2. **Login**: Enter your credentials and check your email for the OTP code
3. **Verify**: Enter the 6-digit code sent to your email

### Creating Learning Materials:
1. **Choose Topic**: What you want to learn about
2. **Set Goal**: Your learning objective
3. **Select Level**: Beginner, Intermediate, or Advanced
4. **Add Source** (Optional): Paste any documents you want to learn from
5. **Pick Style**: Flashcards, Quiz, Study Guide, or Assignments
6. **Generate**: Click "Generate Learning Material"

### Managing Sessions:
- View all your saved sessions in the "My Sessions" tab
- Click any session to review the content
- Delete sessions you no longer need
- Sessions are automatically saved when generated

## 🔧 Troubleshooting

### Common Issues:

**Database Connection Error:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL if needed
sudo systemctl start postgresql
```

**Gemini API Error:**
- Verify your API key is correct in `.env`
- Check if you have API quota remaining
- Ensure the key has proper permissions

**Email Not Sending:**
- Verify Gmail app password (not regular password)
- Check if 2FA is enabled on your Google account
- Confirm email settings in `.env`

**Port Already in Use:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Reset Database:
```sql
-- Connect to PostgreSQL
sudo -u postgres psql

-- Drop and recreate database
DROP DATABASE learningpal;
CREATE DATABASE learningpal;
GRANT ALL PRIVILEGES ON DATABASE learningpal TO learningpal_user;
```

## 📁 Project Structure

```
LearningPal/
├── backend/
│   ├── routes/
│   │   ├── auth.js          # Authentication endpoints
│   │   └── learning.js      # Learning material generation
│   ├── server.js            # Main server file
│   ├── package.json         # Dependencies
│   └── .env                 # Environment variables
├── frontend/
│   ├── auth_page.html       # Login/Register page
│   ├── home_page.html       # Main dashboard
│   ├── learning_session.html # Content display page
│   ├── js/
│   │   ├── auth_page.js     # Authentication logic
│   │   ├── home_page.js     # Dashboard functionality
│   │   └── learning_session.js # Content display logic
│   └── styles/
│       └── styles.css       # Application styling
└── README.md
```

## 🔐 Security Features

- **JWT Authentication** with 24-hour expiration
- **Email-based 2FA** with 10-minute OTP expiration
- **Input Validation** to prevent malicious content
- **SQL Injection Prevention** using parameterized queries
- **Password Hashing** using bcrypt with salt rounds
- **User Session Isolation** - users can only access their own data

## 🌟 Cost Optimization

- **Gemini 1.5 Flash** - Cost-effective AI model
- **Local PostgreSQL** - No cloud database costs
- **Efficient Queries** - Proper indexing and optimized database queries
- **Session Caching** - Reduces redundant API calls

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Ensure all prerequisites are installed
4. Check server logs for specific error messages

## 🚀 Deployment

For production deployment, consider:

- Using environment-specific configurations
- Setting up SSL/HTTPS
- Using a production-grade database setup
- Implementing proper logging and monitoring
- Setting up automated backups

---

**Made with ❤️ for learners everywhere**