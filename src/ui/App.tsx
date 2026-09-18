/**
 * Main Application Component for LAD Board (v0.1.0)
 * Featuring Cognitive Hub Landing, Topic Dashboards, and Visual Capture
 */

import React, { useState, useEffect } from 'react';
import { LADProvider, useLAD } from './context/LADContext';
import { I18nProvider } from '../core/i18n/i18n-context';
import { Header } from './components/Header';
import { Navigation, ActiveTab } from './components/Navigation';
import { CaptureModal } from './components/CaptureModal';
import { SpaceManagerModal } from './components/SpaceManagerModal';
import { JoinSpaceModal } from './components/JoinSpaceModal';
import { ConflictSolverModal } from './components/ConflictSolverModal';
import { WelcomeTourModal } from './components/WelcomeTourModal';
import { OnboardingView } from './views/OnboardingView';
import { HubLandingView } from './views/HubLandingView';
import { TopicDashboardView } from './views/TopicDashboardView';
import { LivingBoardView } from './views/LivingBoardView';
import { AttentionView } from './views/AttentionView';
import { TimeView } from './views/TimeView';
import { GraphView } from './views/GraphView';
import { PeopleView } from './views/PeopleView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';
import { CreateSpaceView } from './views/CreateSpaceView';
import { NavigationGuardProvider, useNavigationGuard } from './context/NavigationGuardContext';
import { UnsavedChangesModal } from './components/UnsavedChangesModal';
import { SyncFallbackBanner } from './components/SyncFallbackBanner';
import { LADLogo } from './components/LADLogo';

import { motion, AnimatePresence, Variants } from 'framer-motion';

const pageVariants: Variants = {
  initial: { opacity: 0, y: 10, filter: 'blur(3px)' },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.38,
      ease: [0.16, 1, 0.3, 1],
    },
    transitionEnd: {
      transform: 'none',
      filter: 'none',
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: 'blur(2px)',
    transition: {
      duration: 0.22,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const AppContent: React.FC = () => {
  const { activeAlerts, proposals, isLoading, userRegistry, pendingJoinSpaceId } = useLAD();
  const { confirmNavigation } = useNavigationGuard();
  const [activeTab, setActiveTab] = useState<ActiveTab>('hub');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('health');
  const [captureModalOpen, setCaptureModalOpen] = useState(false);
  const [captureDomain, setCaptureDomain] = useState<string | undefined>(undefined);
  const [spaceModalOpen, setSpaceModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [welcomeTourOpen, setWelcomeTourOpen] = useState(false);

  // Check if first-run onboarding is needed (bypass if joining an invited space)
  useEffect(() => {
    if (!isLoading && userRegistry) {
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const isJoining = Boolean(pendingJoinSpaceId || urlParams?.get('join'));

      if (isJoining) {
        setShowOnboarding(false);
        return;
      }

      const isCompleted = localStorage.getItem('lad_onboarded') === 'true';
      const hasCustomName =
        userRegistry.identities[0]?.display_name &&
        userRegistry.identities[0].display_name !== 'LAD User';
      if (!isCompleted && !hasCustomName) {
        setShowOnboarding(true);
      }
    }
  }, [isLoading, userRegistry, pendingJoinSpaceId]);

  // Check if modular welcome tour should open for first-time visitors
  useEffect(() => {
    if (!isLoading && !showOnboarding) {
      const tourCompleted = localStorage.getItem('lad_welcome_tour_completed');
      if (!tourCompleted) {
        const timer = setTimeout(() => {
          setWelcomeTourOpen(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, showOnboarding]);

  const attentionCount = activeAlerts.length + proposals.length;

  const handleOpenCapture = (domain?: string) => {
    setCaptureDomain(domain);
    setCaptureModalOpen(true);
  };

  const handleSelectTab = (tab: ActiveTab) => {
    confirmNavigation(() => setActiveTab(tab));
  };

  const handleSelectTopic = (topicId: string) => {
    confirmNavigation(() => {
      setSelectedTopicId(topicId);
      setActiveTab('topic');
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-3"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="flex items-center justify-center shadow-xl shadow-blue-500/20 rounded-2xl"
          >
            <LADLogo size={56} />
          </motion.div>
          <div className="text-xs font-bold text-slate-500 tracking-wide">Living Active Dynamic Board</div>
        </motion.div>
      </div>
    );
  }

  const currentKey = activeTab === 'topic' ? `topic_${selectedTopicId}` : activeTab;
  const isFullPageHub = activeTab === 'hub';

  if (showOnboarding) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="onboarding_view"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full min-h-screen"
        >
          <OnboardingView onComplete={() => setShowOnboarding(false)} />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden flex flex-col bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-500">
      {/* Global Ambient Background Atmosphere */}
      <div className="absolute inset-0 bg-mesh-pattern bg-radial-vignette pointer-events-none opacity-50 dark:opacity-30" />
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-teal-500/10 dark:bg-purple-600/10 blur-[130px] pointer-events-none" />

      {/* Cloud Sync Offline Fallback Notification Banner */}
      <SyncFallbackBanner />

      <AnimatePresence mode="wait">
        {activeTab === 'create_space' ? (
          <motion.div
            key="full_create_space"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full flex-1 relative z-10"
          >
            <CreateSpaceView
              onComplete={() => setActiveTab('board')}
              onCancel={() => confirmNavigation(() => setActiveTab('hub'))}
            />
          </motion.div>
        ) : isFullPageHub ? (
          <motion.div
            key="full_hub"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full flex-1 relative z-10"
          >
            <HubLandingView
              onOpenHomeDashboard={() => confirmNavigation(() => setActiveTab('board'))}
              onSelectTopic={handleSelectTopic}
              onOpenCapture={() => handleOpenCapture()}
              onOpenSpaceManager={() => setSpaceModalOpen(true)}
              onOpenCreateSpace={() => confirmNavigation(() => setActiveTab('create_space'))}
              onOpenSettings={() => confirmNavigation(() => setActiveTab('global_settings'))}
            />
          </motion.div>
        ) : (
          <motion.div
            key="workspace_cockpit"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full flex-1 flex flex-col min-h-screen"
          >
            {/* Space Cockpit Header */}
            <Header
              onOpenCapture={() => handleOpenCapture(activeTab === 'topic' ? selectedTopicId : undefined)}
              onOpenSpaceManager={() => setSpaceModalOpen(true)}
              onOpenCreateSpace={() => confirmNavigation(() => setActiveTab('create_space'))}
              onOpenSettings={() => confirmNavigation(() => setActiveTab('settings'))}
              onGoToHub={() => confirmNavigation(() => setActiveTab('hub'))}
              onOpenWelcomeTour={() => setWelcomeTourOpen(true)}
            />

            <div className="flex-1 flex max-w-7xl w-full mx-auto">
              {/* Responsive Navigation Sidebar */}
              <Navigation
                activeTab={activeTab}
                onSelectTab={handleSelectTab}
                attentionCount={attentionCount}
              />

              {/* Space Dashboard View Area */}
              <main className="flex-1 p-4 sm:p-6 pb-24 md:pb-6 max-w-5xl">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentKey}
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="w-full"
                  >
                    {activeTab === 'topic' && (
                      <TopicDashboardView
                        topicId={selectedTopicId}
                        onBackToHub={() => confirmNavigation(() => setActiveTab('hub'))}
                        onOpenCapture={(dom) => handleOpenCapture(dom || selectedTopicId)}
                      />
                    )}
                    {activeTab === 'board' && <LivingBoardView />}
                    {activeTab === 'attention' && <AttentionView />}
                    {activeTab === 'time' && <TimeView />}
                    {activeTab === 'graph' && <GraphView />}
                    {activeTab === 'people' && <PeopleView />}
                    {activeTab === 'history' && <HistoryView />}
                    {activeTab === 'settings' && <SettingsView initialTab="space" />}
                    {activeTab === 'global_settings' && <SettingsView initialTab="global" />}
                  </motion.div>
                </AnimatePresence>
              </main>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Add / Guided Capture Modal */}
      <CaptureModal
        isOpen={captureModalOpen}
        defaultDomain={captureDomain}
        onClose={() => {
          setCaptureModalOpen(false);
          setCaptureDomain(undefined);
        }}
      />

      {/* Space Switcher & Invites Modal */}
      <SpaceManagerModal
        isOpen={spaceModalOpen}
        onClose={() => setSpaceModalOpen(false)}
        onOpenCreateSpace={() => confirmNavigation(() => setActiveTab('create_space'))}
      />

      {/* Join Space Modal (opens when URL has ?join=spc_... or pending invite) */}
      <JoinSpaceModal />

      {/* Sync Conflict Solver Dialogue */}
      <ConflictSolverModal />

      {/* Modular JSON-Driven Welcome Tour */}
      <WelcomeTourModal
        isOpen={welcomeTourOpen}
        onClose={() => setWelcomeTourOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <I18nProvider>
      <LADProvider>
        <NavigationGuardProvider>
          <AppContent />
          <UnsavedChangesModal />
        </NavigationGuardProvider>
      </LADProvider>
    </I18nProvider>
  );
};

export default App;
