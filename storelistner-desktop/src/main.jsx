/**
 * Storelistener Desktop — React Entry Point (Module 3 & 4)
 * File: src/main.jsx
 */

import { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, CssBaseline, Box, Typography, Button, Paper } from '@mui/material';

import App from './App';
import desktopTheme from './theme';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ [Storelistener Desktop] Unhandled Runtime Exception:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#F8FAFC',
            p: 3,
          }}
        >
          <Paper
            sx={{
              maxWidth: 600,
              width: '100%',
              p: 4,
              borderRadius: 3,
              border: '1px solid #FECACA',
              bgcolor: '#FFFFFF',
              boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
            }}
          >
            <Typography variant="h6" sx={{ color: '#B91C1C', fontWeight: 700, mb: 1 }}>
              Workstation Application Error
            </Typography>
            <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
              An unexpected error prevented the interface from rendering. Detailed diagnostic information is provided below.
            </Typography>
            <Box
              sx={{
                p: 2,
                bgcolor: '#FEF2F2',
                borderRadius: 2,
                border: '1px solid #FECACA',
                mb: 3,
                fontFamily: 'monospace',
                fontSize: '0.8125rem',
                color: '#991B1B',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {this.state.error?.stack || this.state.error?.toString()}
            </Box>
            <Button
              variant="contained"
              color="primary"
              onClick={() => window.location.reload()}
              sx={{ fontWeight: 600 }}
            >
              Reload Workstation
            </Button>
          </Paper>
        </Box>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider theme={desktopTheme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
);
