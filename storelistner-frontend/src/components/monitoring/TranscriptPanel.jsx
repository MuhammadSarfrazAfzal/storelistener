/**
 * Storelistener — Transcript Panel Component for Live Monitoring
 * File: src/components/monitoring/TranscriptPanel.jsx
 */

import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Stack,
  Box,
  Chip,
  Paper,
  Divider,
} from '@mui/material';
import {
  PersonOutline as CustomerIcon,
  SupportAgentOutlined as SalespersonIcon,
  DataObjectOutlined as SimulatedIcon,
  RecordVoiceOverOutlined as EmptyTranscriptIcon,
} from '@mui/icons-material';

export default function TranscriptPanel({ conversation }) {
  if (!conversation) {
    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardHeader
          title={
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Live Transcript
            </Typography>
          }
          subheader={
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
              Select an active conversation to inspect recognized dialogue
            </Typography>
          }
          sx={{ p: 2, pb: 1.5 }}
        />
        <Divider />
        <CardContent sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: '#F8FAFC',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.disabled',
                mb: 1.5,
              }}
            >
              <EmptyTranscriptIcon />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              No conversation selected
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
              Choose a store and active conversation session from the left panel.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const { title, storeName, workstation, transcript = [] } = conversation;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Panel Header */}
      <CardHeader
        title={
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {title}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                {storeName} • {workstation}
              </Typography>
            </Box>

            {/* Simulated Transcript Tag */}
            <Chip
              size="small"
              icon={<SimulatedIcon sx={{ fontSize: '12px !important', color: '#B45309 !important' }} />}
              label="Simulated Transcript"
              sx={{
                height: 22,
                fontSize: '0.6875rem',
                fontWeight: 600,
                bgcolor: '#FFFBEB',
                color: '#B45309',
                borderColor: '#FDE68A',
                borderWidth: 1,
                borderStyle: 'solid',
                alignSelf: { xs: 'flex-start', sm: 'center' },
              }}
            />
          </Stack>
        }
        sx={{ p: 2, pb: 1.5 }}
      />
      <Divider />

      {/* Transcript Exchanges List */}
      <CardContent
        sx={{
          p: 2,
          flex: 1,
          overflowY: 'auto',
          maxHeight: { xs: 450, md: 'calc(100vh - 300px)' },
        }}
      >
        <Stack spacing={1.75}>
          {transcript.map((line) => {
            const isSalesperson = line.speaker === 'Salesperson';

            return (
              <Paper
                key={line.id}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  bgcolor: isSalesperson ? '#F8FAFC' : '#FFFFFF',
                  borderColor: isSalesperson ? '#E2E8F0' : '#CBD5E1',
                }}
              >
                {/* Speaker Header */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: 1,
                        bgcolor: isSalesperson ? '#EFF6FF' : '#F1F5F9',
                        color: isSalesperson ? 'secondary.main' : 'text.secondary',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSalesperson ? <SalespersonIcon sx={{ fontSize: 15 }} /> : <CustomerIcon sx={{ fontSize: 15 }} />}
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: isSalesperson ? 'secondary.dark' : 'text.primary',
                        fontSize: '0.75rem',
                      }}
                    >
                      {line.speaker}
                    </Typography>
                  </Stack>

                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6875rem', fontFamily: 'monospace' }}>
                    {line.time}
                  </Typography>
                </Stack>

                {/* Speech Text */}
                <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.55, pl: 4 }}>
                  {line.text}
                </Typography>
              </Paper>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}
