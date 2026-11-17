import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-18 md:bottom-4 left-4 right-4 sm:right-auto z-40 flex items-center gap-2 bg-[#111622] border border-amber-500/45 px-3.5 py-2 text-xs font-medium text-amber-200 shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>Mode hors ligne — recherche locale active sur vos documents</span>
    </div>
  );
};
