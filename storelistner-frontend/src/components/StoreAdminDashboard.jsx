import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Stack,
  Chip,
  Avatar,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  People as PeopleIcon,
  Sensors as SensorsIcon,
  BarChart as BarChartIcon,
  Mic as MicIcon,
  EmojiEvents as TrophyIcon,
  Forum as ForumIcon,
  HourglassEmpty as HourglassIcon,
  CheckCircle as CheckCircleIcon,
  AdminPanelSettings as AdminIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import Header from './Header';
import UserApprovals from './UserApprovals';
import AnalyticsKPIs from './AnalyticsKPIs';
import LiveMonitorWall from './LiveMonitorWall';
import LiveAudioRecorder from './LiveAudioRecorder';
import ConversationList from './ConversationList';
import RepLeaderboard from './RepLeaderboard';

const BACKEND_URL = 'http://localhost:5000';

export default function StoreAdminDashboard({ currentUser, token, onLogout }) {
  const [activeTab, setActiveTab] = useState(0); // 0 = Approvals, 1 = Monitor Wall, 2 = Analytics, 3 = Terminal Recorder, 4 = Conversations, 5 = Leaderboard
  const [selectedStore, setSelectedStore] = useState(currentUser?.storeCode || 'STORE-NYC-01');
  const [socketConnected, setSocketConnected] = useState(false);
  
  // Real-time counts & data
  const [pendingCount, setPendingCount] = useState(0);
  const [stats, setStats] = useState(null);
  const [toastNotification, setToastNotification] = useState(null);

  // Fetch pending count and general dashboard stats
  const fetchDashboardStats = async () => {
    try {
      const [pendingRes, statsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/auth/pending-sales-managers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BACKEND_URL}/api/analytics/stats?store=${selectedStore}`),
      ]);

      const pendingData = await pendingRes.json();
      if (pendingData.success) {
        setPendingCount(pendingData.count || (pendingData.users ? pendingData.users.length : 0));
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data || statsData);
      }
    } catch (err) {
      console.warn('Dashboard fetch warning:', err.message);
    }
  };

  useEffect(() => {
    fetchDashboardStats();

    // Socket.io for real-time notifications
    const socket = io(BACKEND_URL);
    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    socket.on('sales_manager_registered', (data) => {
      setToastNotification({
        type: 'info',
        title: 'New Sales Manager Registration',
        message: `${data.user.name} (${data.user.email}) registered and is awaiting your approval!`,
      });
      fetchDashboardStats();
    });

    socket.on('deal_closed_alert', (data) => {
      setToastNotification({
        type: 'success',
        title: '🎉 Deal Closed on Floor!',
        message: `${data.repName || 'Sales Specialist'} just closed ${data.model || 'iPhone'} at ${data.storeName || 'Counter'}!`,
      });
      fetchDashboardStats();
    });

    return () => {
      socket.disconnect();
    };
  }, [token, selectedStore]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', color: '#0f172a' }}>
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        onLogout={onLogout}
        selectedStore={selectedStore}
        onSelectStore={setSelectedStore}
        socketConnected={socketConnected}
        onRefresh={fetchDashboardStats}
        pendingCount={pendingCount}
      />

      {/* Main Container */}
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Navigation Tabs Bar */}
        <Card sx={{ mb: 3, bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            textColor="primary"
            indicatorColor="primary"
            sx={{ px: 2, minHeight: 56 }}
          >
            <Tab
              icon={<PeopleIcon />}
              iconPosition="start"
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <span>Manager Approvals</span>
                  {pendingCount > 0 && (
                    <Chip
                      label={pendingCount}
                      size="small"
                      sx={{
                        bgcolor: '#fef3c7',
                        color: '#b45309',
                        fontWeight: 800,
                        height: 20,
                        fontSize: '0.72rem',
                      }}
                    />
                  )}
                </Stack>
              }
            />
            <Tab icon={<SensorsIcon />} iconPosition="start" label="Live Store Monitor Wall" />
            <Tab icon={<BarChartIcon />} iconPosition="start" label="Executive KPIs & Analytics" />
            <Tab icon={<MicIcon />} iconPosition="start" label="Store Counter Terminal" />
            <Tab icon={<ForumIcon />} iconPosition="start" label="Conversation History" />
            <Tab icon={<TrophyIcon />} iconPosition="start" label="Sales Leaderboard" />
          </Tabs>
        </Card>

        {/* TAB 0: STAFF & SALES MANAGER APPROVALS */}
        {activeTab === 0 && (
          <Box>
            {/* Quick Metrics Bar for Approvals */}
            <Grid container spacing={2.5} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <Card sx={{ bgcolor: '#ffffff', border: pendingCount > 0 ? '1px solid #f59e0b' : '1px solid #e2e8f0', borderRadius: 3 }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: pendingCount > 0 ? '#b45309' : '#64748b' }}>
                          AWAITING VERIFICATION
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: pendingCount > 0 ? '#d97706' : '#0f172a', mt: 0.5 }}>
                          {pendingCount}
                        </Typography>
                      </Box>
                      <Avatar sx={{ bgcolor: pendingCount > 0 ? '#fef3c7' : '#f1f5f9', color: pendingCount > 0 ? '#b45309' : '#64748b' }}>
                        <HourglassIcon />
                      </Avatar>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Card sx={{ bgcolor: '#ffffff', border: '1px solid #a7f3d0', borderRadius: 3 }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#047857' }}>
                          SECURITY ARCHITECTURE
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#059669', mt: 0.5 }}>
                          JWT Bearer Authentication
                        </Typography>
                      </Box>
                      <Avatar sx={{ bgcolor: '#ecfdf5', color: '#059669' }}>
                        <SecurityIcon />
                      </Avatar>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 3 }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>
                          STORE AUTHORIZATION
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
                          {currentUser?.storeName || 'Main Store'}
                        </Typography>
                      </Box>
                      <Avatar sx={{ bgcolor: '#ecfdf5', color: '#059669' }}>
                        <AdminIcon />
                      </Avatar>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Approvals Table Component */}
            <UserApprovals token={token} onStatusChange={fetchDashboardStats} />
          </Box>
        )}

        {/* TAB 1: LIVE MULTI-STORE MONITOR WALL */}
        {activeTab === 1 && (
          <LiveMonitorWall selectedStore={selectedStore} />
        )}

        {/* TAB 2: EXECUTIVE KPIS & ANALYTICS */}
        {activeTab === 2 && (
          <Box>
            <AnalyticsKPIs stats={stats} />
          </Box>
        )}

        {/* TAB 3: STORE COUNTER AUDIO RECORDER */}
        {activeTab === 3 && (
          <LiveAudioRecorder
            currentUser={currentUser}
            selectedStore={selectedStore}
            onConversationLogged={fetchDashboardStats}
          />
        )}

        {/* TAB 4: CONVERSATION HISTORY & INSPECTOR */}
        {activeTab === 4 && (
          <ConversationList selectedStore={selectedStore} />
        )}

        {/* TAB 5: SALES REP LEADERBOARD */}
        {activeTab === 5 && (
          <RepLeaderboard leaderboard={stats?.leaderboard || []} />
        )}
      </Container>

      {/* Real-Time Toast Alerts */}
      <Snackbar
        open={Boolean(toastNotification)}
        autoHideDuration={6000}
        onClose={() => setToastNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {toastNotification ? (
          <Alert
            severity={toastNotification.type}
            onClose={() => setToastNotification(null)}
            sx={{ borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontWeight: 600 }}
          >
            <strong>{toastNotification.title}: </strong>
            {toastNotification.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
