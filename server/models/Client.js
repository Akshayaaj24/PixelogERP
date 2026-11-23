import mongoose from 'mongoose'

export const SERVICES = ['Digital Marketing', 'Meta Ads', 'Google Ads', 'Website', 'Video Production', 'Software']
const ref = { type: mongoose.Schema.Types.ObjectId, ref: 'User' }

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // client / contact name
    businessName: { type: String, default: '' },
    logo: { type: String, default: '' }, // small image (data URL)
    instagram: { type: String, default: '' }, // full link
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    category: { type: String, default: '' },
    services: [{ type: String }],
    startDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'inactive', 'paused', 'ended'], default: 'active' },
    monthlyPackage: { type: Number, default: 0 }, // admin only
    reelsPerMonth: { type: Number, default: 0 },
    postersPerMonth: { type: Number, default: 0 },
    websiteStatus: { type: String, enum: ['none', 'in_progress', 'live'], default: 'none' },
    // Who works for this client — new work is auto-assigned from here
    team: { script: ref, shoot: ref, editing: ref, poster: ref, website: ref, ads: ref },
    // Used by AI
    brandNotes: { type: String, default: '' },
    language: { type: String, enum: ['English', 'Tamil', 'Tanglish'], default: 'English' },
    // old field kept so old data still loads
    contactPerson: { type: String, default: '' },
    manager: ref,
  },
  { timestamps: true }
)

export default mongoose.model('Client', clientSchema)
