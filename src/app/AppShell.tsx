import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { MessageSquare, Users, Bell, User, ShieldCheck } from "lucide-react";
import { OfflineBanner } from "./screens/OfflineBanner";

export const AppShell: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { to: "/app/chats", label: "Chats", icon: MessageSquare },
    { to: "/app/people", label: "People", icon: Users },
    { to: "/app/notifications", label: "Notifications", icon: Bell },
    { to: "/app/me", label: "Me", icon: User },
  ];

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col antialiased">
      {/* Skip to Content Link (Accessibility WCAG 2.2 AA) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent focus:text-white focus:rounded-control focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 text-sm font-medium"
      >
        Skip to main content
      </a>

      {/* Offline Status Banner */}
      <OfflineBanner />

      {/* Top Header */}
      <header className="h-14 border-b border-border bg-surface px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm tracking-tight">
            M
          </div>
          <span className="font-semibold text-base tracking-tight text-text">
            Mirach
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin link stub if on desktop */}
          <NavLink
            to="/admin/overview"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-control text-xs font-medium text-textMuted hover:text-text hover:bg-bg transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-accent" aria-hidden="true" />
            <span>Admin</span>
          </NavLink>
        </div>
      </header>

      {/* Body Layout: Responsive Navigation Rail + Main Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop & Tablet Navigation Rail (Hidden on mobile < 640px) */}
        <nav
          aria-label="Main Navigation"
          className="hidden sm:flex flex-col w-16 lg:w-56 border-r border-border bg-surface shrink-0 py-3"
        >
          <div className="space-y-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-control text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent/10 text-accent font-semibold"
                      : "text-textMuted hover:text-text hover:bg-bg"
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span className="hidden lg:inline">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Main Content Area */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto focus:outline-none p-4 sm:p-6 lg:p-8"
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (Visible only on < 640px) */}
      <nav
        aria-label="Mobile Navigation"
        className="sm:hidden border-t border-border bg-surface h-16 flex items-center justify-around px-2 shrink-0 pb-[env(safe-area-inset-bottom)] z-20"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] min-w-[44px] text-xs font-medium transition-colors ${
                isActive ? "text-accent" : "text-textMuted hover:text-text"
              }`}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
