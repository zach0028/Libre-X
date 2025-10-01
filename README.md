# 🚀 Libre-X

**An AI Model Comparison & Scoring Platform**

Compare responses from multiple AI models side-by-side and generate automated quality scores. Built on Supabase PostgreSQL with modern authentication and real-time capabilities.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Database](https://img.shields.io/badge/database-Supabase-green.svg)](https://supabase.com)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)

---

## 🎯 What is Libre-X?

Libre-X is a SaaS platform that enables you to:

- **Compare AI Models**: Run the same prompt across GPT-4, Claude, Gemini, and other models simultaneously
- **Score Responses**: Automatically evaluate responses using customizable scoring templates
- **Track Performance**: Benchmark models with aggregated statistics and leaderboards
- **Collaborate**: Share comparison sessions and scoring templates with teams
- **Analyze**: View detailed metrics on response quality, latency, and cost

Perfect for:
- AI researchers evaluating model performance
- Product teams choosing the right AI for their use case
- Developers comparing model outputs
- Organizations requiring AI quality assurance

---

## ✨ Features

### Core Functionality
- ✅ Multi-model comparison (GPT-4, Claude, Gemini, Llama, and more)
- ✅ Customizable scoring templates with weighted criteria
- ✅ Real-time response streaming
- ✅ Model benchmarking and leaderboards
- ✅ Session history and replay

### Authentication & Security
- ✅ Email/password authentication
- ✅ OAuth providers (Google, GitHub, Discord)
- ✅ Row Level Security (RLS) for data isolation
- ✅ JWT token-based API authentication
- ✅ Role-based access control (RBAC)

### User Experience
- ✅ Modern React interface
- ✅ Real-time updates via WebSocket
- ✅ Responsive design (mobile & desktop)
- ✅ Usage tracking and analytics
- ✅ File attachments support

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20.x or higher
- **npm** or **yarn**
- A **Supabase** account (free tier available at [supabase.com](https://supabase.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Libre-X.git
   cd Libre-X
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**

   Create a new project at [supabase.com](https://supabase.com), then run the SQL migrations:

   - Go to your Supabase project → SQL Editor
   - Execute `supabase/migrations/001_initial_schema.sql`
   - Execute `supabase/migrations/002_rls_policies.sql`

4. **Configure environment variables**

   The `.env` file should already be configured. Update these values with your Supabase credentials:

   ```bash
   # Backend (.env)
   DB_MODE=supabase
   SUPABASE_URL=your-project-url.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```

   ```bash
   # Frontend (client/.env.local)
   VITE_SUPABASE_URL=your-project-url.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. **Start the application**
   ```bash
   # Terminal 1 - Backend
   npm run server

   # Terminal 2 - Frontend
   cd client
   npm run dev
   ```

6. **Open your browser**

   Navigate to [http://localhost:3080](http://localhost:3080)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│         SUPABASE CLOUD              │
│  • PostgreSQL Database (9 tables)   │
│  • Authentication (Email + OAuth)   │
│  • Real-time WebSocket              │
│  • Row Level Security               │
└─────────────────────────────────────┘
                ▲
                │ REST API + WebSocket
                │
┌─────────────────────────────────────┐
│         LIBRE-X APPLICATION         │
│                                     │
│  Backend (Node.js + Express)        │
│  • API Routes (24 protected)        │
│  • Authentication Controllers       │
│  • Database Models & Adapters       │
│  • WebSocket Server                 │
│                                     │
│  Frontend (React + TypeScript)      │
│  • Comparison Interface             │
│  • Scoring Dashboard                │
│  • User Management                  │
│  • Real-time Updates                │
└─────────────────────────────────────┘
```

---

## 📚 Documentation

### For Users
- **[START_HERE.md](START_HERE.md)** - Complete setup guide
- **[OBTENIR_CLI_TOKEN.md](OBTENIR_CLI_TOKEN.md)** - How to get Supabase CLI token

### For Developers
- **[RAPPORT_MIGRATION_COMPLETE.md](RAPPORT_MIGRATION_COMPLETE.md)** - Technical migration report
- **API Documentation** - See `/api/server/routes/` for endpoint definitions
- **Database Schema** - See `supabase/migrations/` for table structures

---

## 🗄️ Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles extending Supabase auth.users |
| `comparison_sessions` | AI model comparison sessions |
| `scoring_templates` | Customizable scoring criteria |
| `model_benchmarks` | Aggregated model performance stats |
| `files` | Uploaded file attachments |
| `transactions` | User credit/billing history |
| `roles` | RBAC role definitions |
| `groups` | Team/organization groups |
| `group_members` | Group membership relations |

All tables include Row Level Security (RLS) policies to ensure data isolation.

---

## 🔐 API Authentication

### Available Endpoints

```
POST   /api/auth/register        Register new user
POST   /api/auth/login           Login with email/password
POST   /api/auth/logout          Logout current session
POST   /api/auth/refresh         Refresh JWT token
POST   /api/auth/reset-password  Request password reset
GET    /api/auth/verify          Verify email address
GET    /api/auth/google          OAuth via Google
GET    /api/auth/github          OAuth via GitHub
GET    /api/auth/discord         OAuth via Discord
```

### Example Usage

```javascript
// Register
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    name: 'John Doe'
  })
});

// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!'
  })
});

const { access_token } = await response.json();

// Use token for authenticated requests
const data = await fetch('/api/user', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
```

---

## 🧪 Testing

### Test Authentication

```bash
# Register a new user
curl -X POST http://localhost:3080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","name":"Test User"}'

# Login
curl -X POST http://localhost:3080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'
```

### Test Protected Routes

```bash
# Get user profile (requires authentication)
curl http://localhost:3080/api/user \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth + JWT
- **Real-time**: WebSocket

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **State Management**: React Hooks
- **API Client**: Supabase JS Client

### DevOps
- **Database Migrations**: SQL files in `supabase/migrations/`
- **CLI**: Supabase CLI for local development
- **Hosting**: Compatible with Vercel, Netlify, or any Node.js host

---

## 🔧 Configuration

### Environment Variables

#### Backend (`.env`)

```bash
# Database Mode
DB_MODE=supabase

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Server Configuration
PORT=3080
HOST=localhost

# Optional: Legacy MongoDB (if using hybrid mode)
# MONGO_URI=mongodb://localhost:27017/LibreChat
```

#### Frontend (`client/.env.local`)

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🐛 Troubleshooting

### "Cannot connect to Supabase"

1. Verify your SQL migrations have been executed
2. Check that `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct in `.env`
3. Ensure your Supabase project is active

### "Unauthorized" errors

1. Check that the JWT token is being sent in the `Authorization` header
2. Verify token hasn't expired (default: 1 hour)
3. Use `/api/auth/refresh` to get a new token

### "Table does not exist"

Run the SQL migrations in your Supabase dashboard:
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_rls_policies.sql`

### Need more help?

- Check [RAPPORT_MIGRATION_COMPLETE.md](RAPPORT_MIGRATION_COMPLETE.md) for detailed technical information
- Open an issue on GitHub
- Consult [Supabase documentation](https://supabase.com/docs)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Original Project**: [LibreChat](https://github.com/danny-avila/LibreChat) - Foundation for this platform
- **Database & Auth**: [Supabase](https://supabase.com) - PostgreSQL and authentication services
- **Migration**: Migrated from MongoDB to Supabase PostgreSQL with enhanced features

---

## 📊 Project Status

- ✅ **Database**: 9 tables with RLS policies deployed
- ✅ **Authentication**: Email + OAuth fully functional
- ✅ **API**: 24 protected routes operational
- ✅ **Frontend**: React client with TypeScript
- 🔄 **Features**: Core comparison & scoring features in development

---

## 🔗 Links

- **Repository**: [GitHub](https://github.com/YOUR_USERNAME/Libre-X)
- **Issues**: [Report a Bug](https://github.com/YOUR_USERNAME/Libre-X/issues)
- **Documentation**: [Full Docs](RAPPORT_MIGRATION_COMPLETE.md)

---

**Built with ❤️ using Supabase, React, and Node.js**
