/* Smart Mess v2 — Student Portal */
const API = '';

// ── Helpers ──────────────────────────────────────────────────────────────────
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

function showToast(msg, type = 'success') {
  document.getElementById('__toast')?.remove();
  const t = document.createElement('div');
  t.id = '__toast';
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${type==='success'?'✅':'❌'}</span><span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function setAlert(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = msg
    ? `<div class="alert alert-${type}"><span>${type==='success'?'✅':'❌'}</span>${msg}</div>`
    : '';
}

// ── Hero date ─────────────────────────────────────────────────────────────────
const heroDate = document.getElementById('hero-date');
if (heroDate) {
  heroDate.textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

// ── Date picker init ──────────────────────────────────────────────────────────
const menuDateEl = document.getElementById('menu-date');
if (menuDateEl) menuDateEl.value = todayStr();

// ── Meal tab filtering ────────────────────────────────────────────────────────
let currentMenuData = [];
let activeMealFilter = '';

document.querySelectorAll('.menu-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeMealFilter = tab.dataset.meal || '';
    renderMenuCards(currentMenuData);
  });
});

if (menuDateEl) {
  menuDateEl.addEventListener('change', loadMenu);
}

// ── Load Menu ─────────────────────────────────────────────────────────────────
async function loadMenu() {
  const date = menuDateEl?.value || todayStr();
  const grid = document.getElementById('menu-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="card"><div class="skeleton" style="height:20px;width:50%;margin-bottom:14px;"></div><div class="skeleton"></div><div class="skeleton" style="width:80%;"></div></div>
    <div class="card"><div class="skeleton" style="height:20px;width:50%;margin-bottom:14px;"></div><div class="skeleton"></div><div class="skeleton" style="width:80%;"></div></div>
    <div class="card"><div class="skeleton" style="height:20px;width:50%;margin-bottom:14px;"></div><div class="skeleton"></div><div class="skeleton" style="width:80%;"></div></div>
  `;

  try {
    const res  = await fetch(`${API}/api/menu?date=${date}`);
    const data = await res.json();
    currentMenuData = data.data || [];
    renderMenuCards(currentMenuData);
  } catch {
    grid.innerHTML = `<div class="card" style="grid-column:1/-1;text-align:center;padding:40px;color:var(--red);">⚠️ Failed to load menu. Make sure the backend is running on port 5000.</div>`;
  }
}

function renderMenuCards(menus) {
  const grid = document.getElementById('menu-grid');
  if (!grid) return;

  const mealConfig = [
    { type: 'Breakfast', css: 'breakfast', icon: '🌅', time: '7:30 – 9:30 AM' },
    { type: 'Lunch',     css: 'lunch',     icon: '☀️', time: '12:30 – 2:30 PM' },
    { type: 'Dinner',    css: 'dinner',    icon: '🌙', time: '7:30 – 9:30 PM'  },
  ];

  const filtered = activeMealFilter
    ? mealConfig.filter(m => m.type === activeMealFilter)
    : mealConfig;

  grid.innerHTML = filtered.map(({ type, css, icon, time }) => {
    const entry = menus.find(m => m.meal_type === type);
    const items = entry?.items?.length
      ? entry.items.map(i => `<li>${escHtml(i)}</li>`).join('')
      : `<li style="color:var(--text-muted);list-style:none;padding:12px 0;">No menu set for ${type}</li>`;
    return `
      <div class="card menu-card ${css}">
        <div class="menu-card-stripe"></div>
        <div class="menu-card-head">
          <div class="meal-icon-wrap">${icon}</div>
          <div>
            <h3>${type}</h3>
            <div class="meal-time">⏰ ${time}</div>
          </div>
        </div>
        <ul class="menu-items">${items}</ul>
      </div>`;
  }).join('');
}

loadMenu();

// ── Star Rating ───────────────────────────────────────────────────────────────
const ratingLabels = {
  1: '😖 Terrible — Very poor quality',
  2: '😕 Poor — Below expectations',
  3: '😐 Average — Could be better',
  4: '😊 Good — Satisfied with the meal',
  5: '🤩 Excellent — Outstanding!',
};
document.querySelectorAll('input[name="rating"]').forEach(inp => {
  inp.addEventListener('change', () => {
    const hint = document.getElementById('rating-hint');
    if (hint) hint.textContent = ratingLabels[inp.value] || '';
  });
});

// ── Char counter ──────────────────────────────────────────────────────────────
const fbTextarea = document.getElementById('feedback-text');
const charCounter = document.getElementById('char-counter');
if (fbTextarea && charCounter) {
  fbTextarea.addEventListener('input', () => {
    const len = fbTextarea.value.length;
    charCounter.textContent = `${len} / 1000`;
    charCounter.className = `char-counter${len > 900 ? ' over' : len > 750 ? ' warn' : ''}`;
  });
}

// ── Voice Input ───────────────────────────────────────────────────────────────
const voiceBtn  = document.getElementById('voice-btn');
const vbtnText  = document.getElementById('vbtn-text');
let recognition, isRecording = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-IN';

  recognition.onstart = () => {
    isRecording = true;
    voiceBtn?.classList.add('recording');
    if (vbtnText) vbtnText.textContent = 'Listening…';
  };
  recognition.onresult = e => {
    let t = '';
    for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
    if (fbTextarea) {
      fbTextarea.value = (fbTextarea.value + ' ' + t).trim();
      fbTextarea.dispatchEvent(new Event('input'));
    }
  };
  recognition.onerror = e => { stopVoice(); if (e.error !== 'aborted') showToast(`Mic error: ${e.error}`, 'error'); };
  recognition.onend = stopVoice;
} else if (voiceBtn) {
  voiceBtn.disabled = true;
  voiceBtn.title = 'Voice input not supported in this browser';
}

function stopVoice() {
  isRecording = false;
  voiceBtn?.classList.remove('recording');
  if (vbtnText) vbtnText.textContent = 'Speak';
}

voiceBtn?.addEventListener('click', () => {
  if (!recognition) return;
  isRecording ? recognition.stop() : recognition.start();
});

// ── Feedback Form ─────────────────────────────────────────────────────────────
document.getElementById('feedback-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  setAlert('form-alert', '', '');

  const meal_type    = document.querySelector('input[name="meal_type"]:checked')?.value;
  const rating       = document.querySelector('input[name="rating"]:checked')?.value;
  const feedback_text = fbTextarea?.value.trim();

  if (!meal_type)             return setAlert('form-alert', 'Please select a meal type.', 'error');
  if (!rating)                return setAlert('form-alert', 'Please give a star rating.', 'error');
  if (!feedback_text || feedback_text.length < 5)
                              return setAlert('form-alert', 'Please write at least 5 characters of feedback.', 'error');

  const btn = document.getElementById('submit-btn');
  const content = document.getElementById('submit-content');
  btn.disabled = true;
  content.innerHTML = '<span class="spinner"></span> Submitting…';

  try {
    const res  = await fetch(`${API}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: parseInt(rating, 10), feedback_text, meal_type }),
    });
    const data = await res.json();

    if (data.success) {
      const sentMap = {
        Positive: '😊 Your feedback was detected as <strong>Positive</strong>. Glad you enjoyed!',
        Negative: '😟 Detected as <strong>Negative</strong>. We will work on improving.',
        Neutral:  '😐 Detected as <strong>Neutral</strong>. Thank you for sharing.',
      };
      document.getElementById('modal-sentiment').innerHTML = sentMap[data.data?.sentiment] || '';
      document.getElementById('success-modal').style.display = 'flex';

      // Reset form
      e.target.reset();
      if (fbTextarea) fbTextarea.value = '';
      if (charCounter) charCounter.textContent = '0 / 1000';
      const hint = document.getElementById('rating-hint');
      if (hint) hint.textContent = 'Tap a star to rate your meal';
    } else {
      setAlert('form-alert', data.message || 'Submission failed.', 'error');
    }
  } catch {
    setAlert('form-alert', '⚠️ Cannot connect to server. Make sure the backend is running on port 5000.', 'error');
  } finally {
    btn.disabled = false;
    content.innerHTML = '📤 Submit Feedback';
  }
});

// ── Success modal ─────────────────────────────────────────────────────────────
function closeSuccessModal() {
  const m = document.getElementById('success-modal');
  if (m) m.style.display = 'none';
}
document.getElementById('success-modal')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeSuccessModal();
});

// ── Utility ───────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
