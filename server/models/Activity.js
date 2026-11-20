import mongoose from 'mongoose'

// "Priya moved 'Gold Rate Reel' to Sent to Owner" — feeds notifications + recent activity
const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
    // who should see it in their notifications (empty = admins only)
    notify: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

export default mongoose.model('Activity', activitySchema)
