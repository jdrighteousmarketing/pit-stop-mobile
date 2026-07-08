import { restaurantConfig } from '@/config/restaurantConfig';
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCheck, AlertCircle, CheckCircle, Loader2, Lock } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { toast } from "sonner";

const RESTAURANT_ID = restaurantConfig.id;

export default function EmployeeSignup() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [message, setMessage] = useState("Checking your employee invite...");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const checkInvite = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session?.user) {
          setError("No active invite session found. Please use the link from your invitation email.");
          setLoading(false);
          return;
        }

        const user = session.user;
        const email = user.email?.toLowerCase();

        const { data: employeeRow, error: employeeError } = await supabase
          .from("employees")
          .select("*")
          .eq("restaurant_id", RESTAURANT_ID)
          .eq("email", email)
          .single();

        if (employeeError || !employeeRow) {
          await supabase.auth.signOut();
          throw new Error("This email does not have an employee invitation.");
        }

        if (!employeeRow.is_active) {
          await supabase.auth.signOut();
          throw new Error("This employee account is not active.");
        }

        setEmployee(employeeRow);
        setMessage("Create your employee password.");
      } catch (err) {
        console.error(err);
        setError(err.message || "Could not verify employee invite.");
      } finally {
        setLoading(false);
      }
    };

    checkInvite();
  }, []);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Please enter and confirm your password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;

      if (!user?.id) {
        throw new Error("Invite session expired. Please use the invite link again.");
      }

      const { error: passwordError } = await supabase.auth.updateUser({
        password,
      });

      if (passwordError) throw passwordError;

      const { error: updateError } = await supabase
        .from("employees")
        .update({
          auth_user_id: user.id,
          status: "active",
        })
        .eq("id", employee.id);

      if (updateError) throw updateError;

      await supabase.auth.signOut();

      setSuccess(true);
      toast.success("Employee password created!");

      setTimeout(() => {
        window.location.href = "/employee-login";
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not create employee password.");
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <AuthLayout icon={CheckCircle} title="Employee Account Ready" subtitle="You can now sign in">
        <div className="text-center p-6">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Redirecting to Employee Login...</p>
          <Button onClick={() => (window.location.href = "/employee-login")} className="w-full">
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
        <span className="text-sm text-muted-foreground">
          Already activated?{" "}
          <Link to="/employee-login" className="text-primary font-medium hover:underline">
            Employee Login
          </Link>
        </span>
      }
    >
      {loading && (
        <div className="text-center p-6">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">{message}</p>
        </div>
      )}

      {!loading && error && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
          <Button onClick={() => (window.location.href = "/employee-login")} className="w-full">
            Go to Employee Login
          </Button>
        </div>
      )}

      {!loading && !error && (
        <form onSubmit={handleSetPassword} className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
            <AlertCircle className="w-3 h-3 inline mr-1" />
            Set your password to finish activating your employee account.
          </div>

          <div className="space-y-2">
            <Label>Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Create password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-12" disabled={saving}>
            {saving ? "Saving Password..." : "Create Employee Password"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}