import React, { useState } from 'react';
import { useLAD } from '../context/LADContext';
import { SpaceSettingsView } from './SpaceSettingsView';
import { GlobalSettingsView } from './GlobalSettingsView';

export interface SettingsViewProps {
  initialTab?: 'space' | 'global';
}

export const SettingsView: React.FC<SettingsViewProps> = ({ initialTab = 'space' }) => {
  const { activeManifest } = useLAD();
  const [activeTab, setActiveTab] = useState<'space' | 'global'>(() => {
    return activeManifest ? initialTab : 'global';
  });

  return (
    <div>
      {activeTab === 'space' && activeManifest ? (
        <SpaceSettingsView onSwitchToGlobal={() => setActiveTab('global')} />
      ) : (
        <GlobalSettingsView onSwitchToSpace={() => setActiveTab('space')} />
      )}
    </div>
  );
};
