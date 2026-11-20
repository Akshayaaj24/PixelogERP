import mongoose from 'mongoose'

// The whole reel workflow — one field
export const STAGES = ['idea', 'script', 'shoot', 'editing', 'sent_to_owner', 'sent_to_client', 'approved', 'posted']

const reelSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    title: { type: String, required: true, trim: true },
    postDate: { type: Date, required: true },
    postTime: { type: String, default: '' }, // "18:00"
    idea: { type: String, default: '' },
    script: { type: String, default: '' },
    caption: { type: String, default: '' },
    hashtags: { type: String, default: '' },
    scriptWriter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    editor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    stage: { type: String, enum: STAGES, default: 'idea' },
    notes: { type: String, default: '' }, // links, owner feedback...
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

export default mongoose.model('Reel', reelSchema)
