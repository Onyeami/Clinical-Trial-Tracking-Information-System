// Central error handler — must have 4 params for Express to treat as error middleware
function errorHandler(err, req, res, next) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} —`, err.message)

    // PostgreSQL unique violation
    if (err.code === '23505') {
        const detail = err.detail || ''
        const field = detail.match(/\(([^)]+)\)/)?.[1] ?? 'field'
        return res.status(409).json({ error: `Duplicate value: ${field} already exists.` })
    }

    // PostgreSQL foreign key violation
    if (err.code === '23503') {
        return res.status(400).json({ error: 'Referenced record does not exist.' })
    }

    // PostgreSQL check constraint
    if (err.code === '23514') {
        return res.status(400).json({ error: 'Invalid value for a constrained field.' })
    }

    // PostgreSQL not null violation
    if (err.code === '23502') {
        return res.status(400).json({ error: `Required field missing: ${err.column}` })
    }

    const status = err.status || err.statusCode || 500
    res.status(status).json({ error: err.message || 'Internal server error' })
}

