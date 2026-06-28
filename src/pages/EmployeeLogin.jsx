import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Loader2, UserCheck } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

const RESTAURANT_ID = "pit_stop_mobile";

export default function EmployeeLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (signInError) {
        throw signInError;
      }

      const authUserId = signInData?.user?.id;

      if (!authUserId) {
        throw new Error("Could not find employee auth user.");
      }

      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("*")
        .eq("restaurant_id", RESTAURANT_ID)
        .eq("auth_user_id", authUserId)
        .eq("is_active", true)
        .maybeSingle();

      if (employeeError || !employee) {
        await supabase.auth.signOut();
        setError("Access denied. This login is for employees only.");
        setLoading(false);
        return;
      }

      if (String(employee.role || "").toLowerCase() !== "employee") {
        await supabase.auth.signOut();
        setError("Access denied. This login is for employees only.");
        setLoading(false);
        return;
      }

      await supabase
        .from("employees")
        .update({
          status: "active",
        })
        .eq("id", employee.id);

      sessionStorage.removeItem("adminAccessGranted");

      window.location.replace("/admin/employee-dashboard");
    } catch (err) {
      console.error("Employee login failed:", err);
      setError(err.message || "Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={UserCheck}
      title="Employee Login"
      subtitle="Staff access only"
      footer={
        <>
          <div className="flex flex-col gap-2 text-center">
            <span className="text-sm text-muted-foreground">
              First time?{" "}
              <Link
                to="/employee-signup"
                className="text-primary font-medium hover:underline"
              >
                Employee Sign Up
              </Link>
            </span>
          </div>
        </>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="employee@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
              autoFocus
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
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            "Employee Sign In"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
