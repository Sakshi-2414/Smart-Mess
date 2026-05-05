# 🍽️ Smart Mess — Food Quality Analyzer

In many hostels, students face issues like poor food quality, unhygienic conditions, and repetitive menus, but there is no efficient system to track and analyze these problems. Feedback is often ignored or unstructured, making it difficult for administrators to take action.

Smart Mess  addresses this problem by providing a digital platform where students can submit feedback easily. The system uses NLP-based sentiment analysis to automatically evaluate feedback, detect common complaints, and generate insights. This helps mess administrators understand real issues and improve food quality, hygiene, and overall student satisfaction.

---

🚀 Overview

Smart Mess  is designed to solve real-world problems in hostel food systems by combining:

📊 Real-time feedback collection
🤖 AI-based sentiment analysis
🔐 Secure admin dashboard (JWT authentication)
📈 Analytics & insights for better decision-making

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
✨ Key Features
👨‍🎓 Student Side
Submit daily food feedback
View mess menu
Simple and responsive UI
👨‍💼 Admin Side
Secure login with JWT authentication
View all feedback in real-time
Manage daily menu
Access analytics dashboard
🧠 AI / NLP Features
Sentiment analysis (Positive / Neutral / Negative)
Keyword extraction (30+ food-related issues)
Complaint detection (e.g., oily, cold, stale)
Rating-adjusted sentiment scoring
Automated insights & recommendations
🛠️ Tech Stack

Frontend

HTML, CSS, JavaScript

Backend

Node.js
Express.js

Database

MongoDB

Other

JWT Authentication
Custom NLP engine (no external ML libraries)
---
🚀 Getting Started
1️⃣ Start MongoDB
mongod --dbpath /data/db
2️⃣ Install dependencies
cd backend
npm install
3️⃣ Setup environment variables

Create a .env file inside backend/:

MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
PORT=5000
4️⃣ Seed database (run once)
node seed.js
5️⃣ Start server
npm start
6️⃣ Open in browser
http://localhost:5000
🔐 Admin Credentials (Demo)
Username: admin
Password: admin123
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



---

## 🧠 NLP Features (no external ML libraries)

- **Sentiment Analysis** — keyword matching with negation handling
- **Complaint Keywords** — 30+ tracked issues (oily, cold, late, stale...)
- **Daily Report** — auto-generates recommendations
- **Rating-weighted** — rating adjusts sentiment when text is ambiguous
