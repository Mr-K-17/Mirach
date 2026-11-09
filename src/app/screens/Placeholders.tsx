import React from "react";
import { MessageSquare } from "lucide-react";

export const ChatsPlaceholder: React.FC = () => (
  <div className="max-w-4xl mx-auto space-y-4">
    <h1 className="text-2xl font-bold tracking-tight text-text">Chats</h1>
    <div className="bg-surface border border-border rounded-card p-8 text-center space-y-3">
      <div className="w-12 h-12 rounded-full bg-accent/10 text-accent mx-auto flex items-center justify-center">
        <MessageSquare className="w-6 h-6" aria-hidden="true" />
      </div>
      <h2 className="text-base font-semibold text-text">No active conversations</h2>
      <p className="text-sm text-textMuted max-w-sm mx-auto">
        Messaging foundation will be implemented in Phase 5. Connect with other members in People to start chatting.
      </p>
    </div>
  </div>
);

export const PeoplePlaceholder: React.FC = () => (
  <div className="max-w-4xl mx-auto space-y-4">
    <h1 className="text-2xl font-bold tracking-tight text-text">People</h1>
    <div className="bg-surface border border-border rounded-card p-8 text-center space-y-3">
      <h2 className="text-base font-semibold text-text">Member Directory & Connections</h2>
      <p className="text-sm text-textMuted max-w-sm mx-auto">
        Member profiles, discovery, and connection requests will be implemented in Phase 4.
      </p>
    </div>
  </div>
);

export const NotificationsPlaceholder: React.FC = () => (
  <div className="max-w-4xl mx-auto space-y-4">
    <h1 className="text-2xl font-bold tracking-tight text-text">Notifications</h1>
    <div className="bg-surface border border-border rounded-card p-8 text-center space-y-3">
      <h2 className="text-base font-semibold text-text">Notification Centre</h2>
      <p className="text-sm text-textMuted max-w-sm mx-auto">
        In-app notification centre will be connected in Phase 4, followed by Web Push in Phase 7.
      </p>
    </div>
  </div>
);

export const MePlaceholder: React.FC = () => (
  <div className="max-w-4xl mx-auto space-y-4">
    <h1 className="text-2xl font-bold tracking-tight text-text">Me (Profile & Settings)</h1>
    <div className="bg-surface border border-border rounded-card p-8 text-center space-y-3">
      <h2 className="text-base font-semibold text-text">Account & Privacy</h2>
      <p className="text-sm text-textMuted max-w-sm mx-auto">
        Profile customization, privacy controls, session management, and manual export tools will be added in Phases 4 and 11.
      </p>
    </div>
  </div>
);

export const AdminPlaceholder: React.FC = () => (
  <div className="max-w-4xl mx-auto space-y-4">
    <h1 className="text-2xl font-bold tracking-tight text-text">Administrative Overview</h1>
    <div className="bg-surface border border-border rounded-card p-8 text-center space-y-3">
      <h2 className="text-base font-semibold text-text">Admin & Moderator Console</h2>
      <p className="text-sm text-textMuted max-w-sm mx-auto">
        Invitation management, membership approvals, audit logs, and quota monitoring panels will be added in Phase 3.
      </p>
    </div>
  </div>
);

export const JoinPlaceholder: React.FC = () => (
  <div className="max-w-md mx-auto p-6 bg-surface border border-border rounded-card text-center space-y-3 my-12">
    <h1 className="text-xl font-bold text-text">Registration & Invitation</h1>
    <p className="text-sm text-textMuted">
      Profile setup and invitation redemption (S2) will be implemented in Phase 3.
    </p>
  </div>
);

export const PendingPlaceholder: React.FC = () => (
  <div className="max-w-md mx-auto p-6 bg-surface border border-border rounded-card text-center space-y-3 my-12">
    <h1 className="text-xl font-bold text-text">Application Pending</h1>
    <p className="text-sm text-textMuted">
      Your membership request is currently awaiting administrator review.
    </p>
  </div>
);

export const RejectedPlaceholder: React.FC = () => (
  <div className="max-w-md mx-auto p-6 bg-surface border border-border rounded-card text-center space-y-3 my-12">
    <h1 className="text-xl font-bold text-text">Application Notice</h1>
    <p className="text-sm text-textMuted">
      This registration request could not be accepted at this time.
    </p>
  </div>
);

export const NotFoundScreen: React.FC = () => (
  <div className="min-h-screen bg-bg text-text flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-surface border border-border rounded-card p-8 text-center space-y-4">
      <h1 className="text-2xl font-bold text-text">Page Not Found</h1>
      <p className="text-sm text-textMuted">
        The requested screen does not exist or you do not have permission to access it.
      </p>
      <a
        href="/"
        className="inline-flex items-center justify-center px-4 py-2 min-h-[44px] min-w-[44px] rounded-control bg-accent text-white font-medium text-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-accent"
      >
        Return to Home
      </a>
    </div>
  </div>
);
