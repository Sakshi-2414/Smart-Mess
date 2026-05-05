/* Smart Mess v2 — Admin Login */
// Before (trusts any value, even garbage/expired)
if (localStorage.getItem('sm_token')) window.location.href = 'admin.html';

// After (only redirects if token has 3 JWT segments — header.payload.signature)
const _t = localStorage.getItem('sm_token');
if (_t && _t.split('.').length === 3) window.location.href = 'admin.html';

const API = 'http://localhost:5000';

function setAlert(msg, type) {
  const el = document.getElementById('login-alert');
  if (!el) return;
  el.innerHTML = msg
    ? `<div class="alert alert-${type}"><span>${type==='success'?'✅':'❌'}</span>${msg}</div>`
    : '';
}

// Toggle password visibility
document.getElementById('toggle-pw')?.addEventListener('click', () => {
  const pw  = document.getElementById('password');
  const btn = document.getElementById('toggle-pw');
  if (!pw) return;
  pw.type = pw.type === 'password' ? 'text' : 'password';
  btn.textContent = pw.type === 'password' ? '👁️' : '🙈';
});

// Login form submit
document.getElementById('login-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  setAlert('', '');

  const username = document.getElementById('username')?.value.trim();
  const password = document.getElementById('password')?.value;

  if (!username || !password) {
    setAlert('Please enter both username and password.', 'error');
    return;
  }

  const btn     = document.getElementById('login-btn');
  const content = document.getElementById('login-content');
  btn.disabled  = true;
  content.innerHTML = '<span class="spinner"></span> Signing in…';

  try {
    const res  = await fetch(`${API}/api/admin/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem('sm_token',    data.token);
      localStorage.setItem('sm_username', data.admin.username);
      setAlert('Login successful! Redirecting…', 'success');
      setTimeout(() => { window.location.href = 'admin.html'; }, 700);
    } else {
      setAlert(data.message || 'Invalid credentials.', 'error');
      btn.disabled = false;
      content.innerHTML = '🚀 Sign In to Dashboard';
    }
  } catch {
    setAlert('⚠️ Cannot connect to server. Make sure the backend is running on port 5000.', 'error');
    btn.disabled = false;
    content.innerHTML = '🚀 Sign In to Dashboard';
  }
});
