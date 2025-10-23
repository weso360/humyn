import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  password: { type: String, required: function() { return this.provider === 'email'; } },
  picture: String,
  provider: { type: String, enum: ['google', 'email'], default: 'email' },
  plan: { type: String, enum: ['free', 'premium', 'enterprise'], default: 'free' },
  stripeCustomerId: String,
  subscriptionId: String,
  subscriptionStatus: String,
  usageCount: { type: Number, default: 0 },
  maxUsage: { type: Number, default: 5 },
  lastResetDate: { type: Date, default: Date.now }
}, { timestamps: true });

const reportSchema = new mongoose.Schema({
  type: { type: String, enum: ['feature', 'bug', 'improvement'], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  email: String,
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  resolvedAt: Date,
  resolvedBy: String
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false
  });
  isConnected = true;
}

const ADMIN_EMAILS = ['wesleysiwela@icloud.com'];

export default async function handler(req, res) {
  await connectDB();

  if (req.method === 'GET') {
    // Get all reports (admin only)
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Access token required' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user || !ADMIN_EMAILS.includes(user.email)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const reports = await Report.find({}).sort({ createdAt: -1 });
      res.json(reports);

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  else if (req.method === 'POST') {
    // Create new report
    try {
      const { type, title, description, email } = req.body;
      
      if (!type || !title || !description) {
        return res.status(400).json({ error: 'Type, title, and description are required' });
      }

      const report = new Report({
        type,
        title,
        description,
        email: email || 'anonymous'
      });

      await report.save();
      res.json({ success: true, message: 'Report submitted successfully' });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  else if (req.method === 'DELETE') {
    // Delete report (admin only)
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Access token required' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user || !ADMIN_EMAILS.includes(user.email)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { id } = req.query;
      await Report.findByIdAndDelete(id);
      res.json({ success: true, message: 'Report deleted successfully' });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}