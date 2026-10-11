/**
 * Storelistener Desktop — Application Header (Module 3)
 * File: src/components/DesktopHeader.jsx
 */

import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Stack,
  FormControl,
  Select,
  MenuItem,
  Chip,
  Tooltip,
} from '@mui/material';
import BrandLogoIcon from '@mui/icons-material/GraphicEq';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import FolderIcon from '@mui/icons-material/FolderOutlined';
import StoreIcon from '@mui/icons-material/StorefrontOutlined';

export default function DesktopHeader({
  stores = [],
  selectedStoreId,
  onSelectStore,
  microphones = [],
  selectedMicId,
  onSelectMic,
  permissionState,
  isRecording,
  storageDirectory,
}) {
  const currentStore = stores.find((s) => s.id === selectedStoreId) || stores[0];

  return (
    <AppBar
      position="static"
      color="inherit"
      sx={{
        bgcolor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        boxShadow: 'none',
      }}
    >
      <Toolbar sx={{ px: { xs: 2, sm: 3 }, minHeight: 68, justifyContent: 'space-between' }}>
        {/* Brand section */}
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BrandLogoIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: '1.05rem',
                lineHeight: 1.15,
                color: 'text.primary',
                letterSpacing: '-0.02em',
              }}
            >
              Storelistener Desktop
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.72rem' }}>
              Retail Sales Conversation Recorder • Module 3
            </Typography>
          </Box>
        </Stack>

        {/* Central controls: Store Selector & Microphone Selector */}
        <Stack direction="row" spacing={2} alignItems="center">
          {/* Store selector */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <Select
                value={selectedStoreId || ''}
                onChange={(e) => onSelectStore(e.target.value)}
                disabled={isRecording}
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  bgcolor: '#F8FAFC',
                  borderRadius: 1.5,
                  '& .MuiSelect-select': { py: 0.8 },
                }}
              >
                {stores.map((store) => (
                  <MenuItem key={store.id} value={store.id} sx={{ fontSize: '0.8125rem' }}>
                    {store.name} ({store.terminal})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Microphone Selector */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {permissionState === 'denied' ? (
              <MicOffIcon sx={{ fontSize: 18, color: 'error.main' }} />
            ) : (
              <MicIcon sx={{ fontSize: 18, color: isRecording ? 'error.main' : 'text.secondary' }} />
            )}
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <Select
                value={selectedMicId || ''}
                onChange={(e) => onSelectMic(e.target.value)}
                disabled={isRecording || microphones.length === 0}
                displayEmpty
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  bgcolor: '#F8FAFC',
                  borderRadius: 1.5,
                  '& .MuiSelect-select': { py: 0.8 },
                }}
              >
                {microphones.length === 0 ? (
                  <MenuItem value="" disabled sx={{ fontSize: '0.8125rem' }}>
                    Default System Microphone
                  </MenuItem>
                ) : (
                  microphones.map((mic) => (
                    <MenuItem key={mic.deviceId} value={mic.deviceId} sx={{ fontSize: '0.8125rem' }}>
                      {mic.label}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Box>

          {/* Microphone Permission Status Chip */}
          <Chip
            size="small"
            label={
              permissionState === 'granted'
                ? 'Mic Ready'
                : permissionState === 'denied'
                ? 'Mic Denied'
                : 'Mic Standby'
            }
            color={
              permissionState === 'granted'
                ? 'success'
                : permissionState === 'denied'
                ? 'error'
                : 'default'
            }
            sx={{
              height: 24,
              fontSize: '0.6875rem',
              fontWeight: 600,
            }}
          />

          {/* Storage Directory Tooltip */}
          {storageDirectory && (
            <Tooltip title={`Local storage path: ${storageDirectory}`} arrow>
              <Chip
                icon={<FolderIcon sx={{ fontSize: '14px !important' }} />}
                size="small"
                label="Local Storage"
                variant="outlined"
                sx={{
                  height: 24,
                  fontSize: '0.6875rem',
                  fontWeight: 500,
                  borderColor: '#E2E8F0',
                  color: 'text.secondary',
                }}
              />
            </Tooltip>
          )}
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
