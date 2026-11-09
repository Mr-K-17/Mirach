import React from "react";
import { Clock, ShieldAlert } from "lucide-react";

export const QuotaScreen: React.FC = () => {
  return (
    <div
      role="region"
      aria-label="Daily limit reached notice"
      className="min-h-screen bg-bg text-text flex items-center justify-center p-4"
    >
      <div className="max-w-md w-full bg-surface border border-warning/40 rounded-card p-6 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-warning/10 text-warning mb-1">
          <ShieldAlert className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-text">
          Today's Community Limit Reached
        </h1>
        <p className="text-sm text-textMuted leading-relaxed">
          Mirach operates within a zero-cost serverless capacity budget. The community daily message limit has been reached for today.
        </p>
        <div className="bg-bg/60 border border-border rounded-control p-3 text-xs text-textMuted flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 text-warning shrink-0" aria-hidden="true" />
          <span>Messaging will automatically resume after midnight UTC (00:00 UTC).</span>
        </div>
        <p className="text-xs text-textMuted">
          Existing conversations and confirmed messages remain safe and accessible.
        </p>
      </div>
    </div>
  );
};
