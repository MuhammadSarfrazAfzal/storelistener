import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Select,
  FormControl,
  Tooltip,
  Badge,
  Stack,
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Work as WorkIcon,
  Logout as LogoutIcon,
  FiberManualRecord as DotIcon,
  Store as StoreIcon,
  Notifications as NotificationsIcon,
  Refresh as RefreshIcon,
  Menu as MenuIcon,
  CheckCircle as VerifiedIcon,
} from '@mui/icons-material';

export default function Header({
  currentUser,
  onLogout,
  stores = [
    { code: 'STORE-NYC-01', name: 'Apple Authorized - 5th Ave' },
    { code: 'STORE-LA-02', name: 'iStore Premium - Beverly Hills' },
    { code: 'STORE-MIA-03', name: 'Apple Hub - Brickell' },
  ],
  selectedStore = 'STORE-NYC-01',
  onSelectStore,
  socketConnected = true,
  onRefresh,
  pendingCount = 0,
  onToggleSidebar,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const isAdmin = currentUser?.role === 'store_admin';

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
        {/* Brand & Mobile Sidebar Toggle */}
        <Stack direction="row" alignItems="center" spacing={1.5}>
          {onToggleSidebar && (
            <IconButton
              onClick={onToggleSidebar}
              size="medium"
              sx={{ color: '#0f172a', display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Avatar
            sx={{
              bgcolor: '#059669',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              width: 42,
              height: 42,
              fontWeight: 800,
              fontSize: '1.25rem',
              boxShadow: '0 4px 10px rgba(5, 150, 105, 0.25)',
            }}
          >
            🎙️
          </Avatar>

          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                }}
              >
                Storelistener
              </Typography>
              <Chip
                label={isAdmin ? 'STORE ADMIN' : 'SALES MANAGER'}
                size="small"
                icon={isAdmin ? <AdminIcon sx={{ fontSize: '14px !important' }} /> : <WorkIcon sx={{ fontSize: '14px !important' }} />}
                sx={{
                  bgcolor: isAdmin ? '#ecfdf5' : '#f0fdf4',
                  color: '#047857',
                  border: '1px solid #a7f3d0',
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  height: 22,
                }}
              />
            </Stack>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
              AI Retail Sales Intelligence & Closing Engine
            </Typography>
          </Box>
        </Stack>

        {/* Right Tools & User Info */}
        <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }}>
          {/* Store Selector */}
          {onSelectStore && (
            <FormControl size="small" sx={{ minWidth: 200, display: { xs: 'none', md: 'block' } }}>
              <Select
                value={selectedStore}
                onChange={(e) => onSelectStore(e.target.value)}
                sx={{
                  height: 36,
                  bgcolor: '#f8fafc',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e2e8f0',
                  },
                }}
                startAdornment={<StoreIcon sx={{ fontSize: 18, mr: 1, color: '#059669' }} />}
              >
                {stores.map((s) => (
                  <MenuItem key={s.code} value={s.code} sx={{ fontSize: '0.85rem' }}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Connection Status */}
          <Tooltip title={socketConnected ? 'Live Real-Time Sync Connected' : 'Connecting to Server...'}>
            <Chip
              icon={
                <DotIcon
                  sx={{
                    fontSize: 12,
                    color: socketConnected ? '#10b981 !important' : '#ef4444 !important',
                    animation: socketConnected ? 'pulse 2s infinite' : 'none',
                  }}
                />
              }
              label={socketConnected ? 'LIVE SYNC' : 'OFFLINE'}
              size="small"
              sx={{
                bgcolor: socketConnected ? '#ecfdf5' : '#fef2f2',
                color: socketConnected ? '#047857' : '#b91c1c',
                border: `1px solid ${socketConnected ? '#a7f3d0' : '#fecaca'}`,
                fontWeight: 700,
                fontSize: '0.7rem',
                height: 26,
              }}
            />
          </Tooltip>

          {/* Refresh Action */}
          {onRefresh && (
            <Tooltip title="Refresh Dashboard Data">
              <IconButton
                size="small"
                onClick={onRefresh}
                sx={{
                  bgcolor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  '&:hover': { bgcolor: '#f1f5f9', color: '#059669' },
                }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* User Profile Chip / Menu Button */}
          <Box>
            <Button
              onClick={handleProfileClick}
              sx={{
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 2,
                px: 1.5,
                py: 0.5,
                textAlign: 'left',
                color: '#0f172a',
                '&:hover': { bgcolor: '#f1f5f9', borderColor: '#cbd5e1' },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.2}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: '#059669',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  {currentUser?.name?.charAt(0) || 'U'}
                </Avatar>
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {currentUser?.name || 'Authorized User'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <VerifiedIcon sx={{ fontSize: 12 }} />
                    {isAdmin ? 'Store Administrator' : 'Verified Manager'}
                  </Typography>
                </Box>
              </Stack>
            </Button>

            <Menu
              anchorEl={anchorEl}
              open={openMenu}
              onClose={handleCloseMenu}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                sx: {
                  mt: 1,
                  minWidth: 220,
                  borderRadius: 3,
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                  border: '1px solid #e2e8f0',
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {currentUser?.name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  {currentUser?.email}
                </Typography>
                <Box sx={{ mt: 0.8 }}>
                  <Chip
                    size="small"
                    label={currentUser?.storeName || 'Store Terminal'}
                    sx={{ bgcolor: '#ecfdf5', color: '#047857', fontSize: '0.7rem' }}
                  />
                </Box>
              </Box>
              <Divider />
              <MenuItem
                onClick={() => {
                  handleCloseMenu();
                  onLogout();
                }}
                sx={{ color: '#ef4444', fontWeight: 600, py: 1 }}
              >
                <ListItemIcon sx={{ color: '#ef4444' }}>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Log Out" />
              </MenuItem>
            </Menu>
          </Box>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
