"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import { Lock, ArrowLeft } from "lucide-react";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token");
    }
  }, [token]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await api.post("/auth/reset-password", { token, newPassword });
      setMessage(response.data.message);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="w-full max-w-sm p-8 bg-background border-sharp shadow-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-10 h-10 bg-primary text-white flex items-center justify-center rounded mb-4">
            <Lock size={20} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reset Password</h1>
          <p className="text-sm text-mutedForeground mt-1 text-center">
            Enter your new password below
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded text-sm mb-4">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 text-green-600 border border-green-200 p-3 rounded text-sm mb-4">
            {message}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2 border-sharp rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm"
              required
              disabled={!token || !!message}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !token || !!message}
            className="w-full bg-primary text-white p-2 rounded text-sm font-medium hover:bg-primaryHover disabled:opacity-50 transition-colors"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => router.push("/login")} 
            className="text-sm text-mutedForeground hover:text-foreground flex items-center justify-center w-full transition-colors"
          >
            <ArrowLeft size={14} className="mr-1" /> Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
