# Elite Convention Hall Booking Management System

A full-stack booking management system for Elite Convention Hall. The system allows customers to check hall availability, select booking slots, submit booking information, make payment, and view booking status. Admin users can manage bookings, approve/reject booking requests, create manual bookings, and monitor booking activities.

---

## Project Overview

This project was originally built with basic HTML, CSS, and JavaScript frontend. It has now been migrated to a React-based frontend while keeping the Laravel backend and MySQL database structure intact.

The frontend communicates with the backend only through Laravel API endpoints. React does not connect directly to the database.

---

## Tech Stack

### Frontend

* React
* Vite
* React Router DOM
* FullCalendar React
* CSS
* LocalStorage / SessionStorage for frontend session handling

### Backend

* Laravel
* PHP
* MySQL
* Laravel API Routes
* Laravel Controllers
* Laravel Validation
* Laravel Throttle Middleware

### Database

* MySQL
* MySQL Workbench

---

## Project Structure

```text
DHAKA-LADIES-CLUB-WEBSITE/
│
├── backend/
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── database/
│   ├── public/
│   ├── resources/
│   ├── routes/
│   ├── storage/
│   ├── tests/
│   ├── .env
│   ├── artisan
│   ├── composer.json
│   └── composer.lock
│
└── frontend-react/
    ├── public/
    │   └── assets/
    │       └── img/
    │
    ├── src/
    │   ├── pages/
    │   │   ├── HomePage.jsx
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── BookingPage.jsx
    │   │   ├── PaymentPage.jsx
    │   │   ├── CongratulationsPage.jsx
    │   │   ├── CustomerPanelPage.jsx
    │   │   └── admin/
    │   │       ├── AdminLoginPage.jsx
    │   │       ├── AdminDashboardPage.jsx
    │   │       ├── AdminBookingsPage.jsx
    │   │       └── AdminManualBookingPage.jsx
    │   │
    │   ├── services/
    │   │   └── api.js
    │   │
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    │
    ├── .env
    ├── package.json
    └── vite.config.js
```

---

## Main Features

### Customer Features

* Customer registration
* Customer login
* Customer logout
* Homepage with venue information
* Live booking calendar
* Day Shift and Night Shift availability
* Slot selection from calendar
* Booking information form
* Booking data persistence for same user
* User-specific booking draft handling
* Payment page
* Congratulations/success page
* Customer panel
* Customer profile view/update
* Customer booking history
* Booking status tracking

### Admin Features

* Admin login
* Admin dashboard
* Booking overview
* Booking approval
* Booking rejection
* Manual/offline booking creation
* Admin booking management
* Booking status management

### Booking Features

* Live calendar slot display
* Available/booked/blocked/in-progress/pending approval status
* 10-minute booking hold system
* Booking information validation
* Payment processing flow
* Online booking source
* Offline/manual booking source
* Admin approval workflow
* Slot status update after approval/rejection
* Booking status history support

### Security and Data Handling

* React frontend does not connect directly to MySQL
* Laravel backend handles all database operations
* API-based frontend/backend communication
* Bearer token authentication
* Customer-specific session draft handling
* Booking session data cleared on logout
* Laravel throttle/rate limiting
* Backend validation for booking and payment data

---

## Important Frontend Storage Keys

### Customer Authentication

```js
dlc_customer_token_v1
dlc_customer_user_v1
```

### Admin Authentication

```js
dlc_admin_token_v1
dlc_admin_user_v1
```

### Booking Flow

```js
dlc_selected_slot_v2
dlc_booking_draft_v2
dlc_active_hold_v2
```

For user-specific booking draft protection, booking draft data may also be saved with user ID:

```js
dlc_booking_draft_v2_{user_id}
```

---

## Backend API Endpoints

### Public Booking APIs

```text
GET    /api/booking-context
GET    /api/calendar-slots
```

### Customer Auth APIs

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/panel
PATCH  /api/auth/profile
PATCH  /api/auth/bookings/{bookingId}
```

### Booking APIs

```text
POST   /api/booking-holds
POST   /api/booking-holds/release
POST   /api/payments/process
```

### Admin APIs

```text
POST   /api/admin/login
POST   /api/admin/logout
GET    /api/admin/dashboard
GET    /api/admin/bookings
POST   /api/admin/bookings/{id}/approve
POST   /api/admin/bookings/{id}/reject
POST   /api/admin/manual-bookings
```

---

## Main Database Tables

The project database includes tables such as:

```text
users
customers
halls
shifts
booking_slots
bookings
payments
notifications
email_logs
activity_logs
booking_status_histories
system_settings
```

### Important User Roles

The system currently uses:

```text
customer
super admin
```

### Important Slot Statuses

```text
available
payment_in_progress
pending_approval
booked
blocked
```

### Important Booking Statuses

```text
pending
confirmed
rejected
cancelled
```

### Important Booking Sources

```text
online
offline
```

### Important Payment Statuses

```text
pending
success
failed
partial
```

### Important Payment Methods

```text
dummy
sslcommerz
bank_transfer
cash
bkash
nagad
card_pos
due
```

---

## Local Setup Instructions

## 1. Clone or Open Project

Open the project folder:

```bash
cd DHAKA-LADIES-CLUB-WEBSITE
```

---

# Backend Setup

## 2. Go to Backend Folder

```bash
cd backend
```

## 3. Install PHP Dependencies

```bash
composer install
```

## 4. Create Backend `.env`

Copy `.env.example` to `.env` if needed:

```bash
cp .env.example .env
```

For Windows PowerShell:

```powershell
copy .env.example .env
```

## 5. Configure Backend `.env`

Example:

```env
APP_NAME="Elite Convention Hall"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=dhaka_ladies_club
DB_USERNAME=root
DB_PASSWORD=

MAIL_MAILER=log
```

## 6. Generate App Key

```bash
php artisan key:generate
```

## 7. Import Database

Import the provided SQL file into MySQL using MySQL Workbench or command line.

Example command:

```bash
mysql -u root -p dhaka_ladies_club < database.sql
```

## 8. Clear Laravel Cache

```bash
php artisan cache:clear
php artisan route:clear
php artisan config:clear
php artisan optimize:clear
```

## 9. Run Laravel Backend

```bash
php artisan serve --host=127.0.0.1 --port=8000
```

Backend API will run at:

```text
http://127.0.0.1:8000/api
```

---

# Frontend Setup

## 10. Go to Frontend Folder

Open another terminal:

```bash
cd frontend-react
```

## 11. Install Node Dependencies

```bash
npm install
```

## 12. Create Frontend `.env`

Inside `frontend-react/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

## 13. Run React Frontend

```bash
npm run dev
```

Frontend will run at:

```text
http://localhost:5173
```

---

## Required Frontend Packages

The React frontend uses these packages:

```bash
npm install react-router-dom
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/list @fullcalendar/interaction
```

---

## React Routes

```text
/                         Homepage
/login                    Customer Login
/register                 Customer Registration
/booking                  Booking Information
/payment                  Payment
/congratulations          Booking Success
/customer-panel           Customer Panel

/admin-login              Admin Login
/admin-dashboard          Admin Dashboard
/admin-bookings           Admin Bookings
/admin-manual-booking     Admin Manual Booking
```

Old `.html` routes should not be used in the React version.

Correct React navigation examples:

```js
navigate("/");
navigate("/login");
navigate("/register");
navigate("/booking");
navigate("/payment");
navigate("/customer-panel");
```

Do not use:

```js
navigate("index.html");
navigate("login.html");
window.location.href = "booking.html";
```

---

## CORS Configuration

Because React runs on `localhost:5173` and Laravel runs on `127.0.0.1:8000`, Laravel CORS must allow the React frontend.

In `backend/config/cors.php`, allow:

```php
'allowed_origins' => [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5500',
],
```

After changing CORS config:

```bash
php artisan optimize:clear
```

---

## Running the Full Project Locally

Open two terminals.

### Terminal 1: Backend

```bash
cd backend
php artisan serve --host=127.0.0.1 --port=8000
```

### Terminal 2: Frontend

```bash
cd frontend-react
npm run dev
```

Then open:

```text
http://localhost:5173
```

---

## Booking Flow

1. Customer opens homepage.
2. Customer checks live calendar.
3. Customer selects an available slot.
4. If not logged in, customer is redirected to login.
5. Customer logs in.
6. Customer fills booking information.
7. System creates a temporary booking hold.
8. Customer proceeds to payment.
9. Payment is processed.
10. Booking status becomes pending/pending approval.
11. Admin approves or rejects the booking.
12. Approved booking updates slot status to booked.

---

## Admin Booking Flow

1. Admin logs in.
2. Admin opens dashboard/bookings page.
3. Admin reviews pending bookings.
4. Admin approves or rejects bookings.
5. Approved booking becomes confirmed.
6. Rejected booking releases the slot.
7. Admin can also create manual/offline bookings.

---

## Important Development Notes

### React Strict Mode

During development, React Strict Mode may call some effects twice. This can cause repeated API calls and Laravel throttle errors.

To reduce duplicate API calls during debugging, `main.jsx` can be written without `StrictMode`:

```jsx
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<App />);
```

### Too Many Attempts Error

If Laravel returns:

```text
Too Many Attempts
```

It means the backend throttle/rate limiter blocked requests.

Fix for local development:

```bash
php artisan cache:clear
php artisan optimize:clear
```

If needed, increase route throttle in `routes/api.php` for local testing:

```php
->middleware('throttle:120,1')
```

For sensitive routes like login, keep throttle lower in production.

### Clear Old Browser Session Data

Run this in browser console to clear old customer and booking data:

```js
localStorage.removeItem("dlc_customer_token_v1");
localStorage.removeItem("dlc_customer_user_v1");
localStorage.removeItem("dlc_admin_token_v1");
localStorage.removeItem("dlc_admin_user_v1");

Object.keys(sessionStorage).forEach((key) => {
  if (
    key === "dlc_selected_slot_v2" ||
    key === "dlc_active_hold_v2" ||
    key === "dlc_booking_draft_v2" ||
    key.startsWith("dlc_booking_draft_v2_")
  ) {
    sessionStorage.removeItem(key);
  }
});
```

---

## Common Problems and Fixes

### 1. White Blank Screen in React

Possible reasons:

* Missing route in `App.jsx`
* Imported page file does not exist
* Page does not export default component
* Old `.html` path is being used
* JSX syntax error

Fix:

```text
Check terminal error
Check browser console
Make sure route exists
Make sure page file exists
Make sure default export exists
```

### 2. Profile Icon Not Showing

Possible reasons:

* Customer token does not exist in React localStorage
* User logged in from old HTML origin, not React origin
* Navbar condition depends on `dlc_customer_token_v1`

Fix:

```js
localStorage.getItem("dlc_customer_token_v1")
```

If it returns `null`, login again from React frontend.

### 3. Booking Failed

Possible reasons:

* Backend validation failed
* Slot is not available
* Booking table required fields are missing
* API payload field names are incorrect
* Laravel route is throttled

Fix:

* Check browser Network tab
* Check Laravel log
* Check `BookingHoldController.php`
* Ensure React sends snake_case fields

### 4. Data From Previous User Showing

Reason:

* Booking draft was stored globally in sessionStorage.

Fix:

* Use user-specific draft key.
* Clear booking session data on logout.
* Do not load booking draft before confirming logged-in user.

### 5. Database Enum Error

Example:

```text
Data truncated for column user_type
```

Reason:

* The value being inserted is not allowed in ENUM.

Fix:

```sql
ALTER TABLE users
MODIFY COLUMN user_type ENUM('customer', 'super admin')
NOT NULL DEFAULT 'customer';
```

If existing values are different, temporarily convert to `VARCHAR`, clean data, then convert back to `ENUM`.

---

## Deployment Notes

### Frontend Deployment

React frontend can be deployed to Vercel.

Before deployment:

```bash
npm run build
```

Make sure `.env` on Vercel contains:

```env
VITE_API_BASE_URL=https://your-backend-domain.com/api
```

### Backend Deployment

Laravel backend can be deployed to Railway or VPS.

Important production requirements:

* Set correct `APP_KEY`
* Set production database credentials
* Run migrations or import SQL
* Configure CORS for frontend domain
* Configure storage permissions
* Set mail configuration if email is required
* Run `php artisan optimize:clear`
* Run `php artisan config:cache` only after env is final

### Production CORS Example

```php
'allowed_origins' => [
    'https://your-frontend-domain.vercel.app',
],
```

---

## Build Commands

### Frontend Build

```bash
cd frontend-react
npm run build
```

### Frontend Preview

```bash
npm run preview
```

### Backend Cache Clear

```bash
cd backend
php artisan optimize:clear
```

---

## Recommended Development Workflow

1. Run backend.
2. Run frontend.
3. Test one page at a time.
4. Check browser console for React errors.
5. Check Network tab for API errors.
6. Check Laravel log for backend errors.
7. Fix route/API/storage issues step by step.

---

## Current Status

The project frontend has been migrated from basic HTML, CSS, and JavaScript to React. The backend remains Laravel-based and continues to handle all database operations through API endpoints.

The main focus areas now are:

* Final testing of all React pages
* Fixing any remaining route issues
* Ensuring all API calls match backend validation
* Securing user-specific booking draft data
* Testing admin approval/rejection flow
* Preparing stable deployment for frontend and backend

---

## Author

Developed for Elite Convention Hall Booking Management System.

```text
Frontend: React + Vite
Backend: Laravel API
Database: MySQL
```
