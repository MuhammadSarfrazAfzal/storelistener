/**
 * Storelistener — Reusable Dashboard Topbar Component
 * File: src/components/dashboard/DashboardTopbar.jsx
 */


import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Stack,
  IconButton,
  Avatar,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  NotificationsNoneOutlined as NotificationsIcon,
  VerifiedUserOutlined as OwnerBadgeIcon,
  DataObjectOutlined as MockIcon,
  LogoutOutlined as LogoutIcon,
} from '@mui/icons-material';

export default function DashboardTopbar({
  onToggleMobileSidebar,
  currentSection = 'Store Overview',
  onLogout,
}) {
  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ height: 64, px: { xs: 2, sm: 3 }, justifyContent: 'space-between' }}>
        {/* Left: Mobile Menu Toggle & Breadcrumb */}
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={onToggleMobileSidebar}
            sx={{ display: { md: 'none' }, color: 'text.secondary' }}
            aria-label="open navigation drawer"
          >
            <MenuIcon />
          </IconButton>

          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Dashboard
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                /
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {currentSection}
              </Typography>
            </Stack>
          </Box>
        </Stack>

        {/* Right: Workspace Badge, Mock Data Indicator, Notifications & Owner Identity */}
        <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 1.5 }}>
          {/* Mock Data Indicator */}
          <Tooltip title="Displaying isolated demonstration metrics for UI verification. Backend API integration occurs in subsequent modules.">
            <Chip
              icon={<MockIcon sx={{ fontSize: '14px !important', color: '#B45309 !important' }} />}
              label="Mock Data"
              size="small"
              sx={{
                height: 24,
                fontSize: '0.6875rem',
                fontWeight: 600,
                bgcolor: '#FFFBEB',
                color: '#B45309',
                borderColor: '#FDE68A',
                borderWidth: 1,
                borderStyle: 'solid',
                display: { xs: 'none', sm: 'inline-flex' },
              }}
            />
          </Tooltip>

          {/* Owner Workspace Badge */}
          <Chip
            icon={<OwnerBadgeIcon sx={{ fontSize: '14px !important', color: 'secondary.main !important' }} />}
            label="Owner Workspace"
            size="small"
            sx={{
              height: 24,
              fontSize: '0.6875rem',
              fontWeight: 600,
              bgcolor: '#EFF6FF',
              color: 'secondary.dark',
              borderColor: '#BFDBFE',
              borderWidth: 1,
              borderStyle: 'solid',
            }}
          />

          {/* Honest Notification Icon (No fake count badges) */}
          <Tooltip title="No unread alerts">
            <IconButton
              size="small"
              sx={{
                color: 'text.secondary',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
                p: 0.75,
              }}
              aria-label="notifications"
            >
              <NotificationsIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          {/* Neutral Placeholder Owner Identity */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.25}
            sx={{
              pl: 1,
              borderLeft: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: 1.5,
              }}
            >
              SO
            </Avatar>
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                Store Owner
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6875rem' }}>
                Executive Administrator
              </Typography>
            </Box>
          </Stack>

          {/* Optional Logout / Exit action */}
          {onLogout && (
            <Tooltip title="Sign Out">
              <IconButton
                size="small"
                onClick={onLogout}
                sx={{
                  color: 'text.secondary',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  p: 0.75,
                  '&:hover': { color: 'error.main', bgcolor: '#FEF2F2' },
                }}
                aria-label="sign out"
              >
                <LogoutIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
