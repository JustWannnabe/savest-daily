import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-background text-muted-foreground">Loading…</div>;
  }
  if (user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created — you're in!");
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background grid place-items-center px-4">
      <div className="absolute inset-0 -z-10 opacity-60 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] h-72 w-72 rounded-full blur-3xl bg-accent/20" />
        <div className="absolute bottom-[-10%] right-[-10%] h-80 w-80 rounded-full blur-3xl bg-foreground/10" />
      </div>

      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-foreground to-foreground/60 grid place-items-center">
              <span className="text-background font-display font-bold">M</span>
            </div>
            <span className="font-display font-bold text-2xl tracking-tight">MoneyFlow</span>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Money, simplified.</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Track every rupee. Build your savings streak.</p>
        </div>

        <div className="surface-md rounded-3xl p-6 border border-border">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-2 w-full mb-5 bg-secondary rounded-full h-10 p-1">
              <TabsTrigger value="login" className="rounded-full data-[state=active]:bg-card">Log in</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-card">Sign up</TabsTrigger>
            </TabsList>
            <form onSubmit={onSubmit} className="space-y-4">
              <TabsContent value="signup" className="space-y-4 mt-0">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aarav" className="rounded-xl h-11" />
                </div>
              </TabsContent>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@college.edu" className="rounded-xl h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" className="rounded-xl h-11" />
              </div>
              <Button type="submit" disabled={busy} className="w-full h-11 rounded-xl font-semibold">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {tab === "login" ? "Log in" : "Create account"}
              </Button>
            </form>
          </Tabs>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to MoneyFlow's terms.
        </p>
      </div>
    </div>
  );
}
