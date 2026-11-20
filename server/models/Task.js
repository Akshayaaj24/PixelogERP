import mongoose from 'mongoose'

export const TASK_STATUS = ['todo', 'in_progress', 'review', 'revision', 'on_hold', 'done']
export const TASK_CATEGORIES = ['Script Writing', 'Video Shooting', 'Video Editing', 'Instagram Ads', 'Website Development', 'Client Revisions', 'General']

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
  },
  { timestamps: true }
)

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    category: { type: String, enum: TASK_CATEGORIES, default: 'General' },
    description: { type: String, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    dueDate: { type: Date },
    status: { type: String, enum: TASK_STATUS, default: 'todo' },
    completedAt: { type: Date },
    comments: [commentSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

export default mongoose.model('Task', taskSchema)
