/**
 * Storelistener — Owner Dashboard Root Component (Module 1 Foundation)
 * File: src/components/dashboard/OwnerDashboard.jsx
 */

import { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import DashboardOverview from './DashboardOverview';
import NavigationPlaceholder from './NavigationPlaceholder';

import LiveMonitoringPage from '../monitoring/LiveMonitoringPage';

const SECTION_TITLES = {
  dashboard: 'Store Overview',
  'live-monitoring': 'Live Monitoring',
  conversations: 'Conversations',
  stores: 'Stores',
  reports: 'Reports',
  settings: 'Settings',
};

export default function OwnerDashboard({ onLogout }) {
  const [activeNav, setActiveNav] = useState('dashboard');

  const handleNavigate = (navId) => {
    setActiveNav(navId);
  };

  const currentSection = SECTION_TITLES[activeNav] || 'Store Overview';

  return (
    <DashboardLayout
      activeNav={activeNav}
      onNavigate={handleNavigate}
      currentSection={currentSection}
      onLogout={onLogout}
    >
      {activeNav === 'dashboard' ? (
        <DashboardOverview onNavigate={handleNavigate} />
      ) : activeNav === 'live-monitoring' ? (
        <LiveMonitoringPage onNavigate={handleNavigate} />
      ) : (
        <NavigationPlaceholder
          sectionId={activeNav}
          onBackToDashboard={() => setActiveNav('dashboard')}
        />
      )}
    </DashboardLayout>
  );
}
