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

## API Reference

### Health

| Method | Endpoint       | Description        |
|--------|----------------|--------------------|
| GET    | /api/health    | Server health check|

### Researchers

| Method | Endpoint                | Description              |
|--------|-------------------------|--------------------------|
| GET    | /api/researchers        | List all researchers     |
| GET    | /api/researchers/:id    | Get one researcher       |
| POST   | /api/researchers        | Create researcher        |
| PUT    | /api/researchers/:id    | Update researcher        |
| DELETE | /api/researchers/:id    | Delete researcher        |

### Trials

| Method | Endpoint                | Description                        |
|--------|-------------------------|------------------------------------|
| GET    | /api/trials             | List trials (filter: ?status=)     |
| GET    | /api/trials/:id         | Get one trial (with counts)        |
| POST   | /api/trials             | Create trial                       |
| PUT    | /api/trials/:id         | Update trial                       |
| DELETE | /api/trials/:id         | Delete trial (blocked if enrolled) |

### Trial Phases

| Method | Endpoint                          | Description        |
|--------|-----------------------------------|--------------------|
| GET    | /api/trials/:trialId/phases       | List phases        |
| POST   | /api/trials/:trialId/phases       | Add phase to trial |
| GET    | /api/phases/:id                   | Get one phase      |
| PUT    | /api/phases/:id                   | Update phase       |
| DELETE | /api/phases/:id                   | Delete phase       |

### Participants

| Method | Endpoint                  | Description                           |
|--------|---------------------------|---------------------------------------|
| GET    | /api/participants         | List all (filter: ?search=)           |
| GET    | /api/participants/:id     | Get one (includes pps_number)         |
| POST   | /api/participants         | Register participant                  |
| PUT    | /api/participants/:id     | Update participant                    |
| DELETE | /api/participants/:id     | Soft delete (sets is_active = false)  |

### Enrolments

| Method | Endpoint                    | Description                              |
|--------|-----------------------------|------------------------------------------|
| GET    | /api/enrolments             | List (filter: ?trial_id= &status= &participant_id=) |
| GET    | /api/enrolments/:id         | Get one enrolment                        |
| POST   | /api/enrolments             | Enrol participant (checks consent + duplicates) |
| PUT    | /api/enrolments/:id         | Update enrolment                         |
| DELETE | /api/enrolments/:id         | Remove enrolment                         |

### Check-ins

| Method | Endpoint                                 | Description             |
|--------|------------------------------------------|-------------------------|
| GET    | /api/enrolments/:enrolmentId/checkins    | List check-ins          |
| POST   | /api/enrolments/:enrolmentId/checkins    | Schedule check-in       |
| GET    | /api/checkins/:id                        | Get one check-in        |
| PUT    | /api/checkins/:id                        | Update check-in outcome |
| DELETE | /api/checkins/:id                        | Delete check-in         |

---

## Business Logic & Validation

- A participant **cannot be enrolled** in the same trial twice (HTTP 409)
- A participant **must have consent_status = 'given'** to be enrolled (HTTP 400)
- An inactive participant **cannot be enrolled** (HTTP 400)
- A trial **cannot be deleted** while participants have status = 'enrolled' (HTTP 409)
- Deleting a participant is a **soft delete** — `is_active` is set to false, preserving audit history
- **PPS numbers** are excluded from list responses; only returned on single-record GET

## HTTP Status Codes

| Code | Meaning                        |
|------|--------------------------------|
| 200  | OK                             |
| 201  | Created                        |
| 204  | Deleted (no content)           |
| 400  | Bad request / validation error |
| 404  | Record not found               |
| 409  | Conflict (duplicate / blocked) |
| 500  | Internal server error          |
