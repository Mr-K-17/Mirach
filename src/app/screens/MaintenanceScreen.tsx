import React from "react";
import { Wrench } from "lucide-react";

export const MaintenanceScreen: React.FC = () => {
  return (
    <div
      role="region"
      aria-label="Maintenance notice"
      className="min-h-screen bg-bg text-text flex items-center justify-center p-4"
    >
      <div className="max-w-md w-full bg-surface border border-borderStrong/40 rounded-card p-6 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 text-accent mb-1">
          <Wrench className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-text">
          Scheduled Maintenance
        </h1>
        <p className="text-sm text-textMuted leading-relaxed">
          Mirach is currently undergoing a scheduled system update. Service will resume shortly.
        </p>
      </div>
    </div>
  );
};
