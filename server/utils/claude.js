import Anthropic from '@anthropic-ai/sdk'

// Models (see README → AI)
export const WRITER_MODEL = 'claude-sonnet-5-5' // scripts, captions, ideas, monthly plan
export const ASSISTANT_MODEL = 'claude-haiku-5-5' // "Ask AI" questions about ERP data

let client
export function claude() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const e = new Error('AI is not set up yet. Add ANTHROPIC_API_KEY to the server environment.')
    e.status = 503
    throw e
  }
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2 })
  return client
}

export const textOf = (msg) => msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()

// Brand context the AI reads for every client request
export function brandContext(c) {
  return [
    `Client: ${c.businessName || c.name}`,
    c.category && `Business type: ${c.category}`,
    c.instagram && `Instagram: ${c.instagram}`,
    `Language for all content: ${c.language || 'English'}${c.language === 'Tanglish' ? ' (Tamil words written in English letters, mixed with English, the way people in Tamil Nadu chat)' : c.language === 'Tamil' ? ' (Tamil script)' : ''}`,
    c.brandNotes && `Brand notes from the agency: ${c.brandNotes}`,
  ].filter(Boolean).join('\n')
}

export const AGENCY = 'You write for PIXELOG, a digital marketing agency in Thoothukudi, Tamil Nadu, that makes Instagram Reels for local businesses. Write for Instagram Reels (vertical, 15–30 seconds). Be specific to the business, avoid generic filler, and never invent prices, discounts or facts that are not in the brief.'
