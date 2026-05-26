require('dotenv').config()
const express  = require('express')
const cors     = require('cors')

const researchersRouter             = require('./routes/researchers')
const trialsRouter                  = require('./routes/trials')
const { router: phasesRouter, getById: getPhase, updatePhase, deletePhase } = require('./routes/phases')
const participantsRouter            = require('./routes/participants')
const enrolmentsRouter              = require('./routes/enrolments')
const { router: checkinsRouter, getById: getCheckin, updateCheckin, deleteCheckin } = require('./routes/checkins')
const authRouter                      = require('./routes/auth')
const { authenticate }                = require('./middleware/auth')
const { errorHandler, notFound }    = require('./middleware/errorHandler')

const app = express()

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())

// ── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRouter)

// ── Nested routes ──────────────────────────────────────────────────────────
// Phases nested under trials:   GET/POST /api/trials/:trialId/phases
app.use('/api/trials/:trialId/phases', phasesRouter)

// Check-ins nested under enrolments: GET/POST /api/enrolments/:enrolmentId/checkins
app.use('/api/enrolments/:enrolmentId/checkins', checkinsRouter)

// ── Top-level routes ───────────────────────────────────────────────────────
app.use('/api/researchers',  researchersRouter)
app.use('/api/trials',       trialsRouter)
app.use('/api/participants', participantsRouter)
app.use('/api/enrolments',   enrolmentsRouter)

// Standalone phase endpoints (GET/PUT/DELETE by id)
app.get   ('/api/phases/:id', authenticate, getPhase)
app.put   ('/api/phases/:id', authenticate, updatePhase)
app.delete('/api/phases/:id', authenticate, deletePhase)

// Standalone checkin endpoints (GET/PUT/DELETE by id)
app.get   ('/api/checkins/:id', authenticate, getCheckin)
app.put   ('/api/checkins/:id', authenticate, updateCheckin)
app.delete('/api/checkins/:id', authenticate, deleteCheckin)

// ── Error handling ─────────────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

module.exports = app
