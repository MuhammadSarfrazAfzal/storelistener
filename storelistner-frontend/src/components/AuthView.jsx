import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  Stack,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Chip,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  Mail as MailIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Visibility,
  VisibilityOff,
  AdminPanelSettings as AdminIcon,
  Work as ManagerIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassIcon,
  Store as StoreIcon,
  AutoAwesome as SparklesIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';

const BACKEND_URL = 'http://localhost:5000';

const STORE_OPTIONS = [
  { code: 'STORE-NYC-01', name: 'Apple Authorized - 5th Ave' },
  { code: 'STORE-LA-02', name: 'iStore Premium - Beverly Hills' },
  { code: 'STORE-MIA-03', name: 'Apple Hub - Brickell' },
];

export default function AuthView({ onAuthSuccess, onPreviewOwnerDashboard }) {
  const [tab, setTab] = useState(0); // 0 = login, 1 = register
  const [role, setRole] = useState('sales_manager'); // 'store_admin' | 'sales_manager'
  
  // Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [storeCode, setStoreCode] = useState('STORE-NYC-01');

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [pendingDialogUser, setPendingDialogUser] = useState(null);

  const getStoreName = (code) => {
    const found = STORE_OPTIONS.find((s) => s.code === code);
    return found ? found.name : 'Apple Retail Store';
  };

  // Submit Login
  const handleLogin = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.status === 'pending') {
          setPendingDialogUser({ email: email.trim() });
          setErrorMsg('Account pending verification by Store Administrator.');
        } else if (data.status === 'rejected') {
          setErrorMsg(data.error || 'Account registration was rejected by Store Admin.');
        } else {
          setErrorMsg(data.error || 'Invalid email or password.');
        }
        return;
      }

      // Success
      localStorage.setItem('storelistener_token', data.token);
      localStorage.setItem('storelistener_user', JSON.stringify(data.user));
      onAuthSuccess(data.token, data.user);
    } catch (err) {
      setErrorMsg('Cannot connect to authentication server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit Register
  const handleRegister = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          storeCode,
          storeName: getStoreName(storeCode),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Registration failed. Please check your information.');
        return;
      }

      if (data.role === 'store_admin') {
        // Store Admin is verified instantly!
        localStorage.setItem('storelistener_token', data.token);
        localStorage.setItem('storelistener_user', JSON.stringify(data.user));
        onAuthSuccess(data.token, data.user);
      } else {
        // Sales Manager requires verification
        setPendingDialogUser(data.user);
        setSuccessMsg('Account registered successfully! Pending Store Admin approval.');
      }
    } catch (err) {
      setErrorMsg('Cannot connect to backend server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Logins
  const handleQuickDemoLogin = (demoRole) => {
    setErrorMsg('');
    if (demoRole === 'admin') {
      setEmail('admin@store.com');
      setPassword('admin123');
      setTab(0);
    } else {
      setEmail('manager@store.com');
      setPassword('manager123');
      setTab(0);
    }
  };

  return (
    <Box
      disableGutters
      sx={{
        minHeight: '100vh',
        bgcolor: '#f8fafc',
        backgroundImage: 'radial-gradient(at 0% 0%, rgba(16, 185, 129, 0.08) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(5, 150, 105, 0.06) 0px, transparent 50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, sm: 4 },
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 520 }}>
        {/* Header / Brand */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Avatar
            sx={{
              mx: 'auto',
              mb: 1.5,
              width: 58,
              height: 58,
              bgcolor: '#059669',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              boxShadow: '0 8px 24px rgba(5, 150, 105, 0.25)',
              fontSize: '1.75rem',
            }}
          >
            🎙️
          </Avatar>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
            Storelistener
          </Typography>
          <Typography variant="body2" sx={{ color: '#047857', fontWeight: 600, mt: 0.5 }}>
            Enterprise In-Store Speech Intelligence & Deal Closer
          </Typography>
        </Box>

        {/* Main Auth Card */}
        <Card
          sx={{
            borderRadius: 4,
            bgcolor: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.06), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
            overflow: 'hidden',
          }}
        >
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: '#e2e8f0', bgcolor: '#fbfcfd' }}>
            <Tabs
              value={tab}
              onChange={(e, val) => {
                setTab(val);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
            >
              <Tab label="Sign In" sx={{ py: 2, fontWeight: 700 }} />
              <Tab label="Create Account" sx={{ py: 2, fontWeight: 700 }} />
            </Tabs>
          </Box>

          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            {/* Feedback Alerts */}
            {errorMsg && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setErrorMsg('')}>
                {errorMsg}
              </Alert>
            )}
            {successMsg && (
              <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setSuccessMsg('')}>
                {successMsg}
              </Alert>
            )}

            {/* LOGIN FORM */}
            {tab === 0 && (
              <Box component="form" onSubmit={handleLogin}>
                <Stack spacing={2.5}>
                  <TextField
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    fullWidth
                    placeholder="name@store.com"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MailIcon sx={{ color: '#059669', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    fullWidth
                    placeholder="••••••••"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ color: '#059669', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            size="small"
                          >
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={loading}
                    sx={{
                      py: 1.4,
                      fontSize: '1rem',
                      fontWeight: 700,
                    }}
                    endIcon={!loading && <ArrowForwardIcon />}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In to Terminal'}
                  </Button>
                </Stack>
              </Box>
            )}

            {/* REGISTER FORM */}
            {tab === 1 && (
              <Box component="form" onSubmit={handleRegister}>
                <Stack spacing={2.5}>
                  {/* Role Selection */}
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', mb: 1, display: 'block' }}>
                      SELECT ACCOUNT ROLE
                    </Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={6}>
                        <Paper
                          onClick={() => setRole('sales_manager')}
                          sx={{
                            p: 1.5,
                            borderRadius: 2.5,
                            cursor: 'pointer',
                            textAlign: 'center',
                            border: '2px solid',
                            borderColor: role === 'sales_manager' ? '#059669' : '#e2e8f0',
                            bgcolor: role === 'sales_manager' ? '#ecfdf5' : '#ffffff',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <ManagerIcon sx={{ color: role === 'sales_manager' ? '#059669' : '#64748b', fontSize: 28 }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5 }}>
                            Sales Manager
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                            Floor sales & terminal
                          </Typography>
                        </Paper>
                      </Grid>

                      <Grid item xs={6}>
                        <Paper
                          onClick={() => setRole('store_admin')}
                          sx={{
                            p: 1.5,
                            borderRadius: 2.5,
                            cursor: 'pointer',
                            textAlign: 'center',
                            border: '2px solid',
                            borderColor: role === 'store_admin' ? '#059669' : '#e2e8f0',
                            bgcolor: role === 'store_admin' ? '#ecfdf5' : '#ffffff',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <AdminIcon sx={{ color: role === 'store_admin' ? '#059669' : '#64748b', fontSize: 28 }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5 }}>
                            Store Admin
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                            Full store control
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>

                    {role === 'sales_manager' ? (
                      <Alert severity="info" sx={{ mt: 1.5, py: 0.5, borderRadius: 2, fontSize: '0.78rem' }}>
                        🛡️ Sales Manager accounts require Store Admin approval before login.
                      </Alert>
                    ) : (
                      <Alert severity="success" sx={{ mt: 1.5, py: 0.5, borderRadius: 2, fontSize: '0.78rem' }}>
                        👑 Store Admins are verified instantly upon registration.
                      </Alert>
                    )}
                  </Box>

                  <TextField
                    label="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    fullWidth
                    placeholder="e.g. Alex Morgan"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon sx={{ color: '#059669', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    fullWidth
                    placeholder="alex@store.com"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MailIcon sx={{ color: '#059669', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    fullWidth
                    placeholder="Create a strong password"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ color: '#059669', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            size="small"
                          >
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <FormControl fullWidth>
                    <InputLabel id="store-select-label">Store Location</InputLabel>
                    <Select
                      labelId="store-select-label"
                      value={storeCode}
                      label="Store Location"
                      onChange={(e) => setStoreCode(e.target.value)}
                      startAdornment={
                        <InputAdornment position="start">
                          <StoreIcon sx={{ color: '#059669', fontSize: 20 }} />
                        </InputAdornment>
                      }
                    >
                      {STORE_OPTIONS.map((s) => (
                        <MenuItem key={s.code} value={s.code}>
                          {s.name} ({s.code})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={loading}
                    sx={{
                      py: 1.4,
                      fontSize: '1rem',
                      fontWeight: 700,
                    }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Register Account'}
                  </Button>
                </Stack>
              </Box>
            )}

            <Divider sx={{ my: 3 }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                ONE-CLICK DEMO ACCOUNTS
              </Typography>
            </Divider>

            {/* Quick Demo Credentials */}
            <Stack direction="row" spacing={1.5} justifyContent="center">
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleQuickDemoLogin('admin')}
                startIcon={<AdminIcon />}
                sx={{
                  borderColor: '#a7f3d0',
                  color: '#047857',
                  bgcolor: '#f0fdf4',
                  '&:hover': { bgcolor: '#ecfdf5', borderColor: '#059669' },
                }}
              >
                Store Admin
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleQuickDemoLogin('manager')}
                startIcon={<ManagerIcon />}
                sx={{
                  borderColor: '#a7f3d0',
                  color: '#047857',
                  bgcolor: '#f0fdf4',
                  '&:hover': { bgcolor: '#ecfdf5', borderColor: '#059669' },
                }}
              >
                Sales Manager
              </Button>
            </Stack>

            {onPreviewOwnerDashboard && (
              <Box sx={{ mt: 2.5, textAlign: 'center', pt: 1.5, borderTop: '1px solid #f1f5f9' }}>
                <Button
                  size="small"
                  variant="text"
                  onClick={onPreviewOwnerDashboard}
                  sx={{ color: 'text.secondary', fontSize: '0.8125rem', fontWeight: 600 }}
                >
                  Preview Owner Dashboard (Module 1 Foundation) →
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* PENDING APPROVAL DIALOG FOR SALES MANAGERS */}
      <Dialog
        open={Boolean(pendingDialogUser)}
        onClose={() => setPendingDialogUser(null)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            maxWidth: 440,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HourglassIcon sx={{ color: '#f59e0b', fontSize: 26 }} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Verification Pending
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
            Your Sales Manager account has been registered, but requires verification from an authorized <strong>Store Admin</strong> before you can log in.
          </Typography>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            Store Admins receive a real-time notification on their dashboard and can approve your access right away.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setPendingDialogUser(null)}
            variant="contained"
            fullWidth
            sx={{ fontWeight: 700 }}
          >
            Understood
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
