// @ts-nocheck

import { restaurantConfig } from '@/config/restaurantConfig';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';

const RESTAURANT_ID = restaurantConfig.id;

function createCustomerCode() {
  const prefix = restaurantConfig.customerCodePrefix || 'PIT';

  return `${prefix}-${Math.floor(10000 + Math.random() * 90000)}`;
}

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingAccount, setExistingAccount] = useState(false);

  const handleRegister = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');
    setExistingAccount(false);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const name = cleanEmail.split('@')[0];
      const customerCode = createCustomerCode();

      const emailHeaderUrl = new URL(
        restaurantConfig.emailHeaderImage,
        window.location.origin
      ).toString();

      const signupMetadata = {
        restaurant_id: RESTAURANT_ID,
        restaurant_name: restaurantConfig.restaurantName,
        signup_origin: window.location.origin,
        email_header_url: emailHeaderUrl,
        primary_color: restaurantConfig.primaryColor,
      };

      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: signupMetadata,
          },
        });

      const errorMessage = String(
        authError?.message || ''
      ).toLowerCase();

      const duplicateError =
        errorMessage.includes('already registered') ||
        errorMessage.includes('already exists') ||
        errorMessage.includes('user already');

      /*
       * With email confirmation enabled, Supabase may intentionally hide
       * whether an email already exists. In that case, the returned user
       * commonly has an empty identities array.
       */
      const returnedIdentities = authData?.user?.identities;

      const obfuscatedExistingUser =
        Array.isArray(returnedIdentities) &&
        returnedIdentities.length === 0;

      if (duplicateError || obfuscatedExistingUser) {
        setExistingAccount(true);
        setPassword('');
        setConfirm('');
        return;
      }

      if (authError) {
        throw authError;
      }

      const authUserId = authData?.user?.id;

      if (!authUserId) {
        throw new Error('Could not create customer account.');
      }

      const customerRow = {
        restaurant_id: RESTAURANT_ID,
        auth_user_id: authUserId,
        customer_code: customerCode,
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
        throw insertError;
      }

      setEmail('');
      setPassword('');
      setConfirm('');

      setSuccess(
        'Account created successfully! Please check your email and click the verification link before logging in.'
      );
    } catch (err) {
      console.error('Customer signup failed:', err);

      setError(
        err?.message || 'Signup failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (existingAccount) {
    return (
      <AuthLayout
        icon={UserCheck}
        title="Account Already Exists"
        subtitle="Your login credentials work across JD Righteous LLC-powered apps"
        footer={
          <Link
            to="/register"
            className="font-medium text-primary hover:underline"
            onClick={() => setExistingAccount(false)}
          >
            <ArrowLeft className="mr-1 inline h-3 w-3" />
            Return to sign up
          </Link>
        }
      >
        <div className="space-y-5 text-center">
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-5">
            <p className="text-sm leading-relaxed text-foreground">
              You already have login credentials with an existing JD Righteous
              LLC-powered app. Please return to the login page and log in as
              usual.
            </p>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            After you sign in, this restaurant will be added to your account
            with its own separate rewards, points, visits, and purchase history.
          </p>

          <Button asChild className="h-12 w-full font-medium">
            <Link to="/login">
              <UserCheck className="mr-2 h-4 w-4" />
              Return to Login
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-12 w-full font-medium"
          >
            <Link to="/forgot-password">
              <KeyRound className="mr-2 h-4 w-4" />
              Forgot Password?
            </Link>
          </Button>

          <p className="text-xs text-muted-foreground">
            Sign in is powered by JD Righteous LLC
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create Account"
      subtitle="Join the rewards program today"
      footer={
        <div className="flex flex-col gap-3 text-center">
          <span className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-primary hover:underline"
            >
              Log In
            </Link>
          </span>

          <Link
            to="/register"
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            ← Back to Register
          </Link>

          <p className="pt-3 text-xs text-muted-foreground">
            Powered by{' '}
            <span className="font-semibold text-primary">
              JD Righteous LLC
            </span>
          </p>
        </div>
      }
    >
      {success && (
        <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-600">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
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
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 pl-10"
              disabled={loading}
              required
              autoFocus
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>

          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />

            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 pl-10"
              disabled={loading}
              minLength={6}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>

          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />

            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="h-12 pl-10"
              disabled={loading}
              minLength={6}
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
              Creating Account...
            </>
          ) : (
            'Create Account'
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}