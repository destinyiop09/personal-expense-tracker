ExpenseFlow is a full-stack personal finance application designed to make tracking income, expenses, and spending habits simple and intuitive.

It provides a clean dashboard where users can securely log in, record transactions, view financial summaries, explore spending trends, and keep track of their overall financial activity.

🌍 Live Application
Frontend

Vercel

https://personal-expense-tracker-pink-two.vercel.app
Backend

Render

https://personal-expense-tracker-1-dnqz.onrender.com


🔒 Security
✨ Features
🔐 User Authentication
Register and sign in securely
JWT-based authentication
Protected user data
📊 Financial Dashboard
Total balance
Total income
Total expenses
Monthly spending trends
Spending by category
💳 Transaction Management
Add income and expenses
Categorize transactions
Add descriptions and dates
View all transactions
Delete transactions
👤 User Profile
User name
Email address
Total recorded income
Total recorded expenses
📈 Interactive Analytics
Monthly expense trends
Category-based spending breakdown
Visual financial summaries
📱 Responsive UI
Clean and minimal interface
Works across desktop and mobile devices
🛠️ Tech Stack
Backend
Python
FastAPI
SQLAlchemy
PostgreSQL
Alembic
JWT Authentication
Argon2 password hashing
Frontend
HTML
CSS
JavaScript
SVG-based charts
REST API
Deployment
Backend: Render
Frontend: Vercel
Database: PostgreSQL
🏗️ Project Structure
Expense_trackerv1/
│
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── styles.css
│
├── src/
│   ├── main.py
│   ├── database.py
│   ├── dependencies.py
│   ├── model.py
│   ├── schema.py
│   ├── security.py
│   │
│   └── routes/
│       ├── auth.py
│       ├── categories.py
│       ├── expenses.py
│       └── summary.py
│
├── alembic/
│   └── versions/
│
├── requirements.txt
├── alembic.ini
├── pyproject.toml
└── README.md
🚀 How It Works
Create an account.
Sign in to your account.
ExpenseFlow authenticates your session.
Your financial data is loaded from the backend.
Add your income and expenses.
Organize transactions by category.
View your financial overview and charts.
Monitor your spending habits over time.

The frontend communicates with the FastAPI backend through REST API endpoints and automatically sends the authentication token with protected requests.

🔑 Authentication

ExpenseFlow uses token-based authentication.

After signing in, the frontend stores the access token and uses it when communicating with protected API endpoints. The authenticated user is then loaded through /auth/me.

User sessions are also handled gracefully when a token expires or becomes invalid.

📊 Dashboard

The dashboard gives users a quick financial snapshot, including:

Current balance
Total income
Total expenses
Monthly spending
Spending by category
Recent transactions

The frontend loads the user's profile, summary, categories, transactions, and analytics from the backend when the dashboard opens.

💳 Transactions

Users can create transactions with:

Amount
Type
Category
Date
Description

Transactions can be filtered by:

Income
Expense
Category

Users can also delete transactions directly from the dashboard.

👤 Profile

The profile page keeps things simple and focused.

It displays:

Name
Email
Total Income
Total Expenses

This gives users a quick overview of their account and financial activity.

⚙️ Local Development
1. Clone the repository
git clone <your-repository-url>
cd Expense_trackerv1
2. Create a virtual environment
python -m venv .venv

Activate it:

Windows

.venv\Scripts\activate

Linux / macOS

source .venv/bin/activate
3. Install dependencies
pip install -r requirements.txt
4. Configure environment variables

Create a .env file:

DATABASE_URL=your_postgresql_database_url
SECRET_KEY=your_secret_key
5. Run database migrations
alembic upgrade head
6. Start the backend
uvicorn src.main:app --reload

The API will be available at:

http://127.0.0.1:8000

FastAPI documentation:

http://127.0.0.1:8000/docs
7. Run the frontend

Open:

frontend/index.html

or serve the frontend using a local development server.


ExpenseFlow uses:

JWT authentication
Password hashing
Protected API routes
Authenticated transaction requests
User-specific financial data

Transactions are associated with authenticated users so that users can access their own financial information.

🎯 Project Goal

The goal of ExpenseFlow is simple:

Make personal finance easier to understand without making the application complicated to use.

Instead of overwhelming users with unnecessary features, ExpenseFlow focuses on the things that matter most:

Track → Understand → Improve



Built as a full-stack personal finance tracking project.

⭐ If you find this project useful, consider giving the repository a star!