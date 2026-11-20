import mongoose from 'mongoose'

export const SERVICES = ['Instagram Reels', 'Instagram Ads', 'Video Production', 'Script Writing', 'Video Editing', 'Website Development']

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    category: { type: String, default: '' }, // Jewellery, Restaurant...
    instagram: { type: String, default: '' },
    services: [{ type: String, enum: SERVICES }],
    monthlyPackage: { type: Number, default: 0 },
    reelsPerMonth: { type: Number, default: 0 },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'paused', 'ended'], default: 'active' },
    // Used by AI later — tone, language, festivals, offers
    brandNotes: { type: String, default: '' },
    language: { type: String, enum: ['English', 'Tamil', 'Tanglish'], default: 'English' },
  },
  { timestamps: true }
)

export default mongoose.model('Client', clientSchema)
