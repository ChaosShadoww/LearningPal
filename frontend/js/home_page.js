/*


Displays the text: How may I help you learn today

User has the option to input source document to learn that information or provide an input of the topic that they want to learn in the input box



Input box 1: what topic user wants to learn about
Input box 2: what is their desired goal
Input box 3: what is User's current level of understanding on the topic
Input box 4: optional input of source document
Input box 5: learning style



there also needs to be an input box checker.
if the user inputs any malicous topics or tries to input any malicous scripts, return text:"Inappropriate input, please try again"


learning styles are: Flashcards, Practice Quizes, Study Guide, Practice Assignments









*/


// Input validation function
function isInputSafe(input) {
    // Remove whitespace and convert to lowercase for checking
    const cleanInput = input.toLowerCase().trim();
    
    // List of malicious keywords/patterns
    const maliciousPatterns = [
        // Script injection attempts
        '<script', 'javascript:', 'onerror=', 'onload=', 'onclick=',
        // SQL injection attempts
        'drop table', 'delete from', 'insert into', 'select *', 'union select',
        // System commands
        'rm -rf', 'del /f', 'format c:', 'shutdown',
        // Inappropriate content
        'hack', 'exploit', 'malware', 'virus', 'bomb', 'weapon',
        // Add more patterns as needed
    ];
    
    // Check for HTML/XML tags
    const htmlTagRegex = /<[^>]*>/g;
    if (htmlTagRegex.test(input)) {
        return false;
    }
    
    // Check for malicious patterns
    for (const pattern of maliciousPatterns) {
        if (cleanInput.includes(pattern)) {
            return false;
        }
    }
    
    // Check for excessive special characters (potential injection)
    const specialCharCount = (input.match(/[<>'"`;{}()]/g) || []).length;
    if (specialCharCount > input.length * 0.1) { // More than 10% special chars
        return false;
    }
    
    return true;
}

// Validate all form inputs
function validateAllInputs(formData) {
    const inputs = ['topic', 'goal', 'sourceDocument'];
    
    for (const field of inputs) {
        if (formData[field] && !isInputSafe(formData[field])) {
            return false;
        }
    }
    return true;
}

// Show error message
function showError() {
    const errorDiv = document.getElementById('error-message');
    errorDiv.style.display = 'block';
    
    // Hide error after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Show loading state
function showLoading(show = true) {
    const loadingDiv = document.getElementById('loading');
    const generateBtn = document.getElementById('generate-btn');
    
    if (show) {
        loadingDiv.style.display = 'block';
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
    } else {
        loadingDiv.style.display = 'none';
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Learning Material';
    }
}

// Handle form submission
document.getElementById('learning-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    // Collect form data
    const formData = {
        topic: document.getElementById('topic').value,
        goal: document.getElementById('goal').value,
        level: document.getElementById('level').value,
        sourceDocument: document.getElementById('source-document').value,
        learningStyle: document.getElementById('learning-style').value
    };
    
    // Validate inputs
    if (!validateAllInputs(formData)) {
        showError();
        return;
    }
    
    // Show loading state
    showLoading(true);
    
    try {
        // Send data to input_handler
        const response = await fetch('/api/generate-learning-material', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('authToken') // JWT token
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            const result = await response.json();
            // Redirect to results page with session ID
            window.location.href = `/learning-session/${result.sessionId}`;
        } else {
            throw new Error('Failed to generate learning material');
        }
        
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while generating your learning material. Please try again.');
    } finally {
        showLoading(false);
    }
});

// Logout functionality
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('authToken');
    window.location.href = '/auth.html';
});

// Check if user is authenticated on page load
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/auth.html';
    }
});