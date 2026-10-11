/**
 * Storelistener — Live Monitoring Page (Module 2 Workspace)
 * File: src/components/monitoring/LiveMonitoringPage.jsx
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Stack,
  Alert,
} from '@mui/material';
import {
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';

import StoreSelector from './StoreSelector';
import ActiveConversationList from './ActiveConversationList';
import TranscriptPanel from './TranscriptPanel';
import AudioMonitoringPanel from './AudioMonitoringPanel';
import ConversationDetails from './ConversationDetails';

import {
  MONITORING_STORES,
  MOCK_LIVE_CONVERSATIONS,
  LIVE_MONITORING_DISCLAIMER,
} from '../../data/mockLiveMonitoringData';

export default function LiveMonitoringPage() {
  const [selectedStoreId, setSelectedStoreId] = useState('store-01');
  const [selectedConversationId, setSelectedConversationId] = useState('conv-live-101');

  // Handle store selection
  const handleSelectStore = (storeId) => {
    setSelectedStoreId(storeId);
    const storeConversations = MOCK_LIVE_CONVERSATIONS[storeId] || [];
    setSelectedConversationId(storeConversations.length > 0 ? storeConversations[0].id : null);
  };

  // Get active conversations for selected store
  const activeConversations = MOCK_LIVE_CONVERSATIONS[selectedStoreId] || [];
  const selectedStore = MONITORING_STORES.find((s) => s.id === selectedStoreId);

  // Get currently selected conversation object
  const currentConversation = activeConversations.find(
    (c) => c.id === selectedConversationId
  ) || null;

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto' }}>
      {/* Page Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.02em' }}>
            Live Store Monitoring
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Inspect counter activity, recognized speech, and session status across iPhone store branches.
          </Typography>
        </Box>
      </Stack>

      {/* Demonstration Mode Disclaimer */}
      <Alert
        severity="info"
        icon={<InfoIcon fontSize="small" />}
        sx={{
          mb: 3,
          borderRadius: 2,
          py: 0.75,
          px: 2,
          fontSize: '0.8125rem',
        }}
      >
        <strong>{LIVE_MONITORING_DISCLAIMER.badgeText}: </strong>
        {LIVE_MONITORING_DISCLAIMER.bannerText}
      </Alert>

      {/* Three-Panel Desktop Workspace Layout */}
      <Grid container spacing={2.5}>
        {/* Panel 1: Store & Active Conversation Selector (Left) */}
        <Grid item xs={12} lg={3.5}>
          <Stack spacing={2.5}>
            {/* Store Selection */}
            <StoreSelector
              stores={MONITORING_STORES}
              selectedStoreId={selectedStoreId}
              onSelectStore={handleSelectStore}
            />

            {/* Conversation Selection for Store */}
            <ActiveConversationList
              conversations={activeConversations}
              selectedConversationId={selectedConversationId}
              onSelectConversation={(id) => setSelectedConversationId(id)}
              storeName={selectedStore ? selectedStore.name : 'Selected Store'}
            />
          </Stack>
        </Grid>

        {/* Panel 2: Transcript Viewer (Center) */}
        <Grid item xs={12} md={7} lg={5}>
          <TranscriptPanel conversation={currentConversation} />
        </Grid>

        {/* Panel 3: Audio Feed & Details (Right) */}
        <Grid item xs={12} md={5} lg={3.5}>
          <Stack spacing={2.5}>
            <AudioMonitoringPanel conversation={currentConversation} />
            <ConversationDetails conversation={currentConversation} />
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
