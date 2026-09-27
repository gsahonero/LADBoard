import React from 'react';
import { UserPresence } from '../../core/presence/presence-types';
import { AccessibleTooltip } from './AccessibleTooltip';
import { Radio } from 'lucide-react';

interface PresenceAvatarsProps {
  presences: UserPresence[];
  className?: string;
  maxVisible?: number;
}

export const PresenceAvatars: React.FC<PresenceAvatarsProps> = ({
  presences,
  className = '',
  maxVisible = 3,
}) => {
  if (!presences || presences.length === 0) {
    return null;
  }

  const visiblePeers = presences.slice(0, maxVisible);
  const extraCount = presences.length - maxVisible;

  const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div
      className={`inline-flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700/80 shadow-2xs backdrop-blur-xs ${className}`}
      data-testid="presence-avatars-container"
      aria-label="Active collaborators in this space"
    >
      <Radio className="w-3 h-3 text-emerald-500 animate-pulse shrink-0 ml-0.5" />
      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mr-1 hidden sm:inline">
        {presences.length === 1 ? '1 online' : `${presences.length} online`}
      </span>

      <div className="flex items-center -space-x-1.5 overflow-hidden">
        {visiblePeers.map((peer) => {
          const tooltipContent = (
            <div className="text-left space-y-0.5">
              <div className="font-bold text-xs">{peer.displayName}</div>
              {peer.email && <div className="text-[10px] text-slate-400">{peer.email}</div>}
              <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {peer.status === 'idle' ? 'Idle' : 'Active in space'}
              </div>
              {peer.activeCardId && (
                <div className="text-[9px] text-slate-300 font-mono mt-0.5">
                  Viewing card #{peer.activeCardId.slice(-6)}
                </div>
              )}
            </div>
          );

          return (
            <AccessibleTooltip key={peer.tabId} content={tooltipContent} position="bottom">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white dark:border-slate-800 shadow-xs cursor-pointer select-none transition-transform hover:scale-110 hover:z-10"
                style={{ backgroundColor: peer.color || '#3b82f6' }}
                aria-label={`Collaborator ${peer.displayName} is active`}
              >
                {getInitials(peer.displayName)}
              </div>
            </AccessibleTooltip>
          );
        })}

        {extraCount > 0 && (
          <AccessibleTooltip
            content={
              <div className="text-left text-xs font-semibold">
                +{extraCount} more collaborator{extraCount > 1 ? 's' : ''} online
              </div>
            }
            position="bottom"
          >
            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-xs cursor-pointer select-none">
              +{extraCount}
            </div>
          </AccessibleTooltip>
        )}
      </div>
    </div>
  );
};
