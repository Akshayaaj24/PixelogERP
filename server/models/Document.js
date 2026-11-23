import mongoose from 'mongoose'

// Team documents (agreement, Aadhaar, certificates). Admin only.
const documentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: ['agreement', 'aadhaar', 'certificate', 'other'], default: 'other' },
    name: { type: String, required: true },
    mime: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true, select: false },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

export default mongoose.model('Document', documentSchema)
