/**
 * NavigationGuardContext — Centralized Unsaved Changes Protection
 * Intercepts view navigation when settings or forms have unsaved modifications.
 */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export interface NavigationGuard {
  id: string;
  isDirty: boolean;
  save: () => Promise<boolean | void>;
  discard: () => void;
  description: string;
}

interface NavigationGuardContextType {
  registerGuard: (guard: NavigationGuard) => void;
  unregisterGuard: (id: string) => void;
  confirmNavigation: (action: () => void) => boolean;
  isModalOpen: boolean;
  activeGuard: NavigationGuard | null;
  saveAndProceed: () => Promise<void>;
  discardAndProceed: () => void;
  cancelNavigation: () => void;
  isSaving: boolean;
}

export const NavigationGuardContext = createContext<NavigationGuardContextType | undefined>(undefined);

export const NavigationGuardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const guardsRef = useRef<Map<string, NavigationGuard>>(new Map());
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [activeGuard, setActiveGuard] = useState<NavigationGuard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const registerGuard = useCallback((guard: NavigationGuard) => {
    guardsRef.current.set(guard.id, guard);
  }, []);

  const unregisterGuard = useCallback((id: string) => {
    guardsRef.current.delete(id);
  }, []);

  const confirmNavigation = useCallback((action: () => void): boolean => {
    // Find any registered guard with isDirty === true
    for (const guard of guardsRef.current.values()) {
      if (guard.isDirty) {
        setActiveGuard(guard);
        setPendingAction(() => action);
        setIsModalOpen(true);
        return false; // Navigation blocked
      }
    }

    // No dirty guards, proceed directly
    action();
    return true;
  }, []);

  const saveAndProceed = useCallback(async () => {
    if (!activeGuard) return;
    setIsSaving(true);
    try {
      await activeGuard.save();
      setIsSaving(false);
      setIsModalOpen(false);
      const actionToRun = pendingAction;
      setPendingAction(null);
      setActiveGuard(null);
      if (actionToRun) {
        actionToRun();
      }
    } catch (err) {
      setIsSaving(false);
      console.error('Failed to save before navigation:', err);
    }
  }, [activeGuard, pendingAction]);

  const discardAndProceed = useCallback(() => {
    if (!activeGuard) return;
    activeGuard.discard();
    setIsModalOpen(false);
    const actionToRun = pendingAction;
    setPendingAction(null);
    setActiveGuard(null);
    if (actionToRun) {
      actionToRun();
    }
  }, [activeGuard, pendingAction]);

  const cancelNavigation = useCallback(() => {
    setIsModalOpen(false);
    setPendingAction(null);
    setActiveGuard(null);
  }, []);

  return (
    <NavigationGuardContext.Provider
      value={{
        registerGuard,
        unregisterGuard,
        confirmNavigation,
        isModalOpen,
        activeGuard,
        saveAndProceed,
        discardAndProceed,
        cancelNavigation,
        isSaving,
      }}
    >
      {children}
    </NavigationGuardContext.Provider>
  );
};

const defaultNavigationGuardContext: NavigationGuardContextType = {
  registerGuard: () => {},
  unregisterGuard: () => {},
  confirmNavigation: (action: () => void) => {
    action();
    return true;
  },
  isModalOpen: false,
  activeGuard: null,
  saveAndProceed: async () => {},
  discardAndProceed: () => {},
  cancelNavigation: () => {},
  isSaving: false,
};

export const useNavigationGuard = () => {
  const context = useContext(NavigationGuardContext);
  return context || defaultNavigationGuardContext;
};
