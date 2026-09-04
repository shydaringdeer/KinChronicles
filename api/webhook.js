import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// We use the service role key here to bypass RLS on the backend securely
const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Vercel config: disable body parsing so we can verify the raw Stripe signature
export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf.toString(), sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful payments
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // The user's Supabase UUID is passed in the client_reference_id
    const userId = session.client_reference_id;
    const stripeCustomerId = session.customer; // This is the ID we need to save!

    if (userId) {
      console.log(`Upgrading user ${userId} to Pro...`);
      const { error } = await supabase
        .from('profiles')
        .update({ 
          subscription_tier: 'pro',
          stripe_customer_id: stripeCustomerId
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user profile:', error);
        return res.status(500).json({ error: 'Database update failed' });
      }
    } else {
      console.warn('Checkout completed but no client_reference_id was found!');
    }
  }

  // Handle Cancellations
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const stripeCustomerId = subscription.customer;

    console.log(`Downgrading Stripe Customer ${stripeCustomerId} to Free...`);
    const { error } = await supabase
      .from('profiles')
      .update({ subscription_tier: 'free' })
      .eq('stripe_customer_id', stripeCustomerId);

    if (error) {
      console.error('Error downgrading user profile:', error);
      return res.status(500).json({ error: 'Database update failed' });
    }
  }

  res.json({ received: true });
}
