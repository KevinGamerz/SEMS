# Sustainable Energy Monitoring System (SEMS)

A full-stack, municipal-scale energy intelligence platform designed to track power consumption, manage IoT devices, and enforce role-based access control (RBAC) across city zones.

## Features

- **Dynamic Dashboards**: Real-time KPI aggregation and rich visual charting (`Recharts`) for energy metrics.
- **Micro-animations & Aesthetics**: A premium glassmorphic UI matching modern SaaS/FinTech industry standards.
- **Robust RBAC System**:
    - **Super Admin**: City-wide oversight and unrestricted user management.
    - **Zone Manager**: Oversight limited to specifically assigned zones.
    - **Field Operator**: Data entry and IoT device diagnostic access.
    - **Auditor**: Read-only auditing access for compliance reporting.
- **Predictive Analytics Mock**: Forecasting logic simulating AI-driven alerts for consumption spikes and anomalous device behaviors.
- **Production Ready**: Fully isolated API and static site serving built into a lightweight Node.JS container.

## Architecture

- **Frontend**: React 18, Vite, Zustand (State Management), Tailwind CSS v4, Lucide React (Icons), Recharts.
- **Backend**: Node.js, Express, Prisma (ORM), SQLite (Default Database), JSONWebToken (Auth).
- **Communication**: RESTful API with interceptors processing JWT bearer tokens.

## Getting Started

### Prerequisites

- Node.js Environment (`v18.x` or higher)
- NPM (`v9.x` or higher)

### Setup & Launch

We have included an automated script to install all dependencies, build the production frontend, and start the unified backend instance.

1. **Option A (Automated)**:
   Double click the `build-and-start.bat` file in the root directory. 
   
2. **Option B (Manual)**:
   If you wish to run the commands manually:
   ```bash
   # Install backend
   cd server
   npm install

   # Install frontend & build
   cd ../client
   npm install
   npm run build

   # Start unified server
   cd ../server
   npm start
   ```

The application will be available at `http://localhost:3001`.

### Development Mode

If you wish to actively develop the application and benefit from Hot Module Reloading (HMR):

1. Start the Vite server. Our custom Vite Plugin will automatically spawn the backend server as a child process.
```bash
cd client
npm install
npm run dev
```

### Authentication Accounts

The SQLite database is seeded with demonstration data representing 30-days of historical consumption. The default login accounts are:

| Account | Email | Password |
|--------|---------|---------|
| Super Admin | `admin@sems.gov` | `Admin@12345` |
| Zone Manager | `zone1@sems.gov` | `Admin@12345` |
| Operator | `operator1@sems.gov` | `Admin@12345` |
| Auditor | `auditor@sems.gov` | `Admin@12345` |

## Database Migration (To PostgreSQL)

The current version utilizes SQLite (`server/prisma/dev.db`) for portability. To deploy to a cloud instance (e.g. AWS RDS or Supabase):

1. Change the `provider` in `server/prisma/schema.prisma` from `"sqlite"` to `"postgresql"`.
2. Update your `DATABASE_URL` in `server/.env`.
3. Run `npx prisma db push` and `npx prisma db seed` to initialize the remote database.
