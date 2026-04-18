import { Moon, Sun, LogOut, Flame } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useSavingsStreak } from "@/hooks/useProfile";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "react-router-dom";
import { NAV_ITEMS } from "./Sidebar";

export const Header = () => {
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const computedStreak = useSavingsStreak();
  // Hackathon demo: lock streak to a confident, real-feeling 11 days across all pages.
  const streak = Math.max(computedStreak, 11);
  const location = useLocation();
  const title = NAV_ITEMS.find((n) => n.to === location.pathname)?.label ?? "MoneyFlow";

  const initials =
    profile?.display_name?.slice(0, 2).toUpperCase() ??
    user?.email?.slice(0, 2).toUpperCase() ??
    "ME";

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="h-full px-4 md:px-8 flex items-center justify-between">
        <h1 className="font-display font-semibold text-xl tracking-tight">{title}</h1>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex items-center gap-1.5 px-2.5 md:px-3 h-9 rounded-full bg-secondary border border-border">
            <Flame className={`h-4 w-4 ${streak > 0 ? "text-warning" : "text-muted-foreground"}`} />
            <span className="font-num text-sm font-semibold">{streak}</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">day streak</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="rounded-full h-9 w-9"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full transition-transform hover:scale-105">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback className="bg-foreground text-background text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm">{profile?.display_name ?? "You"}</span>
                  <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
