// @ts-nocheck

import { restaurantConfig } from '@/config/restaurantConfig';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  LogIn,
  Mail,
  Lock,
  Loader2,
} from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';

const RESTAURANT_ID = restaurantConfig.id;

function createCustomerCode() {
  const prefix = restaurantConfig.customerCodePrefix || 'PIT';

  return `${prefix}-${Math.floor(10000 + Math.random() * 90000)}`;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (authError || !authData?.user) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      const authUserId = authData.user.id;

      const { data: existingCustomer, error: customerLookupError } =
        await supabase
          .from('customers')
          .select('*')
          .eq('restaurant_id', RESTAURANT_ID)
          .eq('auth_user_id', authUserId)
          .maybeSingle();

      if (customerLookupError) {
        throw customerLookupError;
      }

      if (!existingCustomer) {
        const name =
          authData.user.user_metadata?.full_name ||
          authData.user.user_metadata?.name ||
          cleanEmail.split('@')[0];

        const customerRow = {
          restaurant_id: RESTAURANT_ID,
          auth_user_id: authUserId,
          customer_code: createCustomerCode(),
          name,
          email: cleanEmail,
          points_balance: 0,
          lifetime_points: 0,
          lifetime_spend: 0,
          visit_count: 0,
          active: true,
        };

        const { error: insertError } = await supabase
          .from('customers')
          .insert([customerRow]);

        if (insertError) {
          /*
           * If two login requests try to create the same restaurant
           * membership at nearly the same time, Supabase may return a
           * unique-constraint error even though the row now exists.
           */
          if (insertError.code === '23505') {
            const { data: createdCustomer, error: recheckError } =
              await supabase
                .from('customers')
                .select('id')
                .eq('restaurant_id', RESTAURANT_ID)
                .eq('auth_user_id', authUserId)
                .maybeSingle();

            if (recheckError || !createdCustomer) {
              throw insertError;
            }
          } else {
            throw insertError;
          }
        }
      }

      window.location.replace('/');
    } catch (err) {
      console.error('Customer login failed:', err);

      await supabase.auth.signOut();

      setError(
        err?.message ||
          'We could not connect your account to this restaurant. Please try again.'
      );

      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome Back"
      subtitle="Log in to your rewards account"
      footer={
        <div className="flex flex-col gap-3 text-center">
          <span className="text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-primary hover:underline"
            >
              Sign up
            </Link>
          </span>

          <p className="pt-3 text-xs text-muted-foreground">
            Login is powered by{' '}
            <span className="font-semibold text-primary">
              JD Righteous LLC
            </span>
          </p>
        </div>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>

          <div className="relative">
            <Mail
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />

            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 pl-10"
              disabled={loading}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>

            <Link
              to="/forgot-password"
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />

            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 pl-10"
              disabled={loading}
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="h-12 w-full font-medium"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logging in...
            </>
          ) : (
            'Member Log In'
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}