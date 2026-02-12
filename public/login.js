// Login form handling
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
const loginBtn = document.getElementById('loginBtn');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  
  // Hide previous errors
  errorMessage.style.display = 'none';
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';
  
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      // Success - redirect to main page
      window.location.href = '/';
    } else {
      // Show error message
      errorMessage.textContent = data.error || 'Invalid username or password';
      errorMessage.style.display = 'block';
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
    }
  } catch (error) {
    errorMessage.textContent = 'An error occurred. Please try again.';
    errorMessage.style.display = 'block';
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
});

// Clear error on input
document.getElementById('username').addEventListener('input', () => {
  errorMessage.style.display = 'none';
});

document.getElementById('password').addEventListener('input', () => {
  errorMessage.style.display = 'none';
});

// Focus username field on load
window.addEventListener('load', () => {
  document.getElementById('username').focus();
});

// Registration form handling
const registerBtn = document.getElementById('registerBtn');
const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const cancelRegisterBtn = document.getElementById('cancelRegisterBtn');
const registerSubmitBtn = document.getElementById('registerSubmitBtn');
const registerErrorMessage = document.getElementById('registerErrorMessage');

if (registerBtn) {
  registerBtn.addEventListener('click', () => {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    document.getElementById('regUsername').focus();
  });
}

if (cancelRegisterBtn) {
  cancelRegisterBtn.addEventListener('click', () => {
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    registerForm.reset();
    registerErrorMessage.style.display = 'none';
  });
}

if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const email = document.getElementById('regEmail').value.trim();
    
    // Hide previous errors
    registerErrorMessage.style.display = 'none';
    registerSubmitBtn.disabled = true;
    registerSubmitBtn.textContent = 'Creating account...';
    
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, email })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Success - redirect to main page
        window.location.href = '/';
      } else {
        // Show error message
        registerErrorMessage.textContent = data.error || 'Registration failed';
        registerErrorMessage.style.display = 'block';
        registerSubmitBtn.disabled = false;
        registerSubmitBtn.textContent = 'Create Account';
      }
    } catch (error) {
      registerErrorMessage.textContent = 'An error occurred. Please try again.';
      registerErrorMessage.style.display = 'block';
      registerSubmitBtn.disabled = false;
      registerSubmitBtn.textContent = 'Create Account';
    }
  });
}
