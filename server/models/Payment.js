import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    month: { type: String, required: true }, // "2026-11"
    amount: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paidDate: { type: Date },
    note: { type: String, default: '' },
  },
  { timestamps: true }
)
paymentSchema.index({ client: 1, month: 1 }, { unique: true })

export default mongoose.model('Payment', paymentSchema)
