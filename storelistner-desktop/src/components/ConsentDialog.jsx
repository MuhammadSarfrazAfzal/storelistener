/**
 * Storelistener Desktop — Recording Consent & Privacy Safeguard Modal (Module 3)
 * File: src/components/ConsentDialog.jsx
 */

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  FormControlLabel,
  Checkbox,
  Alert,
  Stack,
  Box,
  Divider,
  TextField,
} from '@mui/material';
import LegalIcon from '@mui/icons-material/GavelOutlined';
import ShieldIcon from '@mui/icons-material/ShieldOutlined';
import MicIcon from '@mui/icons-material/Mic';

export default function ConsentDialog({
  open,
  onClose,
  onConfirmStart,
  storeName,
}) {
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [consultationTitle, setConsultationTitle] = useState('');

  const handleStart = () => {
    if (!consentConfirmed) return;
    const finalTitle = consultationTitle.trim() || `Customer Consultation — ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    onConfirmStart(finalTitle);
    setConsentConfirmed(false);
    setConsultationTitle('');
  };

  const handleCancel = () => {
    setConsentConfirmed(false);
    setConsultationTitle('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: 'warning.subtleBg',
              color: 'warning.dark',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.2 }}>
              Customer Notice & Consent Safeguard
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              {storeName} • Mandatory Pre-Recording Verification
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 1.5 }}>
        <Alert
          severity="warning"
          icon={<LegalIcon fontSize="small" />}
          sx={{
            mb: 2.5,
            borderRadius: 2,
            fontSize: '0.8125rem',
            lineHeight: 1.45,
          }}
        >
          Customer retail consultations may contain personal or confidential conversation. Before starting audio capture, ensure all participants have been clearly notified that this session will be recorded for sales quality and training.
        </Alert>

        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, fontSize: '0.8125rem' }}>
          Please name this session (optional) and explicitly verify that verbal or written customer consent has been obtained according to store retail policy and regional compliance standards.
        </Typography>

        <TextField
          fullWidth
          size="small"
          label="Conversation Session Title (Optional)"
          placeholder="e.g., iPhone 16 Pro Trade-in & AppleCare Discussion"
          value={consultationTitle}
          onChange={(e) => setConsultationTitle(e.target.value)}
          sx={{ mb: 2.5 }}
        />

        <Divider sx={{ mb: 2 }} />

        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: consentConfirmed ? '#F0FDF4' : '#F8FAFC',
            border: '1px solid',
            borderColor: consentConfirmed ? '#86EFAC' : '#E2E8F0',
            transition: 'all 0.2s ease',
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={consentConfirmed}
                onChange={(e) => setConsentConfirmed(e.target.checked)}
                color="success"
              />
            }
            label={
              <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary' }}>
                I confirm that the customer has been properly notified and that recording consent has been obtained in accordance with store policy and applicable regulations.
              </Typography>
            }
          />
        </Box>

        <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.disabled', fontSize: '0.7rem' }}>
          Notice: This confirmation serves as an operational compliance safeguard. Recording will not capture audio in the background without explicit initiation.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <Button onClick={handleCancel} color="inherit" sx={{ fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={!consentConfirmed}
          onClick={handleStart}
          startIcon={<MicIcon />}
          sx={{
            fontWeight: 700,
            px: 2.5,
            py: 1,
            bgcolor: consentConfirmed ? 'error.main' : undefined,
            '&:hover': {
              bgcolor: consentConfirmed ? 'error.dark' : undefined,
            },
          }}
        >
          Begin Active Recording
        </Button>
      </DialogActions>
    </Dialog>
  );
}
