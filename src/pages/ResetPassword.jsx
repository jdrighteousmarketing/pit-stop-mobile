// @ts-nocheck

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Lock,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const checkRecoverySession = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          setHasRecoverySession(true);
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (
            event === "PASSWORD_RECOVERY" ||
            event === "SIGNED_IN"
          ) {
            setHasRecoverySession(Boolean(session?.user));
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (err) {
        console.error("Password recovery session failed:", err);
        setError(
          err.message ||
            "This password reset link is invalid or has expired."
        );
      } finally {
        setCheckingSession(false);
      }
    };

    let cleanup;

    checkRecoverySession().then((unsubscribe) => {
      cleanup = unsubscribe;
    });

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!newPassword || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);

      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
      }, 1800);
    } catch (err) {
      console.error("Password reset failed:", err);
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className="flex flex-col gap-3 text-center">
      <Link
        to="/login"
        className="text-primary font-medium hover:underline"
      >
        Back to Log In
      </Link>

      <Link
        to="/register"
        className="text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        Back to Register
      </Link>

      <p className="pt-3 text-xs text-muted-foreground">
        Login is powered by{" "}
        <span className="font-semibold text-primary">
          JD Righteous LLC
        </span>
      </p>
    </div>
  );

  if (checkingSession) {
    return (
      <AuthLayout
        icon={Lock}
        title="Checking Reset Link"
        subtitle="Please wait a moment"
        footer={footer}
      >
        <div className="text-center p-6">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">
            Verifying your password reset request...
          </p>
        </div>
      </AuthLayout>
    );
  }

  if (!hasRecoverySession && !success) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title="Invalid Reset Link"
        subtitle="This password reset link is invalid or has expired"
        footer={
          <div className="flex flex-col gap-3 text-center">
            <Link
              to="/forgot-password"
              className="text-primary font-medium hover:underline"
            >
              Request a New Link
            </Link>

            <Link
              to="/register"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Back to Register
            </Link>

            <p className="pt-3 text-xs text-muted-foreground">
              Login is powered by{" "}
              <span className="font-semibold text-primary">
                JD Righteous LLC
              </span>
            </p>
          </div>
        }
      >
        <p className="text-sm text-foreground text-center">
          Please request a new password reset email and use the newest
          link you receive.
        </p>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout
        icon={CheckCircle}
        title="Password Updated"
        subtitle="Your password was reset successfully"
        footer={footer}
      >
        <div className="text-center p-6">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />

          <p className="text-sm text-muted-foreground">
            Redirecting you to the login page...
          </p>

          <Button
            type="button"
            className="w-full mt-5"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
          >
            Go to Log In
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={Lock}
      title="New Password"
      subtitle="Enter your new password below"
      footer={footer}
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>

          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              aria-hidden="true"
            />

            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              autoFocus
              placeholder="••••••••"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(event.target.value)
              }
              className="pl-10 h-12"
              disabled={loading}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>

          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              aria-hidden="true"
            />

            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              className="pl-10 h-12"
              disabled={loading}
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 font-medium"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Resetting...
            </>
          ) : (
            "Reset Password"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}