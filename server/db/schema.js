require('dotenv').config()
const { pool } = require('./database')

async function createSchema() {
    const client = await pool.connect()
    try {
        await client.query('BEGIN')

        await client.query(`
            CREATE TABLE IF NOT EXISTS researchers (
                id            SERIAL PRIMARY KEY,
                first_name    VARCHAR(100) NOT NULL,
                last_name     VARCHAR(100) NOT NULL,
                email         VARCHAR(255) NOT NULL UNIQUE,
                department    VARCHAR(150),
                created_at    TIMESTAMPTZ DEFAULT NOW()
            )
        `)

        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id            SERIAL PRIMARY KEY,
                researcher_id INTEGER REFERENCES researchers(id) ON DELETE SET NULL,
                email         VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role          VARCHAR(20) NOT NULL DEFAULT 'coordinator'
                                CHECK (role IN ('admin', 'researcher', 'coordinator')),
                is_active     BOOLEAN NOT NULL DEFAULT TRUE,
                created_at    TIMESTAMPTZ DEFAULT NOW()
            )
        `)

        await client.query(`
            CREATE TABLE IF NOT EXISTS trials (
                id              SERIAL PRIMARY KEY,
                researcher_id   INTEGER REFERENCES researchers(id) ON DELETE SET NULL,
                title           VARCHAR(255) NOT NULL,
                description     TEXT,
                start_date      DATE NOT NULL,
                end_date        DATE,
                status          VARCHAR(50) NOT NULL DEFAULT 'recruiting'
                                  CHECK (status IN ('recruiting','active','completed','suspended')),
                created_at      TIMESTAMPTZ DEFAULT NOW()
            )
        `)

        await client.query(`
            CREATE TABLE IF NOT EXISTS trial_phases (
                id              SERIAL PRIMARY KEY,
                trial_id        INTEGER NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
                phase_name      VARCHAR(150) NOT NULL,
                description     TEXT,
                duration_weeks  INTEGER,
                order_number    INTEGER,
                created_at      TIMESTAMPTZ DEFAULT NOW()
            )
        `)

        await client.query(`
            CREATE TABLE IF NOT EXISTS participants (
                id              SERIAL PRIMARY KEY,
                first_name      VARCHAR(100) NOT NULL,
                last_name       VARCHAR(100) NOT NULL,
                date_of_birth   DATE NOT NULL,
                pps_number      VARCHAR(20) UNIQUE,
                phone           VARCHAR(30),
                email           VARCHAR(255),
                address         TEXT,
                consent_status  VARCHAR(50) NOT NULL DEFAULT 'pending'
                                  CHECK (consent_status IN ('pending','given','withdrawn_consent')),
                is_active       BOOLEAN NOT NULL DEFAULT TRUE,
                created_at      TIMESTAMPTZ DEFAULT NOW()
            )
        `)

        await client.query(`
            CREATE TABLE IF NOT EXISTS enrolments (
                id              SERIAL PRIMARY KEY,
                participant_id  INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
                trial_id        INTEGER NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
                phase_id        INTEGER REFERENCES trial_phases(id) ON DELETE SET NULL,
                enrolment_date  DATE NOT NULL,
                status          VARCHAR(50) NOT NULL DEFAULT 'enrolled'
                                  CHECK (status IN ('enrolled','completed','withdrawn','adverse_event')),
                created_at      TIMESTAMPTZ DEFAULT NOW(),
                -- A participant can only be enrolled once per trial at a time
                UNIQUE (participant_id, trial_id)
            )
        `)

        await client.query(`
            CREATE TABLE IF NOT EXISTS checkins (
                id              SERIAL PRIMARY KEY,
                enrolment_id    INTEGER NOT NULL REFERENCES enrolments(id) ON DELETE CASCADE,
                scheduled_date  DATE NOT NULL,
                actual_date     DATE,
                checkin_type    VARCHAR(50) NOT NULL DEFAULT 'in-person'
                                  CHECK (checkin_type IN ('in-person','remote')),
                outcome         VARCHAR(50) NOT NULL DEFAULT 'scheduled'
                                  CHECK (outcome IN ('scheduled','attended','missed','rescheduled')),
                notes           TEXT,
                created_at      TIMESTAMPTZ DEFAULT NOW()
            )
        `)

        // Indexes for common query patterns
        await client.query(`CREATE INDEX IF NOT EXISTS idx_trials_status       ON trials(status)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_trials_researcher   ON trials(researcher_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_phases_trial        ON trial_phases(trial_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_enrolments_trial    ON enrolments(trial_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_enrolments_part     ON enrolments(participant_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_enrolments_status   ON enrolments(status)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_checkins_enrolment  ON checkins(enrolment_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_checkins_scheduled  ON checkins(scheduled_date)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email)`)

        await client.query('COMMIT')
        console.log('✓ Schema created successfully')
    }   catch (err) {
        await client.query('ROLLBACK')
        console.error('Schema creation failed:', err.message)
        throw err
    }   finally {
        client.release()
    }
}

module.exports = { createSchema }

// Run directly: node db/schema.js
if (require.main === module) {
    createSchema().then(() => process.exit(0)).catch(() => process.exit(1))
}
