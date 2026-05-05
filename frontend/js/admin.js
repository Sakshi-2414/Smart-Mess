/* Smart Mess v2 — Admin Dashboard */
const API = 'http://localhost:5000';
const TOKEN    = localStorage.getItem('sm_token');

// ── Auth Guard ────────────────────────────────────────────────────────────────
(async () => {
  if (!TOKEN) { return redirect(); }
  try {
    const res = await fetch(`${API}/api/admin/profile`, { headers: authHeaders() });
    if (!res.ok) return redirect();
    const data = await res.json();
    document.getElementById('admin-name').textContent   = data.admin.username;
    document.getElementById('admin-avatar').textContent = data.admin.username[0].toUpperCase();
  } catch { return redirect(); }
  document.getElementById('auth-overlay').style.display = 'none';
  initDashboard();
})();

// Before (left bad token in storage — loop continues)
function redirect() { window.location.href = 'login.html'; }

// After (clears token first — loop is broken)
function redirect() {
  localStorage.removeItem('sm_token');
  localStorage.removeItem('sm_username');
  window.location.href = 'login.html';
}
function logout()   { localStorage.removeItem('sm_token'); localStorage.removeItem('sm_username'); redirect(); }
function authHeaders() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` }; }

// ── State ─────────────────────────────────────────────────────────────────────
let analyticsData  = null;
let allFeedback    = [];
let feedbackCache  = [];
let currentPage    = 1;
const PAGE_SIZE    = 15;
let currentPeriod  = 'weekly';

// Chart instances
let charts = {};

// ── Init ──────────────────────────────────────────────────────────────────────
async function initDashboard() {
  const now = new Date();
  document.getElementById('topbar-date').textContent = now.toLocaleDateString('en-IN', { weekday:'short', year:'numeric', month:'short', day:'numeric' });
  document.getElementById('report-date-sub').textContent = `Auto-generated for ${now.toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}`;

  const td = toDateStr(now);
  const menuDateEl = document.getElementById('menu-date');
  const previewEl  = document.getElementById('preview-date');
  if (menuDateEl) menuDateEl.value = td;
  if (previewEl)  previewEl.value  = td;

  await Promise.all([fetchAnalytics(), fetchAllFeedback()]);
  loadMenuPreview();
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── API ───────────────────────────────────────────────────────────────────────
async function fetchAnalytics() {
  try {
    const res  = await fetch(`${API}/api/analytics?period=${currentPeriod}`, { headers: authHeaders() });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    analyticsData = data.data;
    renderDashboard();
    renderAnalyticsPage();
    renderKeywordsPage();
    renderReportPage();
  } catch (err) { console.error('Analytics:', err); }
}

async function fetchAllFeedback() {
  try {
    const res  = await fetch(`${API}/api/feedback?limit=500`, { headers: authHeaders() });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    allFeedback = data.data || [];
    renderFeedbackTable();
  } catch (err) { console.error('Feedback:', err); }
}

async function refreshData() {
  await Promise.all([fetchAnalytics(), fetchAllFeedback()]);
  loadMenuPreview();
  showToast('Dashboard refreshed!', 'success');
}

// ── Navigation ────────────────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const page = document.getElementById(`page-${name}`);
  if (page) { page.classList.add('active'); page.style.display = 'block'; }

  document.querySelector(`[data-page="${name}"]`)?.classList.add('active');

  const titles = { dashboard:'Dashboard', feedback:'All Feedback', analytics:'Charts & Trends', keywords:'Keyword Insights', report:'Daily Report', menu:'Menu Manager' };
  document.getElementById('topbar-title').textContent = titles[name] || name;

  if (name === 'analytics') renderAnalyticsPage();
  if (name === 'keywords')  renderKeywordsPage();
  if (name === 'report')    renderReportPage();
  if (window.innerWidth < 768) toggleSidebar(false);
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
let sidebarOpen = false;
function toggleSidebar(force) {
  sidebarOpen = force !== undefined ? force : !sidebarOpen;
  document.getElementById('sidebar').classList.toggle('open', sidebarOpen);
  const ov = document.getElementById('sidebar-overlay');
  if (ov) ov.style.display = sidebarOpen ? 'block' : 'none';
}

// ── Period ────────────────────────────────────────────────────────────────────
function setPeriod(period) {
  currentPeriod = period;
  document.querySelectorAll('.period-tab').forEach(t => {
    t.classList.toggle('active',
      (period === 'weekly' && t.textContent.includes('7')) ||
      (period === 'monthly' && t.textContent.includes('30'))
    );
  });
  fetchAnalytics();
}

// ── Dashboard render ──────────────────────────────────────────────────────────
function renderDashboard() {
  if (!analyticsData) return;
  const { overall, today, trend } = analyticsData;

  // Stat cards
  setText('s-total', overall.totalFeedback);
  setText('s-avg',   overall.avgRating.toFixed(1));
  setText('s-pos',   overall.sentimentDist.Positive || 0);
  setText('s-neg',   overall.sentimentDist.Negative || 0);
  setText('s-neu',   overall.sentimentDist.Neutral  || 0);
  setText('s-today-count', `Today: ${today.totalFeedback} responses`);

  const diff = today.yesterdayAvg !== null ? today.avgRating - today.yesterdayAvg : null;
  const trendEl = document.getElementById('s-today-avg');
  if (trendEl && diff !== null && Math.abs(diff) >= 0.05) {
    const cls = diff > 0 ? 'trend-up' : 'trend-down';
    trendEl.innerHTML = `<span class="${cls}">${diff > 0 ? '▲' : '▼'} ${Math.abs(diff).toFixed(1)} vs yesterday</span>`;
  } else if (trendEl) {
    trendEl.innerHTML = `<span class="trend-flat">Today: ${today.avgRating.toFixed(1)}/5</span>`;
  }

  // Meal mini-cards
  const miniGrid = document.getElementById('meal-mini-grid');
  if (miniGrid) {
    const icons = { Breakfast:'🌅', Lunch:'☀️', Dinner:'🌙' };
    miniGrid.innerHTML = today.mealStats.length
      ? today.mealStats.map(({ meal_type, avgRating, count }) => `
          <div class="meal-mini-card">
            <div class="meal-mini-top">
              <span class="meal-mini-icon">${icons[meal_type]||'🍽️'}</span>
              <span class="meal-mini-name">${meal_type}</span>
            </div>
            <div class="meal-mini-rating">${avgRating.toFixed(1)}<span style="font-size:0.9rem;color:var(--text-muted)">/5</span></div>
            <div class="meal-mini-count">${count} response${count!==1?'s':''} today</div>
          </div>`).join('')
      : `<p style="color:var(--text-muted);font-size:0.88rem;padding:10px 0;">No feedback submitted today yet.</p>`;
  }

  // Charts
  renderTrendChart('trend-chart',     trend,               'charts.trend',     c => charts.trend     = c);
  renderSentChart( 'sentiment-chart', overall.sentimentDist,'charts.sentiment', c => charts.sentiment = c);
  renderMealChart( 'meal-chart',      overall.mealStats,   'charts.meal',      c => charts.meal      = c);
}

// ── Chart helpers ─────────────────────────────────────────────────────────────
const CHART_FONT = { family: "'Inter', system-ui, sans-serif", size: 11 };
const gridColor  = 'rgba(168,85,247,0.1)';

function destroyChart(key) {
  if (charts[key]) { try { charts[key].destroy(); } catch {} charts[key] = null; }
}

function renderTrendChart(canvasId, trend, key, setter) {
  destroyChart(key);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trend.labels.map(fmtDate),
      datasets: [{
        label: 'Avg Rating',
        data:  trend.values,
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168,85,247,0.08)',
        fill: true, tension: 0.4, spanGaps: true,
        pointBackgroundColor: '#a855f7', pointRadius: 4, pointHoverRadius: 6,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 5, ticks: { stepSize: 1, color: '#7c6fa0', font: CHART_FONT }, grid: { color: gridColor }, border: { display: false } },
        x: { ticks: { color: '#7c6fa0', font: CHART_FONT }, grid: { display: false }, border: { display: false } },
      },
    },
  });
  setter(chart);
  charts[key] = chart;
}

function renderSentChart(canvasId, dist, key, setter) {
  destroyChart(key);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;
  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Positive','Negative','Neutral'],
      datasets: [{ data: [dist.Positive||0, dist.Negative||0, dist.Neutral||0], backgroundColor: ['#10b981','#ef4444','#6b7280'], borderWidth: 0, hoverOffset: 6 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '64%',
      plugins: { legend: { position: 'bottom', labels: { padding: 14, color: '#b8aee0', font: CHART_FONT } } },
    },
  });
  setter(chart);
  charts[key] = chart;
}

function renderMealChart(canvasId, mealStats, key, setter) {
  destroyChart(key);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;
  const colors = { Breakfast:'#f97316', Lunch:'#10b981', Dinner:'#a855f7' };
  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: mealStats.map(m => m.meal_type),
      datasets: [{ label: 'Avg Rating', data: mealStats.map(m => m.avgRating), backgroundColor: mealStats.map(m => colors[m.meal_type]||'#a855f7'), borderRadius: 8, maxBarThickness: 60 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 5, ticks: { stepSize: 1, color: '#7c6fa0', font: CHART_FONT }, grid: { color: gridColor }, border: { display: false } },
        x: { ticks: { color: '#7c6fa0', font: CHART_FONT }, grid: { display: false }, border: { display: false } },
      },
    },
  });
  setter(chart);
  charts[key] = chart;
}

// ── Analytics page ────────────────────────────────────────────────────────────
function renderAnalyticsPage() {
  if (!analyticsData) return;
  const { overall, trend, mealSentiment } = analyticsData;

  renderTrendChart('trend-chart-2',     trend,                'charts.trend2',   c => charts.trend2     = c);
  renderSentChart( 'sentiment-chart-2', overall.sentimentDist,'charts.sent2',    c => charts.sent2      = c);

  destroyChart('charts.mealSent');
  const ctx = document.getElementById('meal-sent-chart')?.getContext('2d');
  if (ctx) {
    const keys = Object.keys(mealSentiment);
    charts['charts.mealSent'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: keys,
        datasets: [
          { label: 'Positive', data: keys.map(k => mealSentiment[k]?.Positive||0), backgroundColor: '#10b981', borderRadius: 4 },
          { label: 'Neutral',  data: keys.map(k => mealSentiment[k]?.Neutral ||0), backgroundColor: '#6b7280', borderRadius: 4 },
          { label: 'Negative', data: keys.map(k => mealSentiment[k]?.Negative||0), backgroundColor: '#ef4444', borderRadius: 4 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#b8aee0', font: CHART_FONT, padding: 12 } } },
        scales: {
          x: { stacked: true, ticks: { color: '#7c6fa0', font: CHART_FONT }, grid: { display: false }, border: { display: false } },
          y: { stacked: true, ticks: { color: '#7c6fa0', font: CHART_FONT }, grid: { color: gridColor }, border: { display: false } },
        },
      },
    });
  }
}

// ── Keywords page ─────────────────────────────────────────────────────────────
function renderKeywordsPage() {
  if (!analyticsData) return;
  const { topKeywords } = analyticsData;

  const listEl = document.getElementById('kw-list');
  if (listEl) {
    listEl.innerHTML = topKeywords.length
      ? topKeywords.slice(0,10).map(({ keyword, count }, i) => `
          <div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--border);">
            <div style="font-weight:800;color:var(--accent);width:22px;text-align:center;font-size:0.85rem;">${i+1}</div>
            <div style="flex:1;">
              <div style="font-weight:600;font-size:0.9rem;margin-bottom:5px;">${escHtml(keyword)}</div>
              <div style="height:5px;background:var(--surface-3);border-radius:99px;">
                <div style="height:100%;background:var(--accent);border-radius:99px;width:${Math.min(100,(count/(topKeywords[0]?.count||1))*100)}%;"></div>
              </div>
            </div>
            <div style="font-weight:700;color:var(--orange);font-size:0.85rem;">${count}×</div>
          </div>`).join('')
      : '<p style="color:var(--text-muted);text-align:center;padding:24px;">No complaint keywords found yet.</p>';
  }

  const cloudEl = document.getElementById('kw-cloud');
  if (cloudEl) {
    cloudEl.innerHTML = topKeywords.length
      ? topKeywords.map(({ keyword, count }) => `<span class="keyword-tag">${escHtml(keyword)}<span class="kw-count">${count}</span></span>`).join('')
      : '<span style="color:var(--text-muted);">No keywords extracted yet.</span>';
  }

  destroyChart('charts.kw');
  const ctx = document.getElementById('kw-chart')?.getContext('2d');
  if (ctx && topKeywords.length) {
    const top = topKeywords.slice(0, 10);
    charts['charts.kw'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top.map(k => k.keyword),
        datasets: [{ label: 'Mentions', data: top.map(k => k.count), backgroundColor: '#a855f7', borderRadius: 6 }],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#7c6fa0', font: CHART_FONT, precision: 0 }, grid: { color: gridColor }, border: { display: false } },
          y: { ticks: { color: '#b8aee0', font: { ...CHART_FONT, size: 12 } }, grid: { display: false }, border: { display: false } },
        },
      },
    });
  }
}

// ── Report page ───────────────────────────────────────────────────────────────
function renderReportPage() {
  if (!analyticsData) return;
  const { today, trend, dailySummary } = analyticsData;

  const linesEl = document.getElementById('report-lines');
  if (linesEl) {
    linesEl.innerHTML = dailySummary.map(line =>
      `<div class="report-line">${line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>`
    ).join('');
  }

  setText('rpt-total', today.totalFeedback);
  setText('rpt-avg',   today.avgRating.toFixed(1));
  setText('rpt-pos',   today.sentimentDist.Positive || 0);
  setText('rpt-neg',   today.sentimentDist.Negative || 0);

  renderTrendChart('rpt-trend', trend,               'charts.rptTrend', c => charts['charts.rptTrend'] = c);
  renderSentChart( 'rpt-sent',  today.sentimentDist, 'charts.rptSent',  c => charts['charts.rptSent']  = c);
}

// ── Feedback Table ────────────────────────────────────────────────────────────
function renderFeedbackTable() {
  const search = (document.getElementById('fb-search')?.value || '').toLowerCase();
  const meal   = document.getElementById('fb-meal')?.value  || '';
  const sent   = document.getElementById('fb-sent')?.value  || '';
  const date   = document.getElementById('fb-date')?.value  || '';

  const filtered = allFeedback.filter(fb => {
    if (meal && fb.meal_type !== meal) return false;
    if (sent && fb.sentiment  !== sent) return false;
    if (date && new Date(fb.date).toISOString().slice(0,10) !== date) return false;
    if (search) return fb.feedback_text.toLowerCase().includes(search) || (fb.keywords||[]).some(k => k.includes(search));
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  if (currentPage > totalPages && totalPages > 0) currentPage = 1;
  feedbackCache = filtered.slice((currentPage-1)*PAGE_SIZE, currentPage*PAGE_SIZE);

  const tbody = document.getElementById('fb-tbody');
  if (!tbody) return;

  if (!feedbackCache.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><span class="empty-icon">💬</span><p>No feedback found matching your filters.</p></div></td></tr>`;
    document.getElementById('fb-pagination').innerHTML = '';
    return;
  }

  tbody.innerHTML = feedbackCache.map((fb, idx) => {
    const n      = (currentPage-1)*PAGE_SIZE + idx + 1;
    const d      = new Date(fb.date);
    const ds     = d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
    const ts     = d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
    const stars  = '★'.repeat(fb.rating) + '☆'.repeat(5-fb.rating);
    const kws    = (fb.keywords||[]).slice(0,3).map(k => `<code style="font-size:0.7rem;background:var(--surface-2);padding:1px 5px;border-radius:4px;color:var(--text-muted);">${escHtml(k)}</code>`).join(' ');
    return `
      <tr>
        <td style="color:var(--text-muted);">${n}</td>
        <td style="white-space:nowrap;">${ds}<br/><small style="color:var(--text-muted);">${ts}</small></td>
        <td><span class="badge badge-${fb.meal_type.toLowerCase()}">${escHtml(fb.meal_type)}</span></td>
        <td><span class="stars" style="font-size:0.8rem;">${stars}</span><br/><small style="color:var(--text-muted);">${fb.rating}/5</small></td>
        <td><span class="badge badge-${fb.sentiment.toLowerCase()}">${sentEmoji(fb.sentiment)} ${escHtml(fb.sentiment)}</span></td>
        <td class="text-cell" onclick="openFbByIdx(${idx})">${escHtml(fb.feedback_text.substring(0,80))}${fb.feedback_text.length>80?'…':''}</td>
        <td>${kws}</td>
      </tr>`;
  }).join('');

  renderPagination(totalPages);
}

function renderPagination(total) {
  const el = document.getElementById('fb-pagination');
  if (!el || total <= 1) { if (el) el.innerHTML = ''; return; }
  let html = `<button class="pg-btn" ${currentPage===1?'disabled':''} onclick="goPage(${currentPage-1})">‹</button>`;
  for (let i = 1; i <= total; i++) {
    if (total > 7 && Math.abs(i-currentPage) > 2 && i !== 1 && i !== total) {
      if (i === 2 || i === total-1) html += `<span style="padding:0 4px;color:var(--text-muted);">…</span>`;
      continue;
    }
    html += `<button class="pg-btn ${i===currentPage?'active':''}" onclick="goPage(${i})">${i}</button>`;
  }
  html += `<button class="pg-btn" ${currentPage===total?'disabled':''} onclick="goPage(${currentPage+1})">›</button>`;
  el.innerHTML = html;
}

function goPage(p)     { currentPage = p; renderFeedbackTable(); }
function filterFeedback() { currentPage = 1; renderFeedbackTable(); }
function clearFilters() {
  ['fb-search','fb-meal','fb-sent','fb-date'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  filterFeedback();
}

// ── Feedback modal ────────────────────────────────────────────────────────────
function openFbByIdx(idx) {
  const fb = feedbackCache[idx];
  if (fb) openFbModal(fb);
}

function openFbModal(fb) {
  const d     = new Date(fb.date);
  const stars = '★'.repeat(fb.rating) + '☆'.repeat(5-fb.rating);
  const kws   = (fb.keywords||[]).map(k => `<span class="keyword-tag" style="margin:2px;">${escHtml(k)}</span>`).join('');
  document.getElementById('fb-modal-body').innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
      <span class="badge badge-${fb.meal_type.toLowerCase()}">${escHtml(fb.meal_type)}</span>
      <span class="badge badge-${fb.sentiment.toLowerCase()}">${sentEmoji(fb.sentiment)} ${escHtml(fb.sentiment)}</span>
    </div>
    <div class="stars" style="font-size:1.6rem;margin-bottom:8px;">${stars}</div>
    <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:14px;">
      ${d.toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})} at ${d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
    </p>
    <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:14px;font-size:0.92rem;line-height:1.7;color:var(--text-secondary);">
      "${escHtml(fb.feedback_text)}"
    </div>
    ${kws ? `<div><strong style="font-size:0.82rem;color:var(--text-muted);">Keywords:</strong><div style="margin-top:8px;">${kws}</div></div>` : ''}`;
  document.getElementById('fb-modal').style.display = 'flex';
}

function closeFbModal(e) {
  if (!e || e.target === e.currentTarget || !e.target) {
    document.getElementById('fb-modal').style.display = 'none';
  }
}

// ── Menu Manager ──────────────────────────────────────────────────────────────
let menuItems = [];

document.getElementById('item-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); addItem(); }
});

function addItem() {
  const inp = document.getElementById('item-input');
  const val = inp?.value.trim();
  if (!val || menuItems.includes(val)) { if (inp) inp.value = ''; return; }
  menuItems.push(val);
  if (inp) inp.value = '';
  renderItemTags();
}

function renderItemTags() {
  const el = document.getElementById('items-tags');
  if (!el) return;
  if (!menuItems.length) {
    el.innerHTML = `<span style="color:var(--text-muted);font-size:0.8rem;">No items added yet</span>`;
    return;
  }
  el.innerHTML = menuItems.map((item, i) => `
    <span class="item-tag">${escHtml(item)}<span class="rm" data-idx="${i}">×</span></span>`).join('');
  el.querySelectorAll('.rm').forEach(btn => {
    btn.addEventListener('click', () => { menuItems.splice(parseInt(btn.dataset.idx,10), 1); renderItemTags(); });
  });
}

document.getElementById('menu-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  setFormAlert('menu-alert', '', '');
  const date      = document.getElementById('menu-date')?.value;
  const meal_type = document.getElementById('menu-meal')?.value;
  if (!date)       return setFormAlert('menu-alert', 'Please select a date.', 'error');
  if (!meal_type)  return setFormAlert('menu-alert', 'Please select a meal type.', 'error');
  if (!menuItems.length) return setFormAlert('menu-alert', 'Please add at least one item.', 'error');

  try {
    const res  = await fetch(`${API}/api/menu`, { method:'POST', headers: authHeaders(), body: JSON.stringify({ date, meal_type, items: menuItems }) });
    const data = await res.json();
    if (data.success) {
      setFormAlert('menu-alert', data.message, 'success');
      menuItems = [];
      renderItemTags();
      document.getElementById('menu-meal').value = '';
      loadMenuPreview();
    } else {
      setFormAlert('menu-alert', data.message, 'error');
    }
  } catch { setFormAlert('menu-alert', 'Server error. Please try again.', 'error'); }
});

async function loadMenuPreview() {
  const date    = document.getElementById('preview-date')?.value || toDateStr(new Date());
  const el      = document.getElementById('menu-preview');
  if (!el) return;
  try {
    const res  = await fetch(`${API}/api/menu?date=${date}`, { headers: authHeaders() });
    const data = await res.json();
    if (!data.data || !data.data.length) {
      el.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted);"><div style="font-size:2rem;margin-bottom:8px;">🍽️</div><p>No menu set for ${date}</p></div>`;
      return;
    }
    const icons = { Breakfast:'🌅', Lunch:'☀️', Dinner:'🌙' };
    el.innerHTML = data.data.map(({ meal_type, items, _id }) => `
      <div style="border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <strong style="font-size:0.9rem;">${icons[meal_type]||'🍽️'} ${escHtml(meal_type)}</strong>
          <button class="btn btn-danger btn-sm" onclick="deleteMenu('${_id}')">🗑️ Delete</button>
        </div>
        <ul style="list-style:disc;padding-left:20px;">
          ${items.map(i => `<li style="padding:3px 0;font-size:0.85rem;color:var(--text-secondary);">${escHtml(i)}</li>`).join('')}
        </ul>
      </div>`).join('');
  } catch { el.innerHTML = `<p style="color:var(--red);">Failed to load menu.</p>`; }
}

async function deleteMenu(id) {
  if (!confirm('Delete this menu entry?')) return;
  try {
    const res  = await fetch(`${API}/api/menu/${id}`, { method:'DELETE', headers: authHeaders() });
    const data = await res.json();
    if (data.success) { loadMenuPreview(); showToast('Menu deleted.', 'success'); }
  } catch {}
}

// ── PDF Export ────────────────────────────────────────────────────────────────
function exportPDF() {
  if (!analyticsData) { showToast('No data to export yet.', 'error'); return; }
  const { jsPDF } = window.jspdf;
  const doc   = new jsPDF();
  const today = new Date().toLocaleDateString('en-IN', { year:'numeric', month:'long', day:'numeric' });

  // Header
  doc.setFillColor(168, 85, 247);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(18); doc.setFont(undefined,'bold');
  doc.text('Smart Mess — Daily Report', 14, 14);
  doc.setFontSize(10); doc.setFont(undefined,'normal');
  doc.text(today, 14, 24);

  doc.setTextColor(33,33,33);
  doc.setFontSize(14); doc.setFont(undefined,'bold');
  doc.text('Dashboard Summary', 14, 44);

  const { overall, today: tod } = analyticsData;
  const stats = [
    ['Total Feedback',      overall.totalFeedback],
    ['Overall Avg Rating',  overall.avgRating.toFixed(1) + ' / 5.0'],
    ["Today's Responses",   tod.totalFeedback],
    ["Today's Avg Rating",  tod.avgRating.toFixed(1) + ' / 5.0'],
    ['Positive Feedback',   overall.sentimentDist.Positive || 0],
    ['Negative Feedback',   overall.sentimentDist.Negative || 0],
    ['Neutral Feedback',    overall.sentimentDist.Neutral  || 0],
  ];

  doc.setFontSize(10); doc.setFont(undefined,'normal');
  stats.forEach(([label, val], i) => {
    const y = 52 + i * 9;
    doc.setFillColor(248,248,248); doc.rect(14, y-4, 182, 8, 'F');
    doc.setTextColor(80,80,80); doc.text(label + ':', 18, y);
    doc.setFont(undefined,'bold'); doc.setTextColor(33,33,33);
    doc.text(String(val), 100, y);
    doc.setFont(undefined,'normal');
  });

  let y = 52 + stats.length * 9 + 14;
  doc.setFontSize(13); doc.setFont(undefined,'bold'); doc.setTextColor(33,33,33);
  doc.text('AI-Generated Summary', 14, y); y += 10;
  doc.setFontSize(10); doc.setFont(undefined,'normal'); doc.setTextColor(60,60,60);

  analyticsData.dailySummary.forEach(line => {
    const cleaned = line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/[📊⭐🎉🚨✅⚠️📈📉➡️😊🔄🔍💡🌟🍽️]/gu, '');
    const wrapped = doc.splitTextToSize(cleaned, 182);
    wrapped.forEach(ln => { if (y > 275) { doc.addPage(); y = 20; } doc.text(ln, 14, y); y += 7; });
    y += 2;
  });

  if (y + 30 < 280 && analyticsData.topKeywords.length) {
    y += 6;
    doc.setFontSize(13); doc.setFont(undefined,'bold');
    doc.text('Top Complaint Keywords', 14, y); y += 10;
    doc.setFontSize(10); doc.setFont(undefined,'normal');
    analyticsData.topKeywords.slice(0,10).forEach(({ keyword, count }) => {
      doc.text(`• ${keyword}: ${count} mention${count!==1?'s':''}`, 18, y); y += 7;
    });
  }

  // Footer
  doc.setFillColor(168,85,247);
  doc.rect(0,285,210,15,'F');
  doc.setTextColor(255,255,255); doc.setFontSize(8);
  doc.text('Smart Mess Food Quality Analyzer | Generated on ' + today, 14, 293);

  doc.save(`Smart_Mess_Report_${toDateStr(new Date())}.pdf`);
  showToast('PDF report downloaded!', 'success');
}

// ── Utility helpers ───────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  document.getElementById('__toast')?.remove();
  const t = document.createElement('div');
  t.id = '__toast';
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${type==='success'?'✅':type==='error'?'❌':'ℹ️'}</span><span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function setFormAlert(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = msg
    ? `<div class="alert alert-${type}" style="margin-bottom:14px;"><span>${type==='success'?'✅':'❌'}</span>${msg}</div>`
    : '';
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function sentEmoji(s) { return { Positive:'😊', Negative:'😞', Neutral:'😐' }[s] || ''; }

function fmtDate(str) {
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { month:'short', day:'numeric' });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Init page visibility (all hidden except dashboard) ───────────────────────
document.querySelectorAll('.page').forEach(p => {
  if (!p.classList.contains('active')) p.style.display = 'none';
});
