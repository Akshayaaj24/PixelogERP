import { Router } from 'express'

// Step 5: connect Claude API here (@anthropic-ai/sdk)
//  POST /api/ai/script   → claude-sonnet-5-5, uses client.brandNotes + language
//  POST /api/ai/caption  → claude-sonnet-5-5
//  POST /api/ai/ask      → claude-haiku-5-5 with tools (getTodayTasks, getPendingApprovals...)
const r = Router()
r.all('/{*any}', (req, res) => res.status(501).json({ message: 'AI is coming soon' }))
export default r
