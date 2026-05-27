# SVUH Clinical Trial Tracker — Backend

Express REST API with PostgreSQL for the St Vincent's University Hospital Clinical Trial Participant Tracking System.

**Module:** B8IT150 Advanced Programming  
**Programme:** 2526_TME2

---

## Tech Stack

| Layer    | Technology                  |
|----------|-----------------------------|
| Runtime  | Node.js                     |
| Framework| Express 4                   |
| Database | PostgreSQL                  |
| DB Driver| pg (node-postgres)          |
| Testing  | Jest + Supertest            |
| Dev tool | nodemon                     |

---

## Project Structure

```
clinical-trial-backend/
├── db/
│   ├── database.js      # PostgreSQL connection pool
│   ├── schema.js        # Table creation + indexes
│   └── seed.js          # Sample St Vincent's data
├── middleware/
│   └── errorHandler.js  # Central error + 404 handler
├── routes/
│   ├── researchers.js
│   ├── trials.js
│   ├── phases.js
│   ├── participants.js
│   ├── enrolments.js
│   └── checkins.js
├── tests/
│   ├── researchers.test.js   # Unit tests: researchers + trials
│   ├── participants.test.js  # Unit tests: participants + enrolments
│   └── integration.test.js  # Full lifecycle integration test (13 steps)
├── app.js               # Express app (exported for testing)
├── server.js            # Server entry point
├── .env                 # Your local config (not committed)
├── .env.example         # Template to share
└── package.json
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your PostgreSQL credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/clinical_trials
PORT=3001
NODE_ENV=development
```

### 3. Create the database

In psql or pgAdmin, create the database:

```sql
CREATE DATABASE clinical_trials;
```

### 4. Run the server

The schema is created automatically on first start:

```bash
# Development (auto-restarts on file change)
npm run dev

# Production
npm start
```

### 5. Seed sample data (optional)

Loads 4 researchers, 4 trials, 10 phases, 8 participants, 8 enrolments, and 10 check-ins:

```bash
npm run seed
```

---

## Running Tests

```bash
npm test
```

Tests use the same database as development (configured in `.env`).  
Each test suite clears its tables in `beforeAll` to ensure a clean state.

The integration test (`integration.test.js`) covers a full 13-step clinical trial lifecycle:
researcher → trial → phase → participant → enrolment → check-in scheduled → attended → completed.

---