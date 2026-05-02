"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import { LogIn } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const router = useRouter();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/auth/google", { token: credentialResponse.credential });
      setAuth(response.data.user, response.data.token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Google authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/login", { email, password });
      setAuth(response.data.user, response.data.token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="w-full max-w-sm p-8 bg-background border-sharp shadow-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-10 h-10 bg-primary text-white flex items-center justify-center rounded mb-4">
            <LogIn size={20} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sign In</h1>
          <p className="text-sm text-mutedForeground mt-1">Access your workspace</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border-sharp rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm"
              required
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-foreground">Password</label>
              <button 
                type="button" 
                onClick={() => router.push("/forgot-password")}
                className="text-xs text-primary hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border-sharp rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white p-2 rounded text-sm font-medium hover:bg-primaryHover disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
          
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-sharp"></div>
            <span className="flex-shrink-0 mx-4 text-xs text-mutedForeground">OR</span>
            <div className="flex-grow border-t border-sharp"></div>
          </div>
          
          <div className="flex justify-center w-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google login failed")}
              useOneTap
            />
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-mutedForeground">
            Don't have an account?{" "}
            <button onClick={() => router.push("/register")} className="text-primary hover:underline font-medium">
              Register
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
