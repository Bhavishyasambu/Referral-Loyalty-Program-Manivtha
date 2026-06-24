# Travel Referral & Loyalty Program

A comprehensive full-stack platform designed to manage travel bookings, refer-a-friend campaigns, and a loyalty points system. Built with modern web technologies, this platform empowers travel agencies to reward their customers while streamlining booking management.

## 🚀 Features

- **Booking Management**: Reserve vehicles, schedule drivers, and track trips from pickup to drop-off.
- **Loyalty Program**: Customers automatically earn points on every trip they complete.
- **Referral System**: Unique referral codes for users. Both the referrer and the new user receive bonus points upon the first completed trip.
- **Dynamic Pricing**: Fares auto-calculate based on vehicle type, location distance, and date urgency.
- **Admin Dashboard**: Comprehensive analytics, staff management, customer overview, and campaign settings.
- **Automated Emails**: Uses Nodemailer (or Ethereal Email for testing) to send referral invitations.
- **AI Assistant**: Built-in workflow assistant to help staff navigate operations.

## 💻 Technology Stack

- **Frontend**: React.js, Vite, CSS (Glassmorphism design), Lucide Icons
- **Backend**: Node.js, Express.js
- **Database**: SQLite (Development) / PostgreSQL Ready (Production)
- **Authentication**: JWT (JSON Web Tokens)
- **Email**: Nodemailer

## 🛠️ Installation & Setup

1. **Clone the repository** (or download the source code):
   ```bash
   git clone https://github.com/your-username/Referral-Loyalty-Program-Manivtha.git
   cd Referral-Loyalty-Program-Manivtha
   ```

2. **Install Dependencies**:
   Navigate to both the frontend and backend directories and install the packages.
   ```bash
   npm run install-all
   # Or manually:
   # cd backend && npm install
   # cd ../frontend && npm install
   ```

3. **Environment Configuration**:
   Navigate to the `backend` folder and copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and configure your SMTP credentials and JWT Secret.

4. **Start the Application**:
   You can run both the frontend and backend concurrently from the root directory:
   ```bash
   npm run dev
   ```
   - Frontend runs on `http://localhost:5173`
   - Backend API runs on `http://localhost:5000`

## 🗄️ Database Instructions

By default, the application uses **SQLite** for zero-configuration development. The database file (`travel_loyalty.db`) is automatically created in the `backend` folder when you start the server. 

To switch to PostgreSQL for production:
1. Uncomment the PostgreSQL configuration block in `backend/db.js`.
2. Add your PostgreSQL credentials to the `.env` file.
3. Install the pg package: `npm install pg` inside the backend directory.

## 📸 Screenshots
*(Add screenshots of your application here)*
- Dashboard Overview
- Booking Reservation Form
- Loyalty Points Tracker

## 🔮 Future Enhancements
- Integration with live payment gateways (Stripe/Razorpay)
- Real-time GPS tracking for active trips
- Automated PDF invoice generation and mailing
- Mobile application using React Native

---
*Developed by Manivtha*
