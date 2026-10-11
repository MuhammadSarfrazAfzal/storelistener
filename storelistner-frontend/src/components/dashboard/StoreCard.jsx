/**
 * Storelistener — Reusable StoreCard Component
 * File: src/components/dashboard/StoreCard.jsx
 */


import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Stack,
  Box,
  Chip,
  Button,
} from '@mui/material';
import {
  Storefront as StoreIcon,
  FiberManualRecord as DotIcon,
  ChevronRight as ArrowIcon,
} from '@mui/icons-material';

export default function StoreCard({ store, onAction }) {
  if (!store) return null;

  const { name, code, status = 'Not Connected', activeConversations = 0, workstationsCount = 0 } = store;

  // Determine status color and label without relying on color alone
  const getStatusConfig = () => {
    switch (status) {
      case 'Online':
        return {
          color: 'success',
          label: 'Online',
          dotColor: '#16A34A',
          bgColor: '#F0FDF4',
          borderColor: '#BBF7D0',
        };
      case 'Offline':
        return {
          color: 'error',
          label: 'Offline',
          dotColor: '#DC2626',
          bgColor: '#FEF2F2',
          borderColor: '#FECACA',
        };
      default:
        return {
          color: 'default',
          label: 'Not Connected',
          dotColor: '#94A3B8',
          bgColor: '#F8FAFC',
          borderColor: '#E2E8F0',
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
        '&:hover': {
          borderColor: '#CBD5E1',
        },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        {/* Header: Store Icon, Name & Status Badge */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 1.5,
                bgcolor: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.primary',
                flexShrink: 0,
              }}
            >
              <StoreIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                {code}
              </Typography>
            </Box>
          </Stack>

          {/* Accessible Status Indicator (Text + Shape) */}
          <Chip
            size="small"
            icon={<DotIcon sx={{ fontSize: '10px !important', color: `${statusConfig.dotColor} !important` }} />}
            label={statusConfig.label}
            sx={{
              height: 22,
              fontSize: '0.6875rem',
              fontWeight: 600,
              bgcolor: statusConfig.bgColor,
              borderColor: statusConfig.borderColor,
              borderWidth: 1,
              borderStyle: 'solid',
              color: 'text.primary',
            }}
          />
        </Stack>

        {/* Store Metrics */}
        <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
              Active Conversations
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: activeConversations > 0 ? 'secondary.main' : 'text.secondary' }}>
              {activeConversations}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.75 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
              Registered Terminals
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
              {workstationsCount}
            </Typography>
          </Stack>
        </Box>
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0, borderTop: 'none' }}>
        <Button
          fullWidth
          size="small"
          variant="outlined"
          onClick={() => onAction && onAction(store)}
          endIcon={<ArrowIcon sx={{ fontSize: 16 }} />}
          sx={{
            justifyContent: 'space-between',
            borderColor: 'divider',
            color: 'text.primary',
            fontSize: '0.8125rem',
            '&:hover': {
              borderColor: 'secondary.main',
              bgcolor: '#F8FAFC',
            },
          }}
        >
          {status === 'Online' ? 'Monitor Store' : 'View Store'}
        </Button>
      </CardActions>
    </Card>
  );
}
