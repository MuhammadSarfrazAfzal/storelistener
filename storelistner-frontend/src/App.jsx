import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress, Typography, Avatar } from '@mui/material';

import { storelistenerTheme } from './theme/theme.config';
import AuthView from './components/AuthView';
import StoreAdminDashboard from './components/StoreAdminDashboard';
import SalesManagerDashboard from './components/SalesManagerDashboard';
import OwnerDashboard from './components/dashboard/OwnerDashboard';

const BACKEND_URL = 'http://localhost:5000';

export default function App() {
  const [showOwnerPreview, setShowOwnerPreview] = useState(() => {
    return window.location.hash === '#dashboard' || window.location.hash === '#owner-dashboard';
  });
  const [token, setToken] = useState(() => localStorage.getItem('storelistener_token') || null);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('storelistener_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [checkingAuth, setCheckingAuth] = useState(!!token);

  // Validate token against backend /api/auth/me on mount
  useEffect(() => {
    if (!token) {
      setCheckingAuth(false);
      return;
    }

    fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setCurrentUser(data.user);
          localStorage.setItem('storelistener_user', JSON.stringify(data.user));
        } else {
          // Token invalid, expired, or user not approved
          handleLogout();
        }
      })
      .catch((err) => {
        console.warn('Backend auth check warning:', err.message);
      })
      .finally(() => {
        setCheckingAuth(false);
      });
  }, [token]);

  const handleAuthSuccess = (newToken, user) => {
    setToken(newToken);
    setCurrentUser(user);
    localStorage.setItem('storelistener_token', newToken);
    localStorage.setItem('storelistener_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('storelistener_token');
    localStorage.removeItem('storelistener_user');
  };

  return (
    <ThemeProvider theme={storelistenerTheme}>
      <CssBaseline />
      {checkingAuth ? (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#f8fafc',
            flexDirection: 'column',
          }}
        >
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: '#059669',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              boxShadow: '0 8px 24px rgba(5, 150, 105, 0.25)',
              mb: 2,
              fontSize: '1.75rem',
            }}
          >
            🎙️
          </Avatar>
          <CircularProgress size={32} sx={{ color: '#059669', mb: 2 }} />
          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
            Verifying secure session...
          </Typography>
        </Box>
      ) : showOwnerPreview ? (
        <OwnerDashboard onLogout={() => setShowOwnerPreview(false)} />
      ) : !token || !currentUser ? (
        <AuthView
          onAuthSuccess={handleAuthSuccess}
          onPreviewOwnerDashboard={() => setShowOwnerPreview(true)}
        />
      ) : currentUser.role === 'store_admin' ? (
        <OwnerDashboard onLogout={handleLogout} />
      ) : (
        <SalesManagerDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}
    </ThemeProvider>
  );
}
