/**
 * Storelistener — Main Dashboard Overview Component
 * File: src/components/dashboard/DashboardOverview.jsx
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Stack,
  Alert,
  Button,
  Snackbar,
} from '@mui/material';
import {
  Sensors as LiveMonitorIcon,
  Forum as HistoryIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';

import StatCard from './StatCard';
import StoreCard from './StoreCard';
import RecentConversationsTable from './RecentConversationsTable';
import {
  MOCK_KPIS,
  MOCK_STORES,
  MOCK_RECENT_CONVERSATIONS,
  MOCK_DATA_DISCLAIMER,
} from '../../data/mockDashboardData';

export default function DashboardOverview({ onNavigate }) {
  const [toastMessage, setToastMessage] = useState(null);

  const handleStoreAction = (store) => {
    if (onNavigate) {
      onNavigate('live-monitoring');
    } else {
      setToastMessage(`Selected "${store.name}". Opening Live Monitoring.`);
    }
  };

  const handleInspectConversation = (conv) => {
    setToastMessage(`Viewing conversation #${conv.id} (${conv.storeName}). Detailed transcript & audio review belongs to Module 3.`);
  };

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto' }}>
      {/* A. Welcome Section & Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.02em' }}>
            Store Overview
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Monitor conversations and review sales activity across stores.
          </Typography>
        </Box>

        {/* E. Quick Navigation Shortcuts */}
        <Stack direction="row" spacing={1.5}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<LiveMonitorIcon />}
            onClick={() => onNavigate && onNavigate('live-monitoring')}
            sx={{ fontWeight: 600, fontSize: '0.8125rem' }}
          >
            Live Monitoring
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<HistoryIcon />}
            onClick={() => onNavigate && onNavigate('conversations')}
            sx={{ fontWeight: 600, fontSize: '0.8125rem' }}
          >
            Conversation History
          </Button>
        </Stack>
      </Stack>

      {/* Development / Mock Data Notice */}
      <Alert
        severity="info"
        icon={<InfoIcon fontSize="small" />}
        sx={{
          mb: 3.5,
          borderRadius: 2,
          py: 0.75,
          px: 2,
          fontSize: '0.8125rem',
        }}
      >
        <strong>{MOCK_DATA_DISCLAIMER.label}: </strong>
        {MOCK_DATA_DISCLAIMER.description}
      </Alert>

      {/* B. KPI Cards Section (4 Compact Summary Cards) */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {MOCK_KPIS.map((kpi) => (
          <Grid item xs={12} sm={6} lg={3} key={kpi.id}>
            <StatCard
              label={kpi.label}
              value={kpi.value}
              supportingText={kpi.supportingText}
              iconName={kpi.iconName}
              category={kpi.category}
            />
          </Grid>
        ))}
      </Grid>

      {/* C. Three-Store Overview Section */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Retail Store Locations
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Real-time connection state and counter activity across all 3 retail branches
            </Typography>
          </Box>
        </Stack>

        <Grid container spacing={2.5}>
          {MOCK_STORES.map((store) => (
            <Grid item xs={12} md={4} key={store.id}>
              <StoreCard store={store} onAction={handleStoreAction} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* D. Recent Conversations Preview */}
      <Box sx={{ mb: 2 }}>
        <RecentConversationsTable
          conversations={MOCK_RECENT_CONVERSATIONS}
          onInspect={handleInspectConversation}
          onViewAll={() => onNavigate && onNavigate('conversations')}
        />
      </Box>

      {/* Non-intrusive feedback toast for UI action checks */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        message={toastMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </Box>
  );
}
