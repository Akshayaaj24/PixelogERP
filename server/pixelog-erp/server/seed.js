// Creates the first admin login. Add --demo to also load sample data.
//   npm run seed                    → admin only
//   npm run seed -- --demo          → admin + demo manager, members, clients, calendar
//   npm run seed -- --demo --fresh  → wipes everything first
import 'dotenv/config'
import mongoose from 'mongoose'
import User from './models/User.js'
import Client from './models/Client.js'
import Work from './models/Work.js'
import Payment from './models/Payment.js'
import Activity from './models/Activity.js'
import Document from './models/Document.js'
import { autofillPeople, stagesFor } from './utils/work.js'
import { currentMonth } from './utils/time.js'

const demo = process.argv.includes('--demo')
const fresh = process.argv.includes('--fresh')
await mongoose.connect(process.env.MONGO_URI)

if (fresh) {
  await Promise.all([User, Client, Work, Payment, Activity, Document].map((M) => M.deleteMany({})))
  for (const old of ['reels', 'tasks']) await mongoose.connection.db.collection(old).deleteMany({}).catch(() => {})
}

let admin = await User.findOne({ role: 'admin' })
if (!admin) {
  admin = await User.create({ name: 'PIXELOG Admin', email: 'admin@pixelog.in', password: 'admin123', role: 'admin', designation: 'Founder' })
  console.log('Admin created → admin@pixelog.in / admin123  (change this password after login)')
} else console.log('Admin already exists:', admin.email)

if (demo && !fresh && (await User.countDocuments({ role: { $ne: 'admin' } })) > 0) {
  console.log('\nThe database already has team members, so demo data was NOT added (it would create duplicates).')
  console.log('  • Keep your data and upgrade it:   npm run migrate')
  console.log('  • Delete everything + load demo:   npm run seed -- --demo --fresh\n')
  await mongoose.disconnect()
  process.exit(0)
}

if (demo) {
  const day = (n) => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() + n); return d }
  const mk = (name, email, designation, role = 'member', extra = {}) => User.create({ name, email, password: 'pixelog123', designation, role, joiningDate: day(-200), ...extra })
  const manager = await mk('Divya', 'manager@pixelog.in', 'Operations Manager', 'manager')
  const arun = await mk('Arun', 'arun@pixelog.in', 'Video Editor', 'member', { bondEndDate: day(20) })
  const john = await mk('John', 'john@pixelog.in', 'Video Editor')
  const priya = await mk('Priya', 'priya@pixelog.in', 'Script Writer')
  const karthik = await mk('Karthik', 'karthik@pixelog.in', 'Videographer')
  const vijay = await mk('Vijay', 'vijay@pixelog.in', 'Web Developer')
  const meena = await mk('Meena', 'meena@pixelog.in', 'Graphic Designer')

  const base = { phone: '9000000000', startDate: day(-180), monthlyPackage: 10000 }
  const clients = await Client.insertMany([
    { ...base, name: 'Shri Sai', businessName: 'Shri Sai Bridal Jewels', category: 'Jewellery', instagram: 'https://instagram.com/shrisaibridaljewels', services: ['Digital Marketing', 'Website', 'Video Production'], monthlyPackage: 15000, reelsPerMonth: 12, postersPerMonth: 8, websiteStatus: 'live', language: 'Tanglish', brandNotes: 'Luxury bridal jewellery, Thoothukudi. Premium, elegant tone.', team: { script: priya._id, shoot: karthik._id, editing: arun._id, poster: meena._id, website: vijay._id } },
    { ...base, name: 'Vetrivel', businessName: 'Vetrivel Goldsmith Jewellers', category: 'Jewellery', instagram: 'https://instagram.com/vetriveljewellers', services: ['Digital Marketing', 'Video Production'], reelsPerMonth: 10, postersPerMonth: 6, language: 'Tamil', brandNotes: 'Traditional goldsmith from Thiruchendur. Trust and heritage.', team: { script: priya._id, shoot: karthik._id, editing: arun._id, poster: meena._id } },
    { ...base, name: 'Khalid', businessName: "Khalid's Multi Cuisine Restaurant", category: 'Restaurant', instagram: 'https://instagram.com/khalidsrestaurant', services: ['Digital Marketing', 'Meta Ads'], reelsPerMonth: 8, postersPerMonth: 8, language: 'Tanglish', brandNotes: 'Fun, food close-ups, Friday biryani special.', team: { script: priya._id, shoot: karthik._id, editing: john._id, poster: meena._id, ads: meena._id } },
    { ...base, name: 'Axel Academy', businessName: 'Axel Academy', category: 'Education', services: ['Digital Marketing', 'Google Ads'], reelsPerMonth: 6, postersPerMonth: 4, team: { script: priya._id, shoot: karthik._id, editing: john._id, poster: meena._id, ads: meena._id } },
    { ...base, name: 'Sudha', businessName: 'Sudha Novelties', category: 'Retail', services: ['Website', 'Software'], monthlyPackage: 8000, websiteStatus: 'in_progress', team: { website: vijay._id } },
  ])
  const [shriSai, vetrivel, khalid, axel, sudha] = clients

  const item = (client, type, title, d, stage, status, extra = {}) => {
    const st = stage || stagesFor(type).at(-1)
    return { client: client._id, type, title, date: day(d), time: type === 'reel' ? '18:00' : '', stage: st, status, people: autofillPeople(type, client.team), createdBy: manager._id, doneAt: status === 'done' ? day(d) : undefined, ...extra }
  }
  await Work.insertMany([
    item(shriSai, 'reel', 'Bridal Collection Showcase', -6, 'editing', 'done'),
    item(shriSai, 'reel', 'Customer Bride Story', -3, 'editing', 'done'),
    item(shriSai, 'reel', 'Temple Jewellery Close-ups', -1, 'editing', 'done'),
    item(shriSai, 'reel', 'Wedding Season Offer', 0, 'editing', 'waiting', { submittedAt: new Date() }),
    item(shriSai, 'reel', 'Bride Getting Ready – BTS', 1, 'editing', 'processing'),
    item(shriSai, 'reel', 'Necklace Making Process', 3, 'shoot', 'start'),
    item(shriSai, 'reel', 'Akshaya Tritiya Teaser', 6, 'script', 'processing'),
    item(shriSai, 'poster', 'Weekend Offer Poster', 1, null, 'processing'),
    item(shriSai, 'poster', 'New Arrivals Poster', -2, null, 'done'),
    item(shriSai, 'website', 'Update product gallery', 4, null, 'start'),
    item(vetrivel, 'reel', 'Today Gold Rate Update', 0, 'editing', 'processing'),
    item(vetrivel, 'reel', 'How We Make a Gold Chain', 2, 'script', 'waiting'),
    item(vetrivel, 'reel', 'Old Customer Story', -4, 'editing', 'done'),
    item(khalid, 'reel', 'Biryani Friday', 1, 'editing', 'approved'),
    item(khalid, 'reel', 'New Shawarma Counter', -2, 'editing', 'processing', { changeNote: 'Make the opening faster' }),
    item(khalid, 'ads', 'Weekend Meta Ads campaign', 2, null, 'processing'),
    item(axel, 'reel', 'Student Testimonial', 2, 'shoot', 'start'),
    item(axel, 'poster', 'Admissions Open Poster', 0, null, 'waiting'),
    item(sudha, 'website', 'Home page design', 5, null, 'processing'),
  ])

  const month = currentMonth()
  await Payment.insertMany([
    { client: shriSai._id, month, amount: 15000, status: 'paid', paidDate: day(-10) },
    { client: vetrivel._id, month, amount: 10000, status: 'paid', paidDate: day(-8) },
    { client: khalid._id, month, amount: 10000, status: 'pending' },
  ])
  await Activity.insertMany([
    { user: arun._id, text: 'submitted "Wedding Season Offer" (Shri Sai) for approval' },
    { user: manager._id, text: 'moved "Necklace Making Process" (Shri Sai) to Shoot', notify: [karthik._id] },
  ])
  console.log('Demo data loaded.')
  console.log('  Manager: manager@pixelog.in / pixelog123')
  console.log('  Members: arun@ john@ priya@ karthik@ vijay@ meena@pixelog.in / pixelog123')
}
await mongoose.disconnect()
