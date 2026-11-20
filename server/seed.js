// Creates the first admin login. Add --demo to also load sample data.
//   npm run seed                → admin only
//   npm run seed -- --demo      → admin + demo team, clients, reels, tasks
//   npm run seed -- --demo --fresh → wipes everything first
import 'dotenv/config'
import mongoose from 'mongoose'
import User from './models/User.js'
import Client from './models/Client.js'
import Reel from './models/Reel.js'
import Task from './models/Task.js'
import Payment from './models/Payment.js'
import Activity from './models/Activity.js'

const demo = process.argv.includes('--demo')
const fresh = process.argv.includes('--fresh')

await mongoose.connect(process.env.MONGO_URI)

if (fresh) await Promise.all([User, Client, Reel, Task, Payment, Activity].map((M) => M.deleteMany({})))

let admin = await User.findOne({ role: 'admin' })
if (!admin) {
  admin = await User.create({ name: 'PIXELOG Admin', email: 'admin@pixelog.in', password: 'admin123', role: 'admin', designation: 'Founder' })
  console.log('Admin created → admin@pixelog.in / admin123  (change this password after login)')
} else console.log('Admin already exists:', admin.email)

if (demo) {
  const day = (n, h = 0) => { const d = new Date(); d.setHours(h, 0, 0, 0); d.setDate(d.getDate() + n); return d }
  const team = []
  for (const [name, email, designation] of [
    ['Priya', 'priya@pixelog.in', 'Video Editor'],
    ['Arun', 'arun@pixelog.in', 'Script Writer'],
    ['Karthik', 'karthik@pixelog.in', 'Videographer'],
    ['Vijay', 'vijay@pixelog.in', 'Web Developer'],
  ]) team.push(await User.create({ name, email, password: 'pixelog123', designation }))
  const [priya, arun, karthik, vijay] = team

  const clients = await Client.insertMany([
    { name: 'Shri Sai Bridal Jewels', category: 'Jewellery', contactPerson: 'Owner', phone: '9000000001', services: ['Instagram Reels', 'Website Development'], monthlyPackage: 15000, reelsPerMonth: 12, manager: admin._id, language: 'Tanglish', brandNotes: 'Luxury bridal jewellery. Premium, elegant tone. Focus on bridal sets, wedding season, Akshaya Tritiya.' },
    { name: 'Vetrivel Jewellers', category: 'Jewellery', contactPerson: 'Owner', phone: '9000000002', services: ['Instagram Reels', 'Video Editing'], monthlyPackage: 12000, reelsPerMonth: 10, manager: admin._id, language: 'Tamil', brandNotes: 'Traditional goldsmith from Thiruchendur. Trust, heritage, daily gold rate.' },
    { name: "Khalid's Multi Cuisine", category: 'Restaurant', contactPerson: 'Khalid', phone: '9000000003', services: ['Instagram Reels', 'Instagram Ads'], monthlyPackage: 10000, reelsPerMonth: 8, manager: admin._id, language: 'Tanglish', brandNotes: 'Fun, food-close-ups, Friday biryani special.' },
    { name: 'Axel Academy', category: 'Education', contactPerson: 'Principal', phone: '9000000004', services: ['Instagram Reels', 'Video Production'], monthlyPackage: 9000, reelsPerMonth: 6, manager: admin._id, language: 'English' },
    { name: 'Annai Jewellers', category: 'Jewellery', phone: '9000000005', services: ['Instagram Reels'], monthlyPackage: 8000, reelsPerMonth: 8, manager: admin._id, language: 'Tamil' },
    { name: 'Jayam Fashion Institute', category: 'Education', phone: '9000000006', services: ['Instagram Reels', 'Instagram Ads'], monthlyPackage: 8000, reelsPerMonth: 6, manager: admin._id },
    { name: 'Sudha Novelties', category: 'Retail', phone: '9000000007', services: ['Website Development'], monthlyPackage: 0, manager: admin._id },
    { name: 'Sathya', category: 'Retail', phone: '9000000008', services: ['Instagram Ads'], monthlyPackage: 6000, manager: admin._id },
  ])
  const [shriSai, vetrivel, khalid, axel, annai, jayam, sudha, sathya] = clients

  await Reel.insertMany([
    { client: shriSai._id, title: 'Bridal Collection Showcase', postDate: day(0), postTime: '10:00', scriptWriter: arun._id, editor: priya._id, stage: 'posted' },
    { client: vetrivel._id, title: 'Today Gold Rate Update', postDate: day(0), postTime: '11:30', scriptWriter: arun._id, editor: priya._id, stage: 'editing' },
    { client: annai._id, title: 'Wedding Season Offer', postDate: day(0), postTime: '17:00', scriptWriter: arun._id, editor: priya._id, stage: 'sent_to_client' },
    { client: khalid._id, title: 'Biryani Friday', postDate: day(1), postTime: '13:00', scriptWriter: arun._id, editor: priya._id, stage: 'script' },
    { client: axel._id, title: 'Student Testimonial', postDate: day(2), postTime: '18:00', scriptWriter: arun._id, editor: priya._id, stage: 'shoot' },
    { client: jayam._id, title: 'Fashion Show Behind the Scenes', postDate: day(2), postTime: '19:00', scriptWriter: arun._id, editor: priya._id, stage: 'sent_to_owner' },
    { client: shriSai._id, title: 'Temple Jewellery Close-ups', postDate: day(3), postTime: '10:00', scriptWriter: arun._id, editor: priya._id, stage: 'idea' },
    { client: vetrivel._id, title: 'How We Make a Gold Chain', postDate: day(4), postTime: '18:30', scriptWriter: arun._id, editor: priya._id, stage: 'idea' },
    { client: khalid._id, title: 'New Shawarma Counter', postDate: day(5), postTime: '19:00', scriptWriter: arun._id, editor: priya._id, stage: 'approved' },
    { client: shriSai._id, title: 'Customer Bride Story', postDate: day(-2), postTime: '10:00', scriptWriter: arun._id, editor: priya._id, stage: 'posted' },
    { client: axel._id, title: 'Admissions Open', postDate: day(-1), postTime: '18:00', scriptWriter: arun._id, editor: priya._id, stage: 'editing' },
  ].map((r) => ({ ...r, createdBy: admin._id })))

  await Task.insertMany([
    { title: 'Jayam Fashion – shoot 4 reels', client: jayam._id, category: 'Video Shooting', assignedTo: karthik._id, priority: 'high', dueDate: day(1, 18) },
    { title: 'Sudha Novelties – website home page', client: sudha._id, category: 'Website Development', assignedTo: vijay._id, dueDate: day(3, 18) },
    { title: 'Sathya – Diwali ad creatives', client: sathya._id, category: 'Instagram Ads', assignedTo: arun._id, priority: 'high', dueDate: day(-2, 18), status: 'in_progress' },
    { title: "Khalid's – menu reel revision", client: khalid._id, category: 'Client Revisions', assignedTo: priya._id, dueDate: day(-1, 18), status: 'revision' },
    { title: 'Monthly content plan – December', category: 'General', assignedTo: arun._id, dueDate: day(0, 18) },
    { title: 'Shri Sai – update product gallery', client: shriSai._id, category: 'Website Development', assignedTo: vijay._id, dueDate: day(-3, 18), status: 'done', completedAt: day(-3, 17) },
  ].map((t) => ({ ...t, createdBy: admin._id })))

  const month = new Date().toLocaleDateString('en-CA').slice(0, 7)
  await Payment.insertMany([
    { client: shriSai._id, month, amount: 15000, status: 'paid', paidDate: day(-10) },
    { client: vetrivel._id, month, amount: 12000, status: 'paid', paidDate: day(-8) },
    { client: khalid._id, month, amount: 10000, status: 'pending' },
  ])

  await Activity.insertMany([
    { user: admin._id, text: 'added new client Sathya' },
    { user: priya._id, text: 'moved "Fashion Show Behind the Scenes" (Jayam Fashion Institute) to Sent to Owner' },
    { user: arun._id, text: 'marked "Sathya – Diwali ad creatives" as in progress' },
  ])
  console.log('Demo data loaded. Team logins: priya@ / arun@ / karthik@ / vijay@pixelog.in — password pixelog123')
}

await mongoose.disconnect()
