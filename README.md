# PBL Management System

A comprehensive web application for managing Project Based Learning (PBL) workflows, from team formation to evaluation and result generation.

## 🚀 Setup Guide

Follow these steps to set up the project on your local machine.

### Prerequisites
Make sure you have the following installed on your system:
- **Node.js** (v18 or higher recommended)
- **PostgreSQL** (Ensure the database server is running)
- **Git**

---

### 1. Clone the Repository
If you received this as a zip file, extract it to a folder. If it's on GitHub, clone it:
```bash
git clone <repository_url>
cd pbl
```

---

### 2. Database Setup (PostgreSQL)
Create a new database in PostgreSQL for this project.
```sql
CREATE DATABASE pbl_db;
```

---

### 3. Backend Setup
Navigate to the `backend` directory and install the dependencies.

```bash
cd backend
npm install
```

**Environment Variables:**
Create a `.env` file in the `backend` folder and add the following details. Replace the `DATABASE_URL` with your PostgreSQL credentials:

```env
PORT=5000
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/pbl_db?schema=public"
JWT_SECRET="any_super_secret_key_here"
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"
```

**Initialize Database (Prisma):**
Run the following commands to generate the Prisma client and push the schema to your database.
```bash
npx prisma generate
npx prisma db push
```

**Create Super Admin (First User):**
To login to the system, you need an initial admin account. Run the seed script:
```bash
node src/scripts/create-super-admin.js
```
*(Note: If the script doesn't exist, you can create one manually directly in your DB).*

**Start the Backend Server:**
```bash
npm run dev
```
*The server will start on http://localhost:5000.*

---

### 4. Frontend Setup
Open a new terminal window, navigate to the `frontend` directory, and install the dependencies.

```bash
cd frontend
npm install
```

**Start the Frontend Server:**
```bash
npm run dev
```
*The frontend will start on http://localhost:5173.*

---

### 🎉 You are ready!
Open your browser and navigate to `http://localhost:5173`. 
You can log in using the Super Admin credentials or Admin credentials you set up in the database.

### Core Technologies Used:
- **Frontend**: React (Vite), TailwindCSS, Axios
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (Prisma ORM)
- **Security**: JWT Authentication, Helmet, Rate Limiting, XSS Protection
