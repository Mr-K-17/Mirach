import React, { useState } from "react";
import { Shield, Mail, Lock, LogIn, UserPlus } from "lucide-react";

export const WelcomeScreen: React.FC = () => {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // UX stub for Phase 1. Real authentication flow connects in Phase 3.
  };

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <header className="max-w-4xl mx-auto w-full py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm">
            M
          </div>
          <span className="font-semibold text-lg tracking-tight">Mirach</span>
        </div>
      </header>

      {/* Main Container */}
      <main id="main-content" className="max-w-md mx-auto w-full my-auto py-8">
        <div className="bg-surface border border-borderStrong/30 rounded-card p-6 sm:p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-text">
              Welcome to Mirach
            </h1>
            <p className="text-sm text-textMuted leading-relaxed">
              A private, invitation-only community for trusted connections, messaging, and group conversations.
            </p>
          </div>

          {/* Google Sign-In Stub */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 min-h-[44px] min-w-[44px] rounded-control border border-borderStrong bg-bg hover:bg-surface text-text font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            onClick={() => {}}
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-border w-full" aria-hidden="true" />
            <span className="bg-surface px-3 text-xs uppercase tracking-wider text-textMuted font-medium">
              or
            </span>
          </div>

          {/* Email Tabs */}
          <div className="flex border-b border-border" role="tablist" aria-label="Sign in methods">
            <button
              role="tab"
              aria-selected={tab === "signin"}
              className={`flex-1 py-2 text-sm font-medium border-b-2 min-h-[44px] transition-colors ${
                tab === "signin"
                  ? "border-accent text-accent"
                  : "border-transparent text-textMuted hover:text-text"
              }`}
              onClick={() => setTab("signin")}
            >
              Sign In
            </button>
            <button
              role="tab"
              aria-selected={tab === "signup"}
              className={`flex-1 py-2 text-sm font-medium border-b-2 min-h-[44px] transition-colors ${
                tab === "signup"
                  ? "border-accent text-accent"
                  : "border-transparent text-textMuted hover:text-text"
              }`}
              onClick={() => setTab("signup")}
            >
              Create Account
            </button>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-textMuted mb-1">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-textMuted">
                  <Mail className="w-4 h-4" aria-hidden="true" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 min-h-[44px] text-sm rounded-control border border-borderStrong bg-bg text-text focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-textMuted mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-textMuted">
                  <Lock className="w-4 h-4" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete={tab === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 10 characters"
                  className="w-full pl-9 pr-3 py-2 min-h-[44px] text-sm rounded-control border border-borderStrong bg-bg text-text focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-control bg-accent text-white font-medium text-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-all"
            >
              {tab === "signin" ? (
                <>
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                  <span>Sign In</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" aria-hidden="true" />
                  <span>Continue to Registration</span>
                </>
              )}
            </button>
          </form>

          {/* Mandatory Security & Privacy Disclosure */}
          <div className="pt-2 border-t border-border text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs text-textMuted">
              <Shield className="w-3.5 h-3.5 text-textMuted shrink-0" aria-hidden="true" />
              <span>Private community. Not end-to-end encrypted.</span>
            </div>
            <p className="text-[11px] text-textMuted">
              Registration requires an invitation code or administrative review. Members must be 18+.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full py-4 text-center text-xs text-textMuted space-x-4">
        <span>Mirach Platform</span>
        <span>•</span>
        <span>Zero-Cost Serverless</span>
      </footer>
    </div>
  );
};
