// @ts-nocheck

import { restaurantConfig } from '@/config/restaurantConfig';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Lock,
  UserCheck,
} from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import { toast } from 'sonner';

const RESTAURANT_ID = restaurantConfig.id;

export default function EmployeeSignup() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [message, setMessage] = useState(
    'Checking your employee invitation...'
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [existingAccount, setExistingAccount] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const checkInvite = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.user) {
          setError(
            'No active invitation session was found. Please use the link from your employee invitation email.'
          );
          return;
        }

        const user = session.user;
        const normalizedEmail = user.email?.trim().toLowerCase();

        /*
         * First locate the employee membership using the shared Auth user ID.
         */
        let { data: employeeRow, error: employeeError } =
          await supabase
            .from('employees')
            .select('*')
            .eq('restaurant_id', RESTAURANT_ID)
            .eq('auth_user_id', user.id)
            .maybeSingle();

        if (employeeError) {
          throw employeeError;
        }

        /*
         * Fallback for older invitation rows that may not have auth_user_id
         * connected yet.
         */
        if (!employeeRow && normalizedEmail) {
          const { data: employeeByEmail, error: emailLookupError } =
            await supabase
              .from('employees')
              .select('*')
              .eq('restaurant_id', RESTAURANT_ID)
              .eq('email', normalizedEmail)
              .maybeSingle();

          if (emailLookupError) {
            throw emailLookupError;
          }

          employeeRow = employeeByEmail;
        }

        if (!employeeRow) {
          await supabase.auth.signOut();

          throw new Error(
            'This email does not have an employee invitation for this restaurant.'
          );
        }

        if (!employeeRow.is_active) {
          await supabase.auth.signOut();

          throw new Error('This employee account is not active.');
        }

        const employeeStatus = String(
          employeeRow.status || ''
        ).toLowerCase();

        /*
         * Existing customers already have a password. They should never
         * create another password from this page.
         */
        if (employeeStatus === 'active') {
          setExistingAccount(true);
          setEmployee(employeeRow);
          setMessage(
            'Your employee access is already active. Use your existing password.'
          );
          return;
        }

        if (employeeStatus !== 'invited') {
          await supabase.auth.signOut();

          throw new Error(
            'This employee account is not awaiting password setup.'
          );
        }

        setEmployee(employeeRow);
        setMessage('Create your employee password.');
      } catch (err) {
        console.error('Employee invitation check failed:', err);

        setError(
          err?.message || 'Could not verify the employee invitation.'
        );
      } finally {
        setLoading(false);
      }
    };

    checkInvite();
  }, []);

  const handleSetPassword = async (event) => {
    event.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Please enter and confirm your password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (!employee) {
      setError('The employee invitation could not be found.');
      return;
    }

    if (
      String(employee.status || '').toLowerCase() !== 'invited'
    ) {
      setError(
        'This employee account is already active. Please use Employee Login.'
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const user = session?.user;

      if (!user?.id) {
        throw new Error(
          'The invitation session expired. Please use the invitation link again.'
        );
      }

      const { error: passwordError } =
        await supabase.auth.updateUser({
          password,
        });

      if (passwordError) {
        throw passwordError;
      }

      const { error: updateError } = await supabase
        .from('employees')
        .update({
          auth_user_id: user.id,
          status: 'active',
        })
        .eq('id', employee.id)
        .eq('restaurant_id', RESTAURANT_ID);

      if (updateError) {
        throw updateError;
      }

      await supabase.auth.signOut();

      setSuccess(true);
      toast.success('Employee password created!');

      setTimeout(() => {
        window.location.replace('/employee-login');
      }, 1500);
    } catch (err) {
      console.error('Employee password setup failed:', err);

      setError(
        err?.message || 'Could not create the employee password.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <AuthLayout
        icon={CheckCircle}
        title="Employee Account Ready"
        subtitle="You can now sign in"
        footer={
          <p className="text-center text-xs text-muted-foreground">
            Login is powered by{' '}
            <span className="font-semibold text-primary">
              JD Righteous LLC
            </span>
          </p>
        }
      >
        <div className="p-6 text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />

          <p className="mb-4 text-muted-foreground">
            Redirecting to Employee Login...
          </p>

          <Button
            onClick={() =>
              window.location.replace('/employee-login')
            }
            className="w-full"
          >
            Go to Employee Login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (existingAccount) {
    return (
      <AuthLayout
        icon={UserCheck}
        title="Employee Access Ready"
        subtitle="Your existing login credentials will work"
        footer={
          <p className="text-center text-xs text-muted-foreground">
            Login is powered by{' '}
            <span className="font-semibold text-primary">
              JD Righteous LLC
            </span>
          </p>
        }
      >
        <div className="space-y-5 text-center">
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
            <p className="text-sm leading-relaxed">
              Your employee access is already active. You do not need
              to create another password.
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            Use the same email address and password you already use for
            your customer account.
          </p>

          <Button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.replace('/employee-login');
            }}
            className="h-12 w-full"
          >
            Go to Employee Login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserCheck}
      title="Employee Invite"
      subtitle="Create your staff password"
      footer={
        <div className="flex flex-col gap-3 text-center">
          <span className="text-sm text-muted-foreground">
            Already activated?{' '}
            <Link
              to="/employee-login"
              className="font-medium text-primary hover:underline"
            >
              Employee Login
            </Link>
          </span>

          <Link
            to="/register"
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            ← Back to Register
          </Link>

          <p className="pt-3 text-xs text-muted-foreground">
            Login is powered by{' '}
            <span className="font-semibold text-primary">
              JD Righteous LLC
            </span>
          </p>
        </div>
      }
    >
      {loading && (
        <div className="p-6 text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />

          <p className="text-muted-foreground">{message}</p>
        </div>
      )}

      {!loading && error && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>

          <Button
            onClick={() =>
              window.location.replace('/employee-login')
            }
            className="w-full"
          >
            Go to Employee Login
          </Button>
        </div>
      )}

      {!loading && !error && (
        <form
          onSubmit={handleSetPassword}
          className="space-y-4"
        >
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-400">
            <AlertCircle className="mr-1 inline h-3 w-3" />
            Set your password to finish activating your employee
            account.
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee-password">Password</Label>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                id="employee-password"
                type="password"
                autoComplete="new-password"
                placeholder="Create password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                className="h-12 pl-10"
                minLength={6}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee-confirm-password">
              Confirm Password
            </Label>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                id="employee-confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                className="h-12 pl-10"
                minLength={6}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="h-12 w-full"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Password...
              </>
            ) : (
              'Create Employee Password'
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}