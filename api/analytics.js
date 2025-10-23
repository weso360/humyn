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

const User = mongoose.models.User || mongoose.model('User', userSchema);

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

// Admin emails - only these can access analytics
const ADMIN_EMAILS = ['wesleysiwela@icloud.com'];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    // Check authentication
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get analytics data
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total users by plan
    const totalUsers = await User.countDocuments();
    const freeUsers = await User.countDocuments({ plan: 'free' });
    const premiumUsers = await User.countDocuments({ plan: 'premium' });

    // Usage statistics
    const allUsers = await User.find({}, 'usageCount createdAt');
    const totalHumanizations = allUsers.reduce((sum, user) => sum + user.usageCount, 0);
    
    const usersToday = await User.countDocuments({ createdAt: { $gte: today } });
    const usersWeek = await User.countDocuments({ createdAt: { $gte: weekAgo } });

    // Calculate averages
    const avgUsagePerUser = totalUsers > 0 ? Math.round(totalHumanizations / totalUsers) : 0;
    const peakUsage = Math.max(...allUsers.map(u => u.usageCount), 0);

    // Revenue calculations (simplified)
    const monthlyRevenue = premiumUsers * 9.99;
    const mrr = monthlyRevenue;
    const activeSubscriptions = premiumUsers;

    // Recent users (last 10)
    const recentUsers = await User.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select('email plan usageCount maxUsage createdAt');

    // Top users by usage
    const topUsers = await User.find({})
      .sort({ usageCount: -1 })
      .limit(10)
      .select('email usageCount');

    const analytics = {
      totalUsers,
      freeUsers,
      premiumUsers,
      totalHumanizations,
      humanizationsToday: usersToday, // Simplified - using new users as proxy
      humanizationsWeek: usersWeek,
      monthlyRevenue: monthlyRevenue.toFixed(2),
      mrr: mrr.toFixed(2),
      activeSubscriptions,
      avgUsagePerUser,
      peakUsage,
      recentUsers,
      topUsers
    };

    res.json(analytics);

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: error.message });
  }
}