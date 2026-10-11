/**
 * Storelistener — Reusable Recent Conversations Table Component
 * File: src/components/dashboard/RecentConversationsTable.jsx
 */


import {
  Card,
  CardHeader,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Button,
  Box,
  Stack,
  Divider,
} from '@mui/material';
import {
  CheckCircle as ClosedIcon,
  HourglassEmpty as PendingIcon,
  Cancel as NotClosedIcon,
  Search as ReviewIcon,
  ChatBubbleOutline as EmptyIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';

const STATUS_CONFIG = {
  Closed: {
    color: 'success',
    icon: ClosedIcon,
    bgColor: '#F0FDF4',
    textColor: '#15803D',
    borderColor: '#BBF7D0',
  },
  Pending: {
    color: 'warning',
    icon: PendingIcon,
    bgColor: '#FFFBEB',
    textColor: '#B45309',
    borderColor: '#FDE68A',
  },
  'Not Closed': {
    color: 'error',
    icon: NotClosedIcon,
    bgColor: '#FEF2F2',
    textColor: '#B91C1C',
    borderColor: '#FECACA',
  },
  'Under Review': {
    color: 'info',
    icon: ReviewIcon,
    bgColor: '#EFF6FF',
    textColor: '#1D4ED8',
    borderColor: '#BFDBFE',
  },
};

export default function RecentConversationsTable({
  conversations = [],
  onInspect,
  onViewAll,
}) {
  return (
    <Card sx={{ width: '100%' }}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Recent Conversations
            </Typography>
            <Chip
              size="small"
              label={`${conversations.length} records`}
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
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.25, display: 'block' }}>
            Latest sales-floor customer dialogues and deal outcomes across store counters
          </Typography>
        }
        action={
          onViewAll && (
            <Button
              size="small"
              variant="text"
              onClick={onViewAll}
              endIcon={<ArrowIcon sx={{ fontSize: 14 }} />}
              sx={{ color: 'secondary.main', fontWeight: 600, fontSize: '0.8125rem' }}
            >
              View History
            </Button>
          )
        }
        sx={{ p: 2.5, pb: 1.5 }}
      />
      <Divider />

      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        {conversations.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Box
              sx={{
                width: 44,
                height: 44,
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
              No recent conversations recorded
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
              When sales terminals capture customer interactions, they will appear here.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small" aria-label="recent conversations table">
              <TableHead>
                <TableRow>
                  <TableCell>Conversation</TableCell>
                  <TableCell>Store</TableCell>
                  <TableCell>Started At</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Deal Status</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {conversations.map((row) => {
                  const statusInfo = STATUS_CONFIG[row.dealStatus] || STATUS_CONFIG['Pending'];
                  const StatusIcon = statusInfo.icon;

                  return (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{
                        '&:last-child td, &:last-child th': { border: 0 },
                        transition: 'background-color 120ms ease',
                      }}
                    >
                      {/* Conversation Title & ID */}
                      <TableCell component="th" scope="row">
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          {row.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                          #{row.id}
                        </Typography>
                      </TableCell>

                      {/* Store */}
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {row.storeName}
                        </Typography>
                      </TableCell>

                      {/* Started At */}
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                          {row.startedAt}
                        </Typography>
                      </TableCell>

                      {/* Duration */}
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                          {row.duration}
                        </Typography>
                      </TableCell>

                      {/* Deal Status (Accessible Chip) */}
                      <TableCell>
                        <Chip
                          size="small"
                          icon={<StatusIcon sx={{ fontSize: '12px !important', color: `${statusInfo.textColor} !important` }} />}
                          label={row.dealStatus}
                          sx={{
                            height: 22,
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            bgcolor: statusInfo.bgColor,
                            color: statusInfo.textColor,
                            borderColor: statusInfo.borderColor,
                            borderWidth: 1,
                            borderStyle: 'solid',
                          }}
                        />
                      </TableCell>

                      {/* Action */}
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => onInspect && onInspect(row)}
                          sx={{
                            fontSize: '0.75rem',
                            py: 0.25,
                            px: 1.25,
                            borderColor: 'divider',
                            color: 'text.primary',
                            '&:hover': {
                              borderColor: 'secondary.main',
                              bgcolor: '#F8FAFC',
                            },
                          }}
                        >
                          Inspect
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}
