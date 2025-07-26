// Login page functionality
document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const showRegister = document.getElementById('showRegister');
  const showLogin = document.getElementById('showLogin');

  // Check for Google OAuth token in URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const success = urlParams.get('success');
  const error = urlParams.get('error');

  if (token && success === 'true') {
    // Google OAuth successful
    localStorage.setItem('token', token);
    showMessage('✅ Google login successful! Redirecting...', 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
  } else if (error) {
    // Google OAuth failed
    let errorMessage = 'Login failed. Please try again.';
    if (error === 'google_auth_failed') {
      errorMessage = 'Google authentication failed. Please try again.';
    } else if (error === 'token_generation_failed') {
      errorMessage = 'Token generation failed. Please try again.';
    }
    showMessage(errorMessage, 'error');
  }

  // Switch between login and register forms
  showRegister.addEventListener('click', function(e) {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    clearMessages();
  });

  showLogin.addEventListener('click', function(e) {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    clearMessages();
  });

  // Handle login form submission
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    showMessage('🔄 Logging in...', 'info');

    // Send login request to backend
    fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        localStorage.setItem('token', data.token);
        showMessage('✅ Login successful! Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1500);
      } else {
        showMessage('❌ ' + data.message, 'error');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      showMessage('❌ Login failed. Please check your connection and try again.', 'error');
    });
  });

  // Handle register form submission
  registerForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    if (password !== confirmPassword) {
      showMessage('❌ Passwords do not match!', 'error');
      return;
    }

    if (password.length < 6) {
      showMessage('❌ Password must be at least 6 characters long!', 'error');
      return;
    }

    showMessage('🔄 Creating account...', 'info');

    // Send registration request to backend
    fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        showMessage('✅ Registration successful! Please login.', 'success');
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        registerForm.reset();
        clearMessages();
      } else {
        showMessage('❌ ' + data.message, 'error');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      showMessage('❌ Registration failed. Please check your connection and try again.', 'error');
    });
  });

  // Helper function to show messages
  function showMessage(message, type) {
    clearMessages();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
      padding: 10px 15px;
      margin: 10px 0;
      border-radius: 5px;
      text-align: center;
      font-weight: 500;
    `;
    
    if (type === 'success') {
      messageDiv.style.backgroundColor = '#d4edda';
      messageDiv.style.color = '#155724';
      messageDiv.style.border = '1px solid #c3e6cb';
    } else if (type === 'error') {
      messageDiv.style.backgroundColor = '#f8d7da';
      messageDiv.style.color = '#721c24';
      messageDiv.style.border = '1px solid #f5c6cb';
    } else if (type === 'info') {
      messageDiv.style.backgroundColor = '#d1ecf1';
      messageDiv.style.color = '#0c5460';
      messageDiv.style.border = '1px solid #bee5eb';
    }
    
    const container = document.querySelector('.login-container');
    container.insertBefore(messageDiv, container.firstChild);
  }

  // Helper function to clear messages
  function clearMessages() {
    const messages = document.querySelectorAll('.message');
    messages.forEach(msg => msg.remove());
  }
}); 