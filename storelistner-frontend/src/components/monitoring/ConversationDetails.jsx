/**
 * Storelistener — Conversation Details Component for Live Monitoring
 * File: src/components/monitoring/ConversationDetails.jsx
 */

import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Stack,
  Box,
  Chip,
  Divider,
} from '@mui/material';
import {
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

export default function ConversationDetails({ conversation }) {
  if (!conversation) return null;

  const {
    storeName,
    workstation,
    salesRep,
    startedAt,
    elapsedSimulated,
    dealStatus = 'Pending',
    notes,
  } = conversation;

  const statusConfig = DEAL_STATUS_MAP[dealStatus] || DEAL_STATUS_MAP['Pending'];
  const StatusIcon = statusConfig.icon;

  return (
    <Card>
      <CardHeader
        title={
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Session Details
          </Typography>
        }
        subheader={
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
            Counter metadata & sales specialist session info
          </Typography>
        }
        sx={{ p: 2, pb: 1.5 }}
      />
      <Divider />

      <CardContent sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          {/* Store & Workstation */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Store Location
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {storeName}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Workstation Counter
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.primary', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
              {workstation}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Sales Specialist
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.primary' }}>
              {salesRep}
            </Typography>
          </Box>

          {/* Time & Duration */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Started At
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.primary' }}>
              {startedAt}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Elapsed Duration
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.primary' }}>
              {elapsedSimulated} <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>(simulated)</span>
            </Typography>
          </Box>

          {/* Deal Status Badge */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Deal Status
            </Typography>
            <Chip
              size="small"
              icon={<StatusIcon sx={{ fontSize: '11px !important', color: `${statusConfig.textColor} !important` }} />}
              label={dealStatus}
              sx={{
                height: 20,
                fontSize: '0.6875rem',
                fontWeight: 600,
                bgcolor: statusConfig.bgColor,
                color: statusConfig.textColor,
                borderColor: statusConfig.borderColor,
                borderWidth: 1,
                borderStyle: 'solid',
              }}
            />
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* Counter Specialist Notes */}
          <Box>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontWeight: 600,
                color: 'text.secondary',
                mb: 0.5,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontSize: '0.6875rem',
              }}
            >
              Session Observation Notes
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                bgcolor: '#F8FAFC',
                p: 1.5,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                fontSize: '0.8125rem',
                lineHeight: 1.5,
              }}
            >
              {notes || 'No specialist observation recorded for this counter exchange.'}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
