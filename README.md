# LifeLessons — Backend API Server

Express.js + MongoDB REST API for the Digital Life Lessons platform.

## 🌐 Live URL

- **Server:** https://digital-life-lessons-server.onrender.com
- **Client:** https://digital-life-lessons-client.vercel.app

## 🎯 Purpose

Provides secure REST API endpoints for authentication, lesson management, favorites, comments, reports, admin operations, and Stripe payment processing.

## ✨ Key Features

- **JWT Authentication** — Register, login, Google OAuth, reload-safe session with /auth/me
- **Lesson CRUD** — Create, read, update, delete with owner and admin guards
- **Premium Access Control** — Free users cannot create or access Premium lessons server-side
- **Stripe Integration** — Checkout session creation and webhook to flip isPremium on payment
- **Favorites System** — Save/remove lessons, auto-updates favoritesCount on lessons
- **Comments** — Post and fetch comments per lesson
- **Report System** — Users report lessons; admin can delete or ignore reports
- **Admin Routes** — Platform stats, manage users/roles, feature lessons, moderate content
- **Challenge 1** — Filter, sort, keyword search on public lessons
- **Challenge 2** — JWT verified on all protected routes, ownership checked on mutations
- **Challenge 3** — Pagination support on public lessons endpoint

## 🛠️ npm Packages Used

| Package | Purpose |
|---|---|
| `express` | Web framework |
| `mongoose` | MongoDB ODM |
| `bcryptjs` | Password hashing |
| `jsonwebtoken` | JWT creation and verification |
| `stripe` | Stripe payment processing |
| `cors` | Cross-origin resource sharing |
| `dotenv` | Environment variable loading |
| `better-auth` | Auth utility support |
| `nodemon` | Development auto-restart |

## 🗂️ Project Structure

```
server/
├── index.js          # Express app entry, Stripe webhook, route mounting
├── models/           # Mongoose schemas
│   ├── User.js
│   ├── Lesson.js
│   ├── Favorite.js
│   ├── Comment.js
│   └── LessonReport.js
├── routes/           # Express routers
│   ├── auth.js       # Register, login, Google OAuth, profile
│   ├── lessons.js    # Lesson CRUD, like, visibility, featured
│   ├── favorites.js  # Save/remove/check favorites
│   ├── comments.js   # Post and fetch comments
│   ├── reports.js    # Report lesson, get/ignore reports
│   ├── admin.js      # Admin stats, users, lessons management
│   └── payments.js   # Stripe checkout session and verify
└── middleware/
    └── verifyToken.js  # JWT auth + admin guard middleware
```

## 🚀 Run Locally

```bash
npm install
# copy .env.example to .env and fill in values
npm run dev
```

## 📋 Environment Variables

```
MONGO_URI=
PORT=5000
JWT_SECRET=
BETTER_AUTH_SECRET=
CLIENT_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_AMOUNT=150000
STRIPE_CURRENCY=bdt
```

## 🔗 API Endpoints Summary

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | /auth/register | — | Register new user |
| POST | /auth/login | — | Login with email/password |
| POST | /auth/google | — | Login with Google |
| GET | /auth/me | JWT | Get current user |
| PATCH | /auth/profile | JWT | Update name/photo |
| GET | /lessons/public | — | Get public lessons (filter/sort/search/page) |
| GET | /lessons/featured | — | Get featured lessons |
| POST | /lessons | JWT | Create lesson |
| PATCH | /lessons/:id | JWT | Update lesson (owner/admin) |
| DELETE | /lessons/:id | JWT | Delete lesson (owner/admin) |
| PATCH | /lessons/:id/like | JWT | Toggle like |
| POST | /favorites | JWT | Save to favorites |
| DELETE | /favorites/:lessonId | JWT | Remove from favorites |
| GET | /favorites/my | JWT | Get my favorites |
| POST | /comments | JWT | Post comment |
| GET | /comments/:lessonId | — | Get comments |
| POST | /reports | JWT | Report a lesson |
| POST | /payments/create-checkout-session | JWT | Create Stripe session |
| GET | /admin/stats | JWT+Admin | Platform stats |
| GET | /admin/users | JWT+Admin | All users |
| PATCH | /admin/users/:id/role | JWT+Admin | Update user role |
| GET | /admin/lessons | JWT+Admin | All lessons |
| PATCH | /admin/lessons/:id/feature | JWT+Admin | Toggle featured |
| DELETE | /admin/lessons/:id | JWT+Admin | Delete lesson |
| GET | /reports | JWT+Admin | Get all reports |
| DELETE | /reports/ignore/:lessonId | JWT+Admin | Clear reports |
