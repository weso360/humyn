const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Create checkout session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Humyn Premium',
              description: 'Unlimited humanizations and premium features'
            },
            unit_amount: 999, // $9.99
            recurring: {
              interval: 'month'
            }
          },
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/pricing`,
      customer_email: user.email,
      metadata: {
        userId: user._id.toString()
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stripe webhook
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed.`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;
    
    await User.findByIdAndUpdate(userId, {
      plan: 'premium',
      stripeCustomerId: session.customer,
      subscriptionId: session.subscription,
      subscriptionStatus: 'active'
    });
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    
    await User.findOneAndUpdate(
      { subscriptionId: subscription.id },
      { 
        plan: 'free',
        subscriptionStatus: 'canceled',
        usageCount: 0,
        maxUsage: 5
      }
    );
  }

  res.json({received: true});
});

module.exports = router;