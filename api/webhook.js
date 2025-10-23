import Stripe from 'stripe';
import mongoose from 'mongoose';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    bufferCommands: false
  });
  isConnected = true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  await connectDB();

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('✅ Payment successful:', session.id);
        
        // Get customer email from Stripe
        const customer = await stripe.customers.retrieve(session.customer);
        
        // Upgrade user to premium
        const user = await User.findOneAndUpdate(
          { email: customer.email },
          {
            plan: 'premium',
            stripeCustomerId: session.customer,
            subscriptionId: session.subscription,
            subscriptionStatus: 'active',
            usageCount: 0 // Reset usage count
          },
          { new: true }
        );
        
        if (user) {
          console.log(`🚀 User ${customer.email} upgraded to premium`);
        } else {
          console.log(`❌ User not found: ${customer.email}`);
        }
        break;

      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        console.log('❌ Subscription canceled:', subscription.id);
        
        // Downgrade user to free
        await User.findOneAndUpdate(
          { subscriptionId: subscription.id },
          { 
            plan: 'free',
            subscriptionStatus: 'canceled',
            usageCount: 0,
            maxUsage: 5
          }
        );
        break;

      case 'invoice.payment_failed':
        const invoice = event.data.object;
        console.log('💳 Payment failed:', invoice.id);
        
        // Get customer and downgrade after failed payment
        const failedCustomer = await stripe.customers.retrieve(invoice.customer);
        await User.findOneAndUpdate(
          { email: failedCustomer.email },
          { 
            plan: 'free',
            subscriptionStatus: 'payment_failed',
            usageCount: 0,
            maxUsage: 5
          }
        );
        console.log(`⬇️ User ${failedCustomer.email} downgraded due to payment failure`);
        break;

      case 'customer.subscription.updated':
        const updatedSub = event.data.object;
        
        // Handle subscription status changes
        if (updatedSub.status === 'past_due' || updatedSub.status === 'unpaid') {
          const pastDueCustomer = await stripe.customers.retrieve(updatedSub.customer);
          await User.findOneAndUpdate(
            { email: pastDueCustomer.email },
            { 
              plan: 'free',
              subscriptionStatus: updatedSub.status,
              usageCount: 0,
              maxUsage: 5
            }
          );
          console.log(`⬇️ User ${pastDueCustomer.email} downgraded due to ${updatedSub.status}`);
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
}