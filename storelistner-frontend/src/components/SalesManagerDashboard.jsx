import React, { useState } from 'react';
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
  Paper,
  Button,
  Alert,
} from '@mui/material';
import {
  Mic as MicIcon,
  Forum as ForumIcon,
  TipsAndUpdates as TipsIcon,
  Security as ShieldCheckIcon,
  Verified as VerifiedIcon,
  DesktopWindows as DesktopIcon,
  WifiTethering as WifiIcon,
  Psychology as AiIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

import Header from './Header';
import LiveAudioRecorder from './LiveAudioRecorder';
import ConversationList from './ConversationList';

export default function SalesManagerDashboard({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState(0); // 0 = Terminal, 1 = Conversations, 2 = Sales Copilot Guide

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', color: '#0f172a' }}>
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        onLogout={onLogout}
        selectedStore={currentUser?.storeCode}
        socketConnected={true}
      />

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Verification Status Banner */}
        <Card
          sx={{
            mb: 3,
            p: 1,
            bgcolor: '#ffffff',
            border: '1px solid #a7f3d0',
            borderRadius: 3.5,
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.08)',
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ md: 'center' }}
              spacing={2.5}
            >
              <Stack direction="row" spacing={2.5} alignItems="center">
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: '#ecfdf5',
                    color: '#059669',
                    borderRadius: 3,
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)',
                  }}
                >
                  <VerifiedIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      Sales Manager Terminal
                    </Typography>
                    <Chip
                      label="ACTIVE & VERIFIED"
                      size="small"
                      sx={{
                        bgcolor: '#10b981',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.68rem',
                        height: 22,
                      }}
                    />
                  </Stack>
                  <Typography variant="body2" sx={{ color: '#059669', fontWeight: 600, mt: 0.3 }}>
                    Verified by Store Admin • Authorization granted for store floor monitoring & speech intelligence
                  </Typography>
                </Box>
              </Stack>

              <Paper
                variant="outlined"
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: '#f8fafc',
                  borderColor: '#e2e8f0',
                  fontSize: '0.8rem',
                }}
              >
                <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
                  <strong>Account:</strong> {currentUser?.email}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
                  <strong>Assigned Store:</strong> {currentUser?.storeName} ({currentUser?.storeCode})
                </Typography>
              </Paper>
            </Stack>
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <Card sx={{ mb: 3, bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            textColor="primary"
            indicatorColor="primary"
            sx={{ px: 2, minHeight: 52 }}
          >
            <Tab icon={<MicIcon />} iconPosition="start" label="Floor Audio & AI Speech Terminal" />
            <Tab icon={<ForumIcon />} iconPosition="start" label="Store Conversations & Transcripts" />
            <Tab icon={<TipsIcon />} iconPosition="start" label="AI Sales Copilot & Objection Guides" />
          </Tabs>
        </Card>

        {/* TAB 0: LIVE FLOOR RECORDER */}
        {activeTab === 0 && (
          <LiveAudioRecorder
            currentUser={currentUser}
            selectedStore={currentUser?.storeCode}
          />
        )}

        {/* TAB 1: CONVERSATION HISTORY */}
        {activeTab === 1 && (
          <ConversationList selectedStore={currentUser?.storeCode} />
        )}

        {/* TAB 2: AI SALES COPILOT GUIDELINES */}
        {activeTab === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Avatar sx={{ bgcolor: '#ecfdf5', color: '#059669', mb: 2, borderRadius: 2 }}>
                    <DesktopIcon />
                  </Avatar>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
                    Store Desktop Client
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.6 }}>
                    Your verified credentials work seamlessly on the native Electron counter app. Run the client on counter workstations for automatic Voice Activity Detection (VAD).
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Avatar sx={{ bgcolor: '#ecfdf5', color: '#059669', mb: 2, borderRadius: 2 }}>
                    <WifiIcon />
                  </Avatar>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
                    Live Multi-Language Recognition
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.6 }}>
                    Supports real-time English and regional customer conversation transcription. Real-time deal closed detector immediately fires closing confetti and updates analytics.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Avatar sx={{ bgcolor: '#ecfdf5', color: '#059669', mb: 2, borderRadius: 2 }}>
                    <AiIcon />
                  </Avatar>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
                    AI Objection Handling
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.6 }}>
                    When a customer brings up trade-in value or price hesitation, the AI assistant automatically recommends bundle discounts, AppleCare+ pitches, and 0% financing terms.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
}
