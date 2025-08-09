


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

// Add login/registration API calls
async function registerUser(userData) {
    const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });
    return response.json();
}

async function loginUser(credentials) {
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
    });
    return response.json();
}




