/**
 * Storelistener — Active Conversation List Component
 * File: src/components/monitoring/ActiveConversationList.jsx
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
  ChatBubbleOutline as EmptyIcon,
  GraphicEq as LiveAudioIcon,
  CheckCircle as ClosedIcon,
  HourglassEmpty as PendingIcon,
  Cancel as NotClosedIcon,
  Search as ReviewIcon,
} from '@mui/icons-material';

const DEAL_STATUS_MAP = {
  Closed: {
    textColor: '#15803D',
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    icon: ClosedIcon,
  },
  Pending: {
    textColor: '#B45309',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    icon: PendingIcon,
  },
  'Not Closed': {
    textColor: '#B91C1C',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    icon: NotClosedIcon,
  },
  'Under Review': {
    textColor: '#1D4ED8',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    icon: ReviewIcon,
  },
};

export default function ActiveConversationList({
  conversations = [],
  selectedConversationId,
  onSelectConversation,
  storeName = 'Selected Store',
}) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Active Conversations
            </Typography>
            <Chip
              size="small"
              label={`${conversations.length} live`}
              sx={{
                bgcolor: '#F1F5F9',
                color: 'text.secondary',
                fontSize: '0.6875rem',
                fontWeight: 600,
                height: 20,
              }}
            />
          </Stack>
        }
        subheader={
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
            {storeName} — Click to inspect transcript and audio
          </Typography>
        }
        sx={{ p: 2, pb: 1.5 }}
      />
      <Divider />

      <CardContent sx={{ p: 2, flex: 1, overflowY: 'auto' }}>
        {conversations.length === 0 ? (
          <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: '#F8FAFC',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.disabled',
                mb: 1.5,
              }}
            >
              <EmptyIcon />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              No active conversations
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
              This store has no active demonstration counter sessions at this time.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.25}>
            {conversations.map((item) => {
              const isSelected = selectedConversationId === item.id;
              const statusConfig = DEAL_STATUS_MAP[item.dealStatus] || DEAL_STATUS_MAP['Pending'];
              const StatusIcon = statusConfig.icon;

              return (
                <Paper
                  key={item.id}
                  variant="outlined"
                  onClick={() => onSelectConversation && onSelectConversation(item.id)}
                  sx={{
                    p: 1.75,
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    transition: 'border-color 150ms ease, background-color 150ms ease',
                    borderColor: isSelected ? 'secondary.main' : 'divider',
                    bgcolor: isSelected ? '#EFF6FF' : 'background.paper',
                    borderWidth: isSelected ? '1.5px' : '1px',
                    '&:hover': {
                      borderColor: isSelected ? 'secondary.main' : '#CBD5E1',
                      bgcolor: isSelected ? '#EFF6FF' : '#F8FAFC',
                    },
                  }}
                >
                  {/* Title & Recording badge */}
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ mb: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: isSelected ? 'secondary.dark' : 'text.primary',
                        lineHeight: 1.3,
                        fontSize: '0.8125rem',
                      }}
                    >
                      {item.title}
                    </Typography>

                    <Chip
                      size="small"
                      icon={<LiveAudioIcon sx={{ fontSize: '11px !important', color: '#16A34A !important' }} />}
                      label={item.recordingState}
                      sx={{
                        height: 18,
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        bgcolor: '#F0FDF4',
                        color: '#15803D',
                        flexShrink: 0,
                      }}
                    />
                  </Stack>

                  {/* Metadata Row */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.75 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6875rem' }}>
                      {item.workstation} • {item.startedAt}
                    </Typography>

                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6875rem' }}>
                      {item.elapsedSimulated} (simulated)
                    </Typography>
                  </Stack>

                  {/* Deal Status Badge */}
                  <Box sx={{ mt: 1.25, pt: 1, borderTop: '1px solid', borderColor: isSelected ? '#BFDBFE' : 'divider' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6875rem' }}>
                        Deal Status
                      </Typography>
                      <Chip
                        size="small"
                        icon={<StatusIcon sx={{ fontSize: '11px !important', color: `${statusConfig.textColor} !important` }} />}
                        label={item.dealStatus}
                        sx={{
                          height: 18,
                          fontSize: '0.625rem',
                          fontWeight: 600,
                          bgcolor: statusConfig.bgColor,
                          color: statusConfig.textColor,
                          borderColor: statusConfig.borderColor,
                          borderWidth: 1,
                          borderStyle: 'solid',
                        }}
                      />
                    </Stack>
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
