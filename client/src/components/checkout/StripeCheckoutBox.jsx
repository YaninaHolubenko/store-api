// client/src/components/checkout/StripeCheckoutBox.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import styles from './StripeCheckoutBox.module.css';
import { getToken } from '../../api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const STRIPE_PK = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '';

function PaymentForm({ onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  async function handlePay() {
    if (!stripe || !elements) return;

    try {
      setSubmitting(true);
      setErr(null);

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        setErr(error.message || 'Payment failed. Please try again.');
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        onSuccess?.(paymentIntent);
      } else {
        setErr(`Payment status: ${paymentIntent?.status || 'unknown'}`);
      }
    } catch (e) {
      setErr(e?.message || 'Payment failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.box}>
      <PaymentElement />
      {err ? <div className={styles.error} role="alert">{err}</div> : null}
      <Button onClick={handlePay} disabled={!stripe || submitting}>
        {submitting ? 'Processing…' : 'Pay now'}
      </Button>
    </div>
  );
}

export default function StripeCheckoutBox({ onSuccess }) {
  const navigate = useNavigate();
  const [clientSecret, setClientSecret] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const stripePromise = useMemo(() => {
    return STRIPE_PK ? loadStripe(STRIPE_PK) : null;
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const token = getToken();
        const res = await fetch(`${API_URL}/payments/create-intent`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (res.status === 401) {
          if (active) {
            navigate('/login', { replace: true, state: { from: '/checkout' } });
          }
          return;
        }

        let data = null;
        try {
          const text = await res.text();
          data = text ? JSON.parse(text) : null;
        } catch (_) {}

        if (!res.ok) {
          const msg =
            (data && (data.error || data.message)) ||
            `Payment initialization failed (HTTP ${res.status})`;
          throw new Error(msg);
        }

        if (!data?.clientSecret) {
          throw new Error('Payment initialization failed. Please try again.');
        }

        if (active) setClientSecret(data.clientSecret);
      } catch (e) {
        if (active) {
          const userMsg =
            e?.message?.includes('Failed to fetch')
              ? 'Payment service is temporarily unavailable. Please try again later.'
              : e?.message || 'Failed to initialize payment. Please try again.';
          setErr(userMsg);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [navigate]);

  if (!STRIPE_PK) {
    return <small className={styles.hint}>Payment is unavailable: missing publishable key.</small>;
  }
  if (loading) {
    return <div className={styles.loading}>Preparing payment…</div>;
  }
  if (err) {
    return <div className={styles.error} role="alert">{err}</div>;
  }
  if (!clientSecret || !stripePromise) {
    return <div className={styles.loading}>Preparing payment…</div>;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: { theme: 'stripe' },
      }}
    >
      <PaymentForm onSuccess={onSuccess} />
    </Elements>
  );
}
