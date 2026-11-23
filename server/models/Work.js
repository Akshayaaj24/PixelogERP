import mongoose from 'mongoose'
import { TYPES, STATUSES } from '../utils/work.js'

const ref = { type: mongoose.Schema.Types.ObjectId, ref: 'User' }

// One calendar item: a reel, poster, website job, ads job or other work
const workSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    type: { type: String, enum: TYPES, default: 'reel' },
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true }, // posting / due date
    time: { type: String, default: '' }, // "18:00"
    // Reels go script → shoot → editing. Other types have one stage: "work".
    stage: { type: String, enum: ['script', 'shoot', 'editing', 'work'], default: 'work' },
    status: { type: String, enum: STATUSES, default: 'start' },
    people: { script: ref, shoot: ref, editing: ref, work: ref },
    idea: { type: String, default: '' },
    script: { type: String, default: '' },
    caption: { type: String, default: '' },
    hashtags: { type: String, default: '' },
    notes: { type: String, default: '' }, // brief from manager
    changeNote: { type: String, default: '' }, // last "changes needed" note
    submittedAt: Date,
    doneAt: Date,
    createdBy: ref,
  },
  { timestamps: true }
)
workSchema.index({ date: 1 })
workSchema.index({ client: 1, date: 1 })

export default mongoose.model('Work', workSchema)
