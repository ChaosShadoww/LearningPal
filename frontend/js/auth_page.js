// Password validation (stays here)
function isValidPassword(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
}

// Show/hide forms
function showForm(formType) {
    const forms = document.querySelectorAll('.auth-form');
    forms.forEach(form => form.classList.remove('active'));
    
    document.getElementById(`${formType}-form`).classList.add('active');
}

// Show loading state
function showLoading(show = true) {
    const loadingDiv = document.getElementById('auth-loading');
    loadingDiv.style.display = show ? 'flex' : 'none';
}

// Show message
function showMessage(message, type = 'error') {
    const messageDiv = document.getElementById('auth-message');
    messageDiv.textContent = message;
    messageDiv.className = `auth-message ${type}`;
    messageDiv.style.display = 'block';
    
    // Hide message after 5 seconds
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Registration form handler
document.getElementById('register').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    
    // Validate password
    if (!isValidPassword(password)) {
        showMessage('Password does not meet security criteria.');
        return;
    }
    
    // Check password confirmation
    if (password !== confirmPassword) {
        showMessage('Passwords do not match.');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: formData.get('name'),
                email: formData.get('email'),
                password: password
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('Account created successfully! Please sign in.', 'success');
            setTimeout(() => showForm('login'), 2000);
        } else {
            showMessage(result.message || 'Registration failed. Please try again.');
        }
    } catch (error) {
        showMessage('Network error. Please try again.');
    } finally {
        showLoading(false);
    }
});

// Login form handler
document.getElementById('login').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    showLoading(true);
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: formData.get('email'),
                password: formData.get('password')
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            if (result.requiresMFA) {
                // Store temporary session for MFA
                sessionStorage.setItem('tempSession', result.tempToken);
                showForm('mfa');
                showMessage('Verification code sent to your email.', 'success');
            } else {
                // Direct login success
                localStorage.setItem('authToken', result.token);
                window.location.href = '/home.html';
            }
        } else {
            showMessage(result.message || 'Login failed. Please check your credentials.');
        }
    } catch (error) {
        showMessage('Network error. Please try again.');
    } finally {
        showLoading(false);
    }
});

// MFA form handler
document.getElementById('mfa').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const tempToken = sessionStorage.getItem('tempSession');
    
    if (!tempToken) {
        showMessage('Session expired. Please login again.');
        showForm('login');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('/api/verify-mfa', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tempToken}`
            },
            body: JSON.stringify({
                mfaCode: formData.get('mfaCode')
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // MFA verification successful
            localStorage.setItem('authToken', result.token);
            sessionStorage.removeItem('tempSession');
            showMessage('Login successful!', 'success');
            setTimeout(() => {
                window.location.href = '/home.html';
            }, 1000);
        } else {
            showMessage(result.message || 'Invalid verification code.');
        }
    } catch (error) {
        showMessage('Network error. Please try again.');
    } finally {
        showLoading(false);
    }
});

// Form switching
document.getElementById('show-register').addEventListener('click', () => {
    showForm('register');
});

document.getElementById('show-login').addEventListener('click', () => {
    showForm('login');
});

// Resend MFA code
document.getElementById('resend-code').addEventListener('click', async () => {
    const tempToken = sessionStorage.getItem('tempSession');
    
    if (!tempToken) {
        showMessage('Session expired. Please login again.');
        showForm('login');
        return;
    }
    
    try {
        const response = await fetch('/api/resend-mfa', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${tempToken}`
            }
        });
        
        if (response.ok) {
            showMessage('New verification code sent!', 'success');
        } else {
            showMessage('Failed to resend code. Please try again.');
        }
    } catch (error) {
        showMessage('Network error. Please try again.');
    }
});

// Check if user is already authenticated
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (token) {
        // User is already logged in, redirect to home
        window.location.href = '/home.html';
    }
    
    // Add input formatting for MFA code
    const mfaInput = document.getElementById('mfa-code');
    mfaInput.addEventListener('input', (e) => {
        // Only allow numbers
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
});


