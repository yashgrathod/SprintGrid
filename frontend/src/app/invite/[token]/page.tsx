"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";

export default function InvitePage() {
  const { token } = useParams() as { token: string };
  const router = useRouter();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    // If not logged in, redirect to login with a returnUrl? 
    // Or let them see the invite and redirect on accept?
    // Let's redirect to login if not logged in. Wait, the user can see the invite
    // then sign in. If we redirect, we need to pass a redirect query param, but let's just 
    // ensure they are logged in.
    if (!userId) {
      router.push(`/login`);
      return;
    }

    const fetchInvite = async () => {
      try {
        const res = await api.get(`/projects/invites/${token}`);
        setInvite(res.data);
      } catch (err: any) {
        setError(err.response?.data?.error || "Invalid or expired invite.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [token, userId, router]);

  const handleAccept = async () => {
    setAccepting(true);
    setError("");
    try {
      const res = await api.post(`/projects/invites/${token}/accept`);
      router.push(`/projects/${res.data.projectId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to accept invite.");
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <p className="text-mutedForeground text-sm font-medium">Loading invite...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-background border-sharp p-8 shadow-sm text-center">
        {error && !invite ? (
          <div>
            <h1 className="text-xl font-semibold text-foreground mb-4">Invite Error</h1>
            <p className="text-red-500 text-sm mb-6">{error}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-primary text-white px-4 py-2 rounded text-sm font-medium hover:bg-primaryHover"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">Project Invitation</h1>
            <p className="text-mutedForeground mb-8">
              You have been invited to join <span className="font-semibold text-foreground">{invite?.project?.title}</span> as a <span className="font-semibold text-foreground">{invite?.invite?.role}</span>.
            </p>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full bg-foreground text-background py-2.5 rounded text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {accepting ? "Accepting..." : "Accept Invite"}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 w-full border border-border text-foreground py-2.5 rounded text-sm font-medium hover:bg-muted transition-colors"
            >
              Decline / Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
