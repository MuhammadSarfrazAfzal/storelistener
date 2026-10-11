import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  HourglassEmpty as PendingIcon,
  AdminPanelSettings as AdminIcon,
  Work as ManagerIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Check as CheckIcon,
} from '@mui/icons-material';

const BACKEND_URL = 'http://localhost:5000';

export default function UserApprovals({ token, onStatusChange }) {
  const [tab, setTab] = useState(0); // 0 = Pending, 1 = All Users
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [alertInfo, setAlertInfo] = useState(null);

  // Rejection Dialog state
  const [rejectDialogUser, setRejectDialogUser] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('Not authorized for store floor terminal');

  const fetchUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [pendingRes, allRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/auth/pending-sales-managers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BACKEND_URL}/api/auth/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const pendingData = await pendingRes.json();
      const allData = await allRes.json();

      if (pendingData.success) setPendingUsers(pendingData.users || []);
      if (allData.success) setAllUsers(allData.users || []);
    } catch (err) {
      console.warn('Error fetching users:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleApprove = async (user) => {
    setActionLoadingId(user.id);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/users/${user.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setAlertInfo({
          type: 'success',
          msg: `✅ Approved ${user.name}! They can now log in to the sales terminal.`,
        });
        fetchUsers();
        if (onStatusChange) onStatusChange();
      } else {
        setAlertInfo({ type: 'error', msg: data.error || 'Failed to approve user.' });
      }
    } catch (err) {
      setAlertInfo({ type: 'error', msg: 'Approval request failed: ' + err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenReject = (user) => {
    setRejectDialogUser(user);
    setRejectionReason('Not authorized for store floor terminal');
  };

  const handleConfirmReject = async () => {
    if (!rejectDialogUser) return;
    setActionLoadingId(rejectDialogUser.id);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/users/${rejectDialogUser.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      const data = await res.json();
      if (data.success) {
        setAlertInfo({
          type: 'warning',
          msg: `❌ Rejected registration for ${rejectDialogUser.name}.`,
        });
        setRejectDialogUser(null);
        fetchUsers();
        if (onStatusChange) onStatusChange();
      } else {
        setAlertInfo({ type: 'error', msg: data.error || 'Failed to reject user.' });
      }
    } catch (err) {
      setAlertInfo({ type: 'error', msg: 'Rejection failed: ' + err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <Card sx={{ bgcolor: '#ffffff', borderRadius: 3, border: '1px solid #e2e8f0' }}>
      {/* Header bar */}
      <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
              Staff & Sales Manager Approvals
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Verify newly registered sales managers before granting store terminal access
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Tooltip title="Refresh Requests">
              <IconButton onClick={fetchUsers} disabled={loading} size="small" sx={{ border: '1px solid #e2e8f0' }}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Tab switch */}
        <Box sx={{ mt: 2 }}>
          <Tabs
            value={tab}
            onChange={(e, val) => setTab(val)}
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <span>Pending Approvals</span>
                  {pendingUsers.length > 0 && (
                    <Chip
                      label={pendingUsers.length}
                      size="small"
                      sx={{
                        bgcolor: '#fef3c7',
                        color: '#b45309',
                        fontWeight: 700,
                        height: 20,
                        fontSize: '0.72rem',
                      }}
                    />
                  )}
                </Stack>
              }
            />
            <Tab label={`All Users (${allUsers.length})`} />
          </Tabs>
        </Box>
      </Box>

      {/* Alert banner */}
      {alertInfo && (
        <Box sx={{ px: 3, pt: 2 }}>
          <Alert severity={alertInfo.type} onClose={() => setAlertInfo(null)} sx={{ borderRadius: 2 }}>
            {alertInfo.msg}
          </Alert>
        </Box>
      )}

      <CardContent sx={{ p: 0 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={36} color="primary" />
          </Box>
        )}

        {/* TAB 0: PENDING APPROVALS */}
        {!loading && tab === 0 && (
          <>
            {pendingUsers.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
                <Avatar
                  sx={{
                    mx: 'auto',
                    mb: 1.5,
                    bgcolor: '#ecfdf5',
                    color: '#059669',
                    width: 54,
                    height: 54,
                  }}
                >
                  <CheckIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  All Caught Up!
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', maxWidth: 400, mx: 'auto', mt: 0.5 }}>
                  No pending Sales Manager registrations waiting for approval right now. New requests will appear here in real-time.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Staff Member</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Store Branch</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Verification Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingUsers.map((user) => (
                      <TableRow key={user.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ bgcolor: '#d1fae5', color: '#047857', fontWeight: 700 }}>
                              {user.name.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                {user.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b' }}>
                                {user.email}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                            {user.storeName || 'Apple Store'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            {user.storeCode}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<ManagerIcon sx={{ fontSize: '14px !important' }} />}
                            label="Sales Manager"
                            size="small"
                            sx={{ bgcolor: '#f1f5f9', color: '#334155', fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<PendingIcon sx={{ fontSize: '14px !important' }} />}
                            label="Awaiting Approval"
                            size="small"
                            sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<ApproveIcon />}
                              disabled={actionLoadingId === user.id}
                              onClick={() => handleApprove(user)}
                              sx={{
                                bgcolor: '#059669',
                                '&:hover': { bgcolor: '#047857' },
                                fontWeight: 700,
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              color="error"
                              startIcon={<RejectIcon />}
                              disabled={actionLoadingId === user.id}
                              onClick={() => handleOpenReject(user)}
                              sx={{ fontWeight: 700 }}
                            >
                              Reject
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}

        {/* TAB 1: ALL USERS */}
        {!loading && tab === 1 && (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Store Assignment</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>System Role</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Account Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Verified By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allUsers.map((user) => (
                  <TableRow key={user.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          sx={{
                            bgcolor: user.role === 'store_admin' ? '#059669' : '#0284c7',
                            color: '#ffffff',
                            fontWeight: 700,
                          }}
                        >
                          {user.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                            {user.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {user.email}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                        {user.storeName || 'Main Store'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                        {user.storeCode}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {user.role === 'store_admin' ? (
                        <Chip
                          icon={<AdminIcon sx={{ fontSize: '14px !important' }} />}
                          label="Store Admin"
                          size="small"
                          sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700 }}
                        />
                      ) : (
                        <Chip
                          icon={<ManagerIcon sx={{ fontSize: '14px !important' }} />}
                          label="Sales Manager"
                          size="small"
                          sx={{ bgcolor: '#f0fdf4', color: '#059669', fontWeight: 600 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {user.status === 'approved' ? (
                        <Chip
                          icon={<ApproveIcon sx={{ fontSize: '14px !important' }} />}
                          label="Approved"
                          size="small"
                          sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700 }}
                        />
                      ) : user.status === 'rejected' ? (
                        <Chip
                          icon={<RejectIcon sx={{ fontSize: '14px !important' }} />}
                          label="Rejected"
                          size="small"
                          sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}
                        />
                      ) : (
                        <Chip
                          icon={<PendingIcon sx={{ fontSize: '14px !important' }} />}
                          label="Pending"
                          size="small"
                          sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 700 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        {user.approvedBy || (user.role === 'store_admin' ? 'System (Auto)' : 'Pending')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>

      {/* REJECT MODAL DIALOG */}
      <Dialog
        open={Boolean(rejectDialogUser)}
        onClose={() => setRejectDialogUser(null)}
        PaperProps={{ sx: { borderRadius: 3, p: 1, maxWidth: 440 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RejectIcon color="error" />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Reject Registration
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
            Are you sure you want to reject registration for <strong>{rejectDialogUser?.name}</strong> ({rejectDialogUser?.email})?
          </Typography>
          <TextField
            label="Reason for Rejection"
            fullWidth
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            helperText="This reason will be displayed if the user attempts to sign in."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectDialogUser(null)} sx={{ color: '#64748b' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmReject}
            disabled={actionLoadingId === rejectDialogUser?.id}
            sx={{ fontWeight: 700 }}
          >
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
