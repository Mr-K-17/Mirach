import React, { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-900/90 text-amber-100 border-b border-amber-700 px-4 py-2 text-sm flex items-center justify-center gap-2 transition-all"
    >
      <WifiOff className="w-4 h-4 text-amber-300 shrink-0" aria-hidden="true" />
      <span>
        You are offline. Reconnecting automatically when your network is restored.
      </span>
    </div>
  );
};
