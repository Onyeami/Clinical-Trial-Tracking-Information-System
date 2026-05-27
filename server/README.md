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
