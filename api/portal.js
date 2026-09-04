import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    // 1. Fetch the user's profile to get their stripe_customer_id
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // 2. Check if they actually have a Stripe account
    if (!profile.stripe_customer_id) {
      return res.status(400).json({ 
        error: 'no_stripe_account',
        message: 'You were manually granted Pro access, so you do not have an active Stripe subscription to manage!' 
      });
    }

    // 3. Generate a seamless, 1-click Portal Session (bypassing the email login screen)
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: req.headers.origin || 'https://kinchronicles.app',
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Error creating portal session:', err);
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
}
