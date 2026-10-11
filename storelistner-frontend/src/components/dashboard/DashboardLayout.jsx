/**
 * Storelistener — Reusable Dashboard Layout Shell
 * File: src/components/dashboard/DashboardLayout.jsx
 */

import { useState } from 'react';
import { Box } from '@mui/material';
import DashboardSidebar from './DashboardSidebar';
import DashboardTopbar from './DashboardTopbar';

const DRAWER_WIDTH = 260;

export default function DashboardLayout({
  activeNav = 'dashboard',
  onNavigate,
  currentSection = 'Store Overview',
  onLogout,
  children,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar Shell */}
      <DashboardSidebar
        activeNav={activeNav}
        onNavigate={onNavigate}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        drawerWidth={DRAWER_WIDTH}
      />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0, // Prevents flex child from overflowing horizontally
          display: 'flex',
          flexDirection: 'column',
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        {/* Topbar */}
        <DashboardTopbar
          currentSection={currentSection}
          onToggleMobileSidebar={handleDrawerToggle}
          onLogout={onLogout}
        />

        {/* Page Content Container */}
        <Box sx={{ flex: 1, p: { xs: 2, sm: 3, md: 4 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
