"use client";

import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { LogOut, Grid } from "lucide-react";

export function Navbar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav className="border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <div className="flex items-center cursor-pointer" onClick={() => router.push("/dashboard")}>
            <Grid className="h-5 w-5 text-primary mr-2" />
            <span className="font-semibold text-foreground tracking-tight">SprintGrid</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {user && (
              <>
                <span className="text-sm font-medium text-mutedForeground">
                  {user.name} <span className="text-xs bg-muted px-2 py-0.5 rounded border-sharp ml-2 uppercase">{user.systemRole || user.role}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-mutedForeground hover:text-foreground hover:bg-muted rounded transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
