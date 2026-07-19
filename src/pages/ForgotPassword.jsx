// @ts-nocheck

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail,
  ArrowLeft,
  Loader2,
  CheckCircle,
} from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const cleanEmail = String(email || "")
        .trim()
        .toLowerCase();

      const redirectTo = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo,
        }
      );

      if (error) {
        console.error("Password reset request failed:", error);
      }
    } catch (error) {
      console.error("Password reset request failed:", error);
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <AuthLayout
      icon={Mail}
      title="Reset Password"
      subtitle="We'll send you a link to reset it"
      footer={
        <div className="flex flex-col gap-3 text-center">
          <Link
            to="/login"
            className="text-primary font-medium hover:underline"
          >
            <ArrowLeft className="w-3 h-3 inline mr-1" />
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
      }
    >
      {sent ? (
        <div className="space-y-4 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />

          <div>
            <p className="font-semibold text-foreground">
              Check your email
            </p>

            <p className="text-sm text-muted-foreground mt-2">
              If an account exists with that email address, you will
              receive a password reset link shortly.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
          >
            Send Another Link
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>

            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
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
                Sending...
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}