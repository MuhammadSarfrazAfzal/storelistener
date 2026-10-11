/**
 * Storelistener — Honest Navigation Placeholder for Upcoming Modules
 * File: src/components/dashboard/NavigationPlaceholder.jsx
 */

import { Card, CardContent, Typography, Box, Button } from '@mui/material';
import {
  Sensors as LiveMonitoringIcon,
  Forum as ConversationsIcon,
  Storefront as StoresIcon,
  BarChart as ReportsIcon,
  Settings as SettingsIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';

const PLACEHOLDER_INFO = {
  'live-monitoring': {
    title: 'Live Monitoring',
    module: 'Module 2',
    icon: LiveMonitoringIcon,
    description: 'Real-time multi-counter audio radar and speech activity monitoring across retail stores. Scheduled for implementation in Module 2.',
  },
  conversations: {
    title: 'Conversation History & Audits',
    module: 'Module 3',
    icon: ConversationsIcon,
    description: 'Archived conversation directory with searchable transcripts, audio recordings, and deal analytics. Scheduled for implementation in Module 3.',
  },
  stores: {
    title: 'Retail Store Management',
    module: 'Module 4',
    icon: StoresIcon,
    description: 'Store configurations, counter workstation assignments, and manager authorization settings.',
  },
  reports: {
    title: 'Sales & Conversion Reports',
    module: 'Module 5',
    icon: ReportsIcon,
    description: 'Executive cross-store conversion analytics, objection breakdown, and rep performance summaries.',
  },
  settings: {
    title: 'Platform Settings',
    module: 'Module 6',
    icon: SettingsIcon,
    description: 'System preferences, speech recognition models, and notification configurations.',
  },
};

export default function NavigationPlaceholder({ sectionId, onBackToDashboard }) {
  const info = PLACEHOLDER_INFO[sectionId] || {
    title: 'Section Under Development',
    module: 'Upcoming Module',
    icon: SettingsIcon,
    description: 'This area is reserved for subsequent implementation modules.',
  };

  const IconComponent = info.icon;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 4 }}>
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <CardContent>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: '#F1F5F9',
              color: 'text.secondary',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <IconComponent sx={{ fontSize: 28 }} />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
            {info.title}
          </Typography>

          <Typography
            variant="caption"
            sx={{
              display: 'inline-block',
              bgcolor: '#EFF6FF',
              color: 'secondary.main',
              fontWeight: 600,
              px: 1.5,
              py: 0.25,
              borderRadius: 1,
              mb: 2,
            }}
          >
            {info.module} Scope
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              maxWidth: 480,
              mx: 'auto',
              lineHeight: 1.6,
              mb: 3,
            }}
          >
            {info.description}
          </Typography>

          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={onBackToDashboard}
            sx={{ fontWeight: 600 }}
          >
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
