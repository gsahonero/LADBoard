import { useState, useEffect } from 'react';
import { PresenceManager } from './presence-manager';
import { UserPresence } from './presence-types';

export function usePresence(
  spaceId: string | null | undefined,
  currentUser: { userId: string; displayName: string; email?: string } | null,
  presenceEnabled: boolean = true
) {
  const [presences, setPresences] = useState<UserPresence[]>([]);

  useEffect(() => {
    const manager = PresenceManager.getInstance();

    if (!spaceId || !currentUser) {
      manager.stop();
      setPresences([]);
      return;
    }

    manager.start(spaceId, currentUser, presenceEnabled);

    const unsubscribe = manager.subscribe((peers) => {
      setPresences(peers);
    });

    return () => {
      unsubscribe();
    };
  }, [spaceId, currentUser?.userId, currentUser?.displayName, currentUser?.email, presenceEnabled]);

  const setActiveCard = (cardId?: string) => {
    PresenceManager.getInstance().setActiveCard(cardId);
  };

  return {
    presences,
    setActiveCard,
    manager: PresenceManager.getInstance(),
  };
}
