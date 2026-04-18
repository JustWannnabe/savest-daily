import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar, BottomNav } from "./Sidebar";
import { Header } from "./Header";
import { useSeedData } from "@/hooks/useSeedData";

const SeedRunner = () => { useSeedData(); return null; };

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="text-muted-foreground text-sm animate-pulse">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;

  return (
    <div className="min-h-screen w-full bg-background">
      <SeedRunner />
      <Sidebar />
      <div className="md:pl-60">
        <Header />
        <main className="px-4 md:px-8 py-6 pb-24 md:pb-12 max-w-6xl mx-auto animate-fade-in-up" key={location.pathname}>
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
};
