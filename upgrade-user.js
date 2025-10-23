const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function upgradeUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const email = 'wesleysiwela@icloud.com';
    
    const user = await User.findOneAndUpdate(
      { email },
      {
        plan: 'premium',
        subscriptionStatus: 'active',
        usageCount: 0
      },
      { new: true, upsert: true }
    );
    
    console.log(`✅ User ${email} upgraded to premium:`, user);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

upgradeUser();