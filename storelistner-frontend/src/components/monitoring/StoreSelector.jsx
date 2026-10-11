/**
 * Storelistener — StoreSelector Component for Live Monitoring
 * File: src/components/monitoring/StoreSelector.jsx
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
  Storefront as StoreIcon,
  FiberManualRecord as DotIcon,
} from '@mui/icons-material';

export default function StoreSelector({
  stores = [],
  selectedStoreId,
  onSelectStore,
}) {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'Online':
        return {
          dotColor: '#16A34A',
          bgColor: '#F0FDF4',
          borderColor: '#BBF7D0',
          textColor: '#15803D',
          label: 'Online',
        };
      case 'Offline':
        return {
          dotColor: '#DC2626',
          bgColor: '#FEF2F2',
          borderColor: '#FECACA',
          textColor: '#B91C1C',
          label: 'Offline',
        };
      default:
        return {
          dotColor: '#94A3B8',
          bgColor: '#F8FAFC',
          borderColor: '#E2E8F0',
          textColor: '#64748B',
          label: 'Not Connected',
        };
    }
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Retail Stores
          </Typography>
        }
        subheader={
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
            Select a store to monitor counter conversations
          </Typography>
        }
        sx={{ p: 2, pb: 1.5 }}
      />
      <Divider />

      <CardContent sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          {stores.map((store) => {
            const isSelected = selectedStoreId === store.id;
            const statusConfig = getStatusConfig(store.status);

            return (
              <Paper
                key={store.id}
                variant="outlined"
                onClick={() => onSelectStore && onSelectStore(store.id)}
                sx={{
                  p: 1.75,
                  borderRadius: 1.5,
                  cursor: 'pointer',
                  transition: 'border-color 150ms ease, background-color 150ms ease',
                  borderColor: isSelected ? 'secondary.main' : 'divider',
                  bgcolor: isSelected ? '#F8FAFC' : 'background.paper',
                  borderWidth: isSelected ? '1.5px' : '1px',
                  '&:hover': {
                    borderColor: isSelected ? 'secondary.main' : '#CBD5E1',
                    bgcolor: isSelected ? '#F8FAFC' : '#F8FAFC',
                  },
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        bgcolor: isSelected ? '#EFF6FF' : '#F1F5F9',
                        color: isSelected ? 'secondary.main' : 'text.secondary',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <StoreIcon sx={{ fontSize: 18 }} />
                    </Box>
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isSelected ? 700 : 600,
                          color: isSelected ? 'secondary.main' : 'text.primary',
                          lineHeight: 1.2,
                        }}
                      >
                        {store.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6875rem' }}>
                        {store.location}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Status Indicator */}
                  <Chip
                    size="small"
                    icon={<DotIcon sx={{ fontSize: '10px !important', color: `${statusConfig.dotColor} !important` }} />}
                    label={statusConfig.label}
                    sx={{
                      height: 20,
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      bgcolor: statusConfig.bgColor,
                      borderColor: statusConfig.borderColor,
                      borderWidth: 1,
                      borderStyle: 'solid',
                      color: statusConfig.textColor,
                    }}
                  />
                </Stack>

                {/* Counter Active Count */}
                <Box sx={{ mt: 1.25, pt: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Active Counter Sessions
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: store.activeCount > 0 ? 'secondary.main' : 'text.disabled' }}>
                    {store.activeCount} active
                  </Typography>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}
