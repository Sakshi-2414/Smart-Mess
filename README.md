# 🍽️ Smart Mess v2 — Food Quality Analyzer

Modern hostel mess management system with dark purple UI, JWT authentication, NLP sentiment analysis, and real-time analytics.

---

## 🚀 Quick Start

```bash
# 1. Start MongoDB locally
mongod --dbpath /data/db

# 2. Install dependencies
cd smart-mess/backend
npm install

# 3. Seed database (creates admin + sample data — run ONCE)
node seed.js

# 4. Start server
npm start

# 5. Open browser
open http://localhost:5000
```

**Admin credentials:** `admin` / `admin123`

---

## 📁 Project Structure

```
smart-mess/
├── backend/
│   ├── server.js                  ← Express entry point
│   ├── package.json
│   ├── .env                       ← Environment config
│   ├── seed.js                    ← Seeds admin + sample data
│   ├── models/
│   │   ├── Feedback.js
│   │   ├── Admin.js
│   │   └── Menu.js
│   ├── routes/
│   │   ├── feedback.js
│   │   ├── admin.js
│   │   ├── menu.js
│   │   └── analytics.js
│   ├── controllers/
│   │   ├── feedbackController.js
│   │   ├── adminController.js
│   │   ├── menuController.js
│   │   └── analyticsController.js
│   ├── middleware/
│   │   └── auth.js                ← JWT middleware
│   └── utils/
│       └── nlp.js                 ← Sentiment analysis + keyword extraction
└── frontend/
    ├── index.html                 ← Student portal
    ├── login.html                 ← Admin login
    ├── admin.html                 ← Admin dashboard
    ├── css/
    │   ├── style.css              ← Global design system
    │   ├── student.css            ← Student portal styles
    │   └── admin.css              ← Admin dashboard styles
    └── js/
        ├── student.js
        ├── login.js
        └── admin.js
```

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/feedback` | None | Submit feedback |
| GET | `/api/feedback` | Admin | Get all feedback |
| POST | `/api/admin/login` | None | Admin login → JWT |
| GET | `/api/admin/profile` | Admin | Get profile |
| GET | `/api/menu?date=YYYY-MM-DD` | None | Get daily menu |
| POST | `/api/menu` | Admin | Add/update menu |
| DELETE | `/api/menu/:id` | Admin | Delete menu |
| GET | `/api/analytics?period=weekly` | Admin | Full analytics |
| GET | `/api/health` | None | Health check |

---

## ⚙️ Environment Variables (`backend/.env`)

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smart_mess
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=24h
```

---

## 🧠 NLP Features (no external ML libraries)

- **Sentiment Analysis** — keyword matching with negation handling
- **Complaint Keywords** — 30+ tracked issues (oily, cold, late, stale...)
- **Daily Report** — auto-generates recommendations
- **Rating-weighted** — rating adjusts sentiment when text is ambiguous
