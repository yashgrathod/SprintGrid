"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { GoogleOAuthProvider } from '@react-oauth/google';

export function Providers({ children }: { children: React.ReactNode }) {
  const initAuth = useAuthStore((state) => state.initAuth);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "your_google_client_id_here"}>
      {!isHydrated ? null : children}
    </GoogleOAuthProvider>
  );
}
