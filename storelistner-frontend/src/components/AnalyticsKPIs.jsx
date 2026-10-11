import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  PhoneIphone as PhoneIphoneIcon,
  WarningAmber as WarningIcon,
  SentimentSatisfied as SentimentIcon,
} from '@mui/icons-material';

export default function AnalyticsKPIs({ stats }) {
  if (!stats) return null;

  const {
    totalConversations = 0,
    wonCount = 0,
    lostCount = 0,
    winRate = 0,
    avgDurationSeconds = 0,
    sentimentBreakdown = { positive: 0, neutral: 0, negative: 0 },
    topDevices = [],
    topObjections = [],
  } = stats;

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}m ${rem}s`;
  };

  const totalSentiment =
    (sentimentBreakdown.positive || 0) +
      (sentimentBreakdown.neutral || 0) +
      (sentimentBreakdown.negative || 0) || 1;
  const posPct = Math.round(((sentimentBreakdown.positive || 0) / totalSentiment) * 100);
  const neuPct = Math.round(((sentimentBreakdown.neutral || 0) / totalSentiment) * 100);
  const negPct = Math.round(((sentimentBreakdown.negative || 0) / totalSentiment) * 100);

  return (
    <Box sx={{ mb: 3 }}>
      {/* Top 4 KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        {/* Total Conversations */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 3,
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Total In-Store Encounters
                </Typography>
                <TrendingUpIcon sx={{ color: '#059669', fontSize: 20 }} />
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
                {totalConversations}
              </Typography>
              <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600, mt: 0.5, display: 'block' }}>
                Multi-store audio capture
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Deal Win Rate */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: '#ffffff',
              border: '1px solid #a7f3d0',
              borderRadius: 3,
              boxShadow: '0 2px 12px rgba(16, 185, 129, 0.08)',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>
                  Deal Closure Win Rate
                </Typography>
                <CheckCircleIcon sx={{ color: '#10b981', fontSize: 20 }} />
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#059669' }}>
                {winRate}%
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mt: 0.5, display: 'block' }}>
                {wonCount} Deals Won • {lostCount} Lost
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Avg Duration */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 3,
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Avg Pitch Duration
                </Typography>
                <AccessTimeIcon sx={{ color: '#059669', fontSize: 20 }} />
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
                {formatTime(avgDurationSeconds)}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mt: 0.5, display: 'block' }}>
                Per counter engagement
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Sentiment Analysis */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 3,
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Customer Sentiment
                </Typography>
                <SentimentIcon sx={{ color: '#059669', fontSize: 20 }} />
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#059669' }}>
                {posPct}% <Typography component="span" variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Positive</Typography>
              </Typography>
              <Box sx={{ mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={posPct}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: '#f1f5f9',
                    '& .MuiLinearProgress-bar': { bgcolor: '#10b981' },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Breakdown Row: Top Devices & Top Customer Objections */}
      <Grid container spacing={2.5}>
        {/* Top iPhone Devices Discussed */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <PhoneIphoneIcon sx={{ color: '#059669' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Top iPhone Models Discussed
                </Typography>
              </Stack>
              {topDevices.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  No product models tracked yet.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {topDevices.map((item, idx) => (
                    <Box key={idx}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                          {item.name || item.model || 'iPhone 16 Pro'}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#059669' }}>
                          {item.count || item.mentions || 0} mentions
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, ((item.count || item.mentions || 1) / (topDevices[0]?.count || topDevices[0]?.mentions || 1)) * 100)}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: '#f1f5f9',
                          '& .MuiLinearProgress-bar': { bgcolor: '#059669' },
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Top Customer Objections & Resistance */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <WarningIcon sx={{ color: '#f59e0b' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Top Customer Objections
                </Typography>
              </Stack>
              {topObjections.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  No objections recorded yet.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {topObjections.map((obj, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                        {obj.type || obj.name || 'Price / Trade-in Value'}
                      </Typography>
                      <Chip
                        label={`${obj.count || 0} times`}
                        size="small"
                        sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700 }}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
