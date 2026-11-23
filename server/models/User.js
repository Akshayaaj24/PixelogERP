import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

// admin = owner (everything), manager = runs daily work, member = editor / writer / developer…
// ('employee' is the old name for member — still accepted)
export const ROLES = ['admin', 'manager', 'member', 'employee']

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'member' },
    designation: { type: String, default: '' }, // Video Editor, Script Writer, Developer…
    phone: { type: String, default: '' },
    photo: { type: String, default: '' }, // small image (data URL)
    joiningDate: { type: Date, default: Date.now },
    bondEndDate: { type: Date }, // admin only
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

userSchema.pre('save', async function () {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 10)
})

userSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.password)
}

export const roleOf = (u) => (u?.role === 'employee' ? 'member' : u?.role)

export default mongoose.model('User', userSchema)
