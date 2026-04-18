import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, ArrowLeftRight, Bell, BarChart3, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveAlerts } from "@/hooks/useAlerts";

export const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/grow", label: "Grow", icon: TrendingUp },
  { to: "/mentor", label: "AI Mentor", icon: Sparkles },
];

export const Sidebar = () => {
  const alerts = useActiveAlerts();
  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-60 flex-col border-r border-border bg-sidebar z-30">
      <div className="px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-foreground to-foreground/60 grid place-items-center">
            <span className="text-background font-display font-bold text-sm">M</span>
          </div>
          <span className="font-display font-bold text-lg tracking-tight">MoneyFlow</span>
        </div>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const showBadge = item.to === "/alerts" && alerts.length > 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  "hover:bg-sidebar-accent",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground"
                )
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
              {showBadge && (
                <span className="ml-auto h-5 min-w-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold grid place-items-center">
                  {alerts.length}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
      <div className="px-6 py-4 text-xs text-muted-foreground">v1 · Hackathon build</div>
    </aside>
  );
};

export const BottomNav = () => {
  const location = useLocation();
  const alerts = useActiveAlerts();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 border-t border-border bg-background/95 backdrop-blur-md z-30">
      <div className="grid grid-cols-6 h-full">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to;
          const showBadge = item.to === "/alerts" && alerts.length > 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 transition-colors",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <Icon className="h-[20px] w-[20px]" />
                {showBadge && (
                  <span className="absolute -top-1 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-semibold grid place-items-center">
                    {alerts.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label.split(" ")[0]}</span>
              {active && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" />}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
