/**
 * Storelistener — Reusable Dashboard Sidebar Component
 * File: src/components/dashboard/DashboardSidebar.jsx
 */


import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Stack,
  Divider,
  Chip,
} from '@mui/material';
import {
  DashboardOutlined as DashboardIcon,
  SensorsOutlined as LiveMonitoringIcon,
  ForumOutlined as ConversationsIcon,
  StorefrontOutlined as StoresIcon,
  BarChartOutlined as ReportsIcon,
  SettingsOutlined as SettingsIcon,
  GraphicEq as BrandLogoIcon,
} from '@mui/icons-material';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { id: 'live-monitoring', label: 'Live Monitoring', icon: LiveMonitoringIcon },
  { id: 'conversations', label: 'Conversations', icon: ConversationsIcon },
  { id: 'stores', label: 'Stores', icon: StoresIcon },
  { id: 'reports', label: 'Reports', icon: ReportsIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function DashboardSidebar({
  activeNav = 'dashboard',
  onNavigate,
  mobileOpen = false,
  onCloseMobile,
  drawerWidth = 260,
}) {
  const sidebarContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Brand Header */}
      <Box sx={{ px: 2.5, py: 2.25, height: 64, display: 'flex', alignItems: 'center' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.5,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BrandLogoIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: '1.0625rem',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: 'text.primary',
              }}
            >
              Storelistener
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.6875rem' }}>
              Sales Intelligence Platform
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Divider />

      {/* Navigation Links */}
      <Box sx={{ flex: 1, px: 1.5, py: 2 }}>
        <Typography
          variant="caption"
          sx={{
            px: 1.5,
            mb: 1,
            display: 'block',
            fontWeight: 600,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontSize: '0.6875rem',
          }}
        >
          Overview & Operations
        </Typography>

        <List disablePadding>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;

            return (
              <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => {
                    if (onNavigate) onNavigate(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  selected={isActive}
                  sx={{
                    borderRadius: 1.5,
                    py: 1,
                    px: 1.5,
                    color: isActive ? 'secondary.main' : 'text.primary',
                    bgcolor: isActive ? '#F1F5F9' : 'transparent',
                    '&:hover': {
                      bgcolor: isActive ? '#E2E8F0' : '#F8FAFC',
                    },
                    '&.Mui-selected': {
                      bgcolor: '#F1F5F9',
                      fontWeight: 600,
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 32,
                      color: isActive ? 'secondary.main' : 'text.secondary',
                    }}
                  >
                    <Icon sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 500,
                    }}
                  />
                  {item.badge && (
                    <Chip
                      size="small"
                      label={item.badge}
                      sx={{
                        height: 18,
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        bgcolor: '#F1F5F9',
                        color: 'text.secondary',
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Footer Area: System Status */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: '#F8FAFC' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'success.main',
            }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Retail Network Status: Active
          </Typography>
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6875rem', display: 'block', mt: 0.5 }}>
          Module 2 — Live Monitoring Workspace
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile Drawer (Temporary) */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onCloseMobile}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
      >
        {sidebarContent}
      </Drawer>

      {/* Desktop Drawer (Permanent) */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
        open
      >
        {sidebarContent}
      </Drawer>
    </>
  );
}
