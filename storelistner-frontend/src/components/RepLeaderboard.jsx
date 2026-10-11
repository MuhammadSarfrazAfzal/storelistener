import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Stack,
  Avatar,
  Box,
  Chip,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
} from '@mui/icons-material';

export default function RepLeaderboard({ leaderboard = [] }) {
  if (!leaderboard || leaderboard.length === 0) return null;

  return (
    <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 3, mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
          <Avatar sx={{ bgcolor: '#fef3c7', color: '#b45309', width: 36, height: 36 }}>
            <TrophyIcon sx={{ fontSize: 20 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
              Store Sales Specialists Leaderboard
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Ranked by deal closure rate and AI pitch conversion score
            </Typography>
          </Box>
        </Stack>

        <Grid container spacing={2}>
          {leaderboard.map((rep, idx) => {
            const isTop = idx === 0;
            return (
              <Grid item xs={12} sm={6} md={4} key={idx}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: isTop ? '#ecfdf5' : '#f8fafc',
                    border: '1px solid',
                    borderColor: isTop ? '#a7f3d0' : '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Avatar
                      sx={{
                        width: 34,
                        height: 34,
                        bgcolor: isTop ? '#059669' : '#e2e8f0',
                        color: isTop ? '#ffffff' : '#334155',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                      }}
                    >
                      {idx + 1}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        {rep.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        {rep.total} sessions • {rep.won} deals
                      </Typography>
                    </Box>
                  </Stack>

                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#059669' }}>
                      {rep.rate}%
                    </Typography>
                    <Chip
                      size="small"
                      label={`${rep.avgScore}/100`}
                      sx={{
                        height: 20,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        bgcolor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                      }}
                    />
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </CardContent>
    </Card>
  );
}
