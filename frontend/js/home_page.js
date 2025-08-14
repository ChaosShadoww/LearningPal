/*
Home page functionality with saved sessions management
*/

// DOM Elements
const createTab = document.getElementById('create-tab');
const sessionsTab = document.getElementById('sessions-tab');
const createSection = document.getElementById('create-section');
const sessionsSection = document.getElementById('sessions-section');
const sessionsList = document.getElementById('sessions-list');
const noSessionsDiv = document.getElementById('no-sessions');
const sessionsLoading = document.getElementById('sessions-loading');
const refreshSessionsBtn = document.getElementById('refresh-sessions');
const createFirstSessionBtn = document.getElementById('create-first-session');

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

// Tab switching functionality
function switchToCreateTab() {
    createTab.classList.add('active');
    sessionsTab.classList.remove('active');
    createSection.style.display = 'block';
    sessionsSection.style.display = 'none';
}

function switchToSessionsTab() {
    createTab.classList.remove('active');
    sessionsTab.classList.add('active');
    createSection.style.display = 'none';
    sessionsSection.style.display = 'block';
    loadUserSessions();
}

// Load user sessions
async function loadUserSessions() {
    try {
        sessionsLoading.style.display = 'block';
        sessionsList.style.display = 'none';
        noSessionsDiv.style.display = 'none';

        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch('/api/user-sessions', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load sessions');
        }

        const sessions = await response.json();
        displaySessions(sessions);

    } catch (error) {
        console.error('Error loading sessions:', error);
        alert('Failed to load your sessions. Please try again.');
    } finally {
        sessionsLoading.style.display = 'none';
    }
}

// Display sessions list
function displaySessions(sessions) {
    if (!sessions || sessions.length === 0) {
        noSessionsDiv.style.display = 'block';
        sessionsList.style.display = 'none';
        return;
    }

    noSessionsDiv.style.display = 'none';
    sessionsList.style.display = 'block';
    
    sessionsList.innerHTML = sessions.map(session => `
        <div class="session-card" onclick="openSession('${session.sessionId}')">
            <div class="session-header">
                <h4 class="session-topic">${escapeHtml(session.topic)}</h4>
                <span class="session-style">${session.learningStyle}</span>
            </div>
            <div class="session-meta">
                <span class="session-date">${formatDate(session.createdAt)}</span>
                <span class="session-actions">
                    <button onclick="event.stopPropagation(); deleteSession('${session.sessionId}')" class="delete-btn" title="Delete session">🗑️</button>
                </span>
            </div>
        </div>
    `).join('');
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Open session
function openSession(sessionId) {
    window.location.href = `/learning-session/${sessionId}`;
}

// Delete session
async function deleteSession(sessionId) {
    if (!confirm('Are you sure you want to delete this session?')) {
        return;
    }

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/learning-session/${sessionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            loadUserSessions(); // Reload the list
        } else {
            throw new Error('Failed to delete session');
        }

    } catch (error) {
        console.error('Error deleting session:', error);
        alert('Failed to delete session. Please try again.');
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
        // Get token from localStorage
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('No authentication token found');
        }
        
        // Send data to input_handler
        const response = await fetch('/api/generate-learning-material', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            const result = await response.json();
            // Redirect to results page with session ID
            window.location.href = `/learning-session/${result.sessionId}`;
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to generate learning material');
        }
        
    } catch (error) {
        console.error('Error:', error);
        
        // Handle specific error cases
        if (error.message.includes('No authentication token') || error.message.includes('Unauthorized')) {
            alert('Your session has expired. Please log in again.');
            localStorage.removeItem('authToken');
            window.location.href = '/auth.html';
        } else {
            alert('An error occurred while generating your learning material. Please try again.');
        }
    } finally {
        showLoading(false);
    }
});

// Event listeners
createTab.addEventListener('click', switchToCreateTab);
sessionsTab.addEventListener('click', switchToSessionsTab);
refreshSessionsBtn.addEventListener('click', loadUserSessions);
createFirstSessionBtn.addEventListener('click', switchToCreateTab);

// Logout functionality
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('authToken');
    window.location.href = '/auth.html';
});

// Check if user is authenticated on page load
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/auth.html';
        return;
    }

    // Try to get user info from token (optional enhancement)
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userNameSpan = document.getElementById('user-name');
        if (userNameSpan && payload.name) {
            userNameSpan.textContent = `Welcome, ${payload.name}!`;
        }
    } catch (error) {
        console.log('Could not parse user info from token');
    }
});