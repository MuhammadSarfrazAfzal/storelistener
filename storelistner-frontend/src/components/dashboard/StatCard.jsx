/**
 * Storelistener — Reusable KPI StatCard Component
 * File: src/components/dashboard/StatCard.jsx
 */


import { Card, CardContent, Typography, Box, Stack } from '@mui/material';
import {
  Hearing as HearingIcon,
  Forum as ForumIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassIcon,
  Assessment as DefaultIcon,
} from '@mui/icons-material';

const ICON_MAP = {
  Hearing: HearingIcon,
  Forum: ForumIcon,
  CheckCircle: CheckCircleIcon,
  HourglassEmpty: HourglassIcon,
};

export default function StatCard({
  label,
  value,
  supportingText,
  iconName = 'Assessment',
  category = 'default',
}) {
  const IconComponent = ICON_MAP[iconName] || DefaultIcon;

  // Semantic icon tone mapping according to theme tokens
  const getCategoryStyles = (theme) => {
    switch (category) {
      case 'live':
        return {
          color: theme.palette.secondary.main,
          bg: '#EFF6FF',
        };
      case 'success':
        return {
          color: theme.palette.success.main,
          bg: theme.palette.success.subtleBg || '#F0FDF4',
        };
      case 'warning':
        return {
          color: theme.palette.warning.main,
          bg: theme.palette.warning.subtleBg || '#FFFBEB',
        };
      default:
        return {
          color: theme.palette.text.primary,
          bg: '#F1F5F9',
        };
    }
  };

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
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'block',
              }}
            >
              {label}
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                mt: 0.5,
                lineHeight: 1.2,
              }}
            >
              {value}
            </Typography>
          </Box>

          <Box
            sx={(theme) => {
              const styles = getCategoryStyles(theme);
              return {
                width: 40,
                height: 40,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: styles.bg,
                color: styles.color,
                flexShrink: 0,
              };
            }}
          >
            <IconComponent sx={{ fontSize: 22 }} />
          </Box>
        </Stack>

        {supportingText && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 1.5,
              color: 'text.secondary',
              fontWeight: 500,
            }}
          >
            {supportingText}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
