import React, { useState } from 'react';
import { useLAD } from '../context/LADContext';
import { useNavigationGuard } from '../context/NavigationGuardContext';
import { SpaceSettingsView } from './SpaceSettingsView';
import { GlobalSettingsView } from './GlobalSettingsView';

export interface SettingsViewProps {
  initialTab?: 'space' | 'global';
}

export const SettingsView: React.FC<SettingsViewProps> = ({ initialTab = 'space' }) => {
  const { activeManifest } = useLAD();
  const { confirmNavigation } = useNavigationGuard();
  const [activeTab, setActiveTab] = useState<'space' | 'global'>(() => {
    return activeManifest ? initialTab : 'global';
  });

  const handleSwitchTab = (tab: 'space' | 'global') => {
    confirmNavigation(() => setActiveTab(tab));
  };

  return (
    <div>
      {activeTab === 'space' && activeManifest ? (
        <SpaceSettingsView onSwitchToGlobal={() => handleSwitchTab('global')} />
      ) : (
        <GlobalSettingsView onSwitchToSpace={() => handleSwitchTab('space')} />
      )}
    </div>
  );
};
