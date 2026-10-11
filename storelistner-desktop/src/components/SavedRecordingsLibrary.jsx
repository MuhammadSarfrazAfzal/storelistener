/**
 * Storelistener Desktop — Saved Recordings Library (Module 3)
 * File: src/components/SavedRecordingsLibrary.jsx
 */

import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import PlayIcon from '@mui/icons-material/PlayArrow';
import AudioFileIcon from '@mui/icons-material/AudioFileOutlined';
import TimeIcon from '@mui/icons-material/AccessTime';
import SizeIcon from '@mui/icons-material/Storage';
import StoreIcon from '@mui/icons-material/StorefrontOutlined';
import DescriptionIcon from '@mui/icons-material/DescriptionOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTimestamp(isoString) {
  try {
    const d = new Date(isoString);
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return isoString;
  }
}

export default function SavedRecordingsLibrary({
  recordings = [],
  stores = [],
  onDeleteRecording,
  onLoadAudioDataUrl,
  onLoadTranscript,
}) {
  const [activePlaybackId, setActivePlaybackId] = useState(null);
  const [activeAudioUrl, setActiveAudioUrl] = useState(null);
  const [loadingAudioId, setLoadingAudioId] = useState(null);

  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [viewingTranscriptRec, setViewingTranscriptRec] = useState(null);
  const [transcriptData, setTranscriptData] = useState(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  const handleOpenTranscript = async (rec) => {
    setViewingTranscriptRec(rec);
    setLoadingTranscript(true);
    setCopiedTranscript(false);
    try {
      let rawResult = null;
      if (onLoadTranscript) {
        rawResult = await onLoadTranscript(rec.recordingId);
      } else if (window.electronAPI && window.electronAPI.getTranscript) {
        rawResult = await window.electronAPI.getTranscript(rec.recordingId);
      }

      if (rawResult && rawResult.transcript) {
        setTranscriptData(rawResult.transcript);
      } else if (rawResult && Array.isArray(rawResult.segments)) {
        setTranscriptData(rawResult);
      } else if (Array.isArray(rawResult)) {
        setTranscriptData({ segments: rawResult, segmentCount: rawResult.length });
      } else {
        setTranscriptData(null);
      }
    } catch (err) {
      console.error('Failed to load transcript:', err);
      setTranscriptData(null);
    } finally {
      setLoadingTranscript(false);
    }
  };

  const handleCopyTranscript = () => {
    if (!transcriptData || !Array.isArray(transcriptData.segments)) return;
    const fullText = transcriptData.segments
      .map((s) => `[${s.speaker != null ? `Speaker ${s.speaker}` : 'Speaker'}] ${s.text}`)
      .join('\n');
    navigator.clipboard.writeText(fullText);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const handlePlay = async (recId) => {
    if (activePlaybackId === recId) {
      // Toggle off
      setActivePlaybackId(null);
      setActiveAudioUrl(null);
      return;
    }

    setLoadingAudioId(recId);
    try {
      const url = await onLoadAudioDataUrl(recId);
      if (url) {
        setActivePlaybackId(recId);
        setActiveAudioUrl(url);
      }
    } finally {
      setLoadingAudioId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await onDeleteRecording(deleteTargetId);
      if (activePlaybackId === deleteTargetId) {
        setActivePlaybackId(null);
        setActiveAudioUrl(null);
      }
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  };

  const getStoreName = (storeId) => {
    const s = stores.find((store) => store.id === storeId);
    return s ? s.name : storeId;
  };

  return (
    <Card sx={{ bgcolor: '#FFFFFF', borderRadius: 3, border: '1px solid #E2E8F0', mt: 3 }}>
      <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
              Local Workstation Recordings
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
              Persisted audio files stored securely in application storage.
            </Typography>
          </Box>
          <Chip
            size="small"
            label={`${recordings.length} Saved Audio File${recordings.length === 1 ? '' : 's'}`}
            sx={{ fontWeight: 600, bgcolor: '#F1F5F9', color: 'text.secondary' }}
          />
        </Stack>

        <Divider sx={{ mb: 2.5 }} />

        {/* Empty State */}
        {recordings.length === 0 ? (
          <Box
            sx={{
              py: 6,
              px: 2,
              textAlign: 'center',
              bgcolor: '#F8FAFC',
              borderRadius: 2,
              border: '1px dashed #CBD5E1',
            }}
          >
            <AudioFileIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              No Saved Recordings Yet
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 440, mx: 'auto', fontSize: '0.8125rem' }}>
              Completed customer conversation recordings from this counter terminal will be saved locally and indexed here for review and playback.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {recordings.map((rec) => {
              const isPlaying = activePlaybackId === rec.recordingId;
              const isLoading = loadingAudioId === rec.recordingId;

              return (
                <Box
                  key={rec.recordingId}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: isPlaying ? 'secondary.main' : '#E2E8F0',
                    bgcolor: isPlaying ? '#F8FAFC' : '#FFFFFF',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                    spacing={2}
                  >
                    {/* Recording info */}
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                          {rec.title}
                        </Typography>
                        <Chip
                          icon={<StoreIcon sx={{ fontSize: '13px !important' }} />}
                          size="small"
                          label={getStoreName(rec.storeId)}
                          sx={{
                            height: 22,
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            bgcolor: '#EFF6FF',
                            color: 'secondary.dark',
                          }}
                        />
                      </Stack>

                      {/* Metadata tags */}
                      <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <TimeIcon sx={{ fontSize: 13 }} />
                          {formatTimestamp(rec.startedAt)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          Duration: <strong>{formatDuration(rec.durationSeconds)}</strong>
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <SizeIcon sx={{ fontSize: 13 }} />
                          {formatFileSize(rec.fileSizeBytes)}
                        </Typography>
                      </Stack>
                    </Box>

                    {/* Actions */}
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        startIcon={<DescriptionIcon />}
                        onClick={() => handleOpenTranscript(rec)}
                        sx={{ fontWeight: 600, fontSize: '0.8125rem' }}
                      >
                        Transcript
                      </Button>

                      <Button
                        size="small"
                        variant={isPlaying ? 'contained' : 'outlined'}
                        color={isPlaying ? 'secondary' : 'inherit'}
                        startIcon={isLoading ? <CircularProgress size={14} color="inherit" /> : <PlayIcon />}
                        disabled={isLoading}
                        onClick={() => handlePlay(rec.recordingId)}
                        sx={{ fontWeight: 600, fontSize: '0.8125rem' }}
                      >
                        {isPlaying ? 'Close Player' : 'Play Audio'}
                      </Button>

                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteTargetId(rec.recordingId)}
                        title="Delete recording file"
                        sx={{
                          border: '1px solid #FECACA',
                          bgcolor: '#FEF2F2',
                          '&:hover': { bgcolor: '#FEE2E2' },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>

                  {/* Inline Audio Player */}
                  {isPlaying && activeAudioUrl && (
                    <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid #E2E8F0' }}>
                      <audio
                        controls
                        autoPlay
                        src={activeAudioUrl}
                        style={{ width: '100%', height: '38px', borderRadius: '6px' }}
                      />
                    </Box>
                  )}
                </Box>
              );
            })}
          </Stack>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={Boolean(deleteTargetId)}
          onClose={() => setDeleteTargetId(null)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2.5, p: 1 } }}
        >
          <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
            Delete Local Recording?
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
              Are you sure you want to permanently delete this audio recording from the workstation? This file will be removed from local disk storage and cannot be restored.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDeleteTargetId(null)} color="inherit" disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              sx={{ fontWeight: 600 }}
            >
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Transcript Inspection Dialog (Module 4) */}
        <Dialog
          open={Boolean(viewingTranscriptRec)}
          onClose={() => setViewingTranscriptRec(null)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2.5, p: 1 } }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  Session Transcript: {viewingTranscriptRec?.title}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Recording ID: <code>{viewingTranscriptRec?.recordingId}</code> •{' '}
                  {viewingTranscriptRec && formatTimestamp(viewingTranscriptRec.startedAt)}
                </Typography>
              </Box>
              {transcriptData?.provider && (
                <Chip
                  size="small"
                  label={`Provider: ${transcriptData.provider} (${transcriptData.model || 'nova-3'})`}
                  sx={{
                    bgcolor: '#EFF6FF',
                    color: '#1D4ED8',
                    border: '1px solid #BFDBFE',
                    fontWeight: 600,
                    fontSize: '0.6875rem',
                  }}
                />
              )}
            </Stack>
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ py: 2.5 }}>
            {loadingTranscript ? (
              <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" sx={{ py: 6 }}>
                <CircularProgress size={24} color="secondary" />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Loading saved transcript from workstation storage...
                </Typography>
              </Stack>
            ) : !transcriptData || !Array.isArray(transcriptData.segments) || transcriptData.segments.length === 0 ? (
              <Box sx={{ py: 5, textAlign: 'center' }}>
                <DescriptionIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                  No Transcript Stored for this Recording
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 420, mx: 'auto', fontSize: '0.8125rem' }}>
                  This recording session was saved without a finalized transcript. This occurs if speech-to-text was not
                  configured at the time of recording or if no speech was detected.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {transcriptData.segments.map((seg, idx) => (
                  <Box
                    key={seg.segmentId || `stored-seg-${idx}`}
                    sx={{
                      p: 1.5,
                      bgcolor: '#F8FAFC',
                      borderRadius: 2,
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Chip
                        size="small"
                        label={seg.speaker !== undefined && seg.speaker !== null ? `Speaker ${seg.speaker}` : 'Speaker'}
                        sx={{
                          height: 20,
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          bgcolor: '#E2E8F0',
                          color: '#334155',
                        }}
                      />
                      {seg.startTime != null && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                          [{Math.floor(seg.startTime / 60)}:{(Math.floor(seg.startTime % 60)).toString().padStart(2, '0')}]
                        </Typography>
                      )}
                    </Stack>
                    <Typography variant="body2" sx={{ color: '#0F172A', fontWeight: 500, lineHeight: 1.5 }}>
                      {seg.text}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </DialogContent>
          <Divider />
          <DialogActions sx={{ px: 3, py: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {transcriptData?.segments?.length
                  ? `${transcriptData.segments.length} segment${transcriptData.segments.length === 1 ? '' : 's'} recorded`
                  : ''}
              </Typography>
              <Stack direction="row" spacing={1.5}>
                {transcriptData?.segments?.length > 0 && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ContentCopyIcon />}
                    onClick={handleCopyTranscript}
                    sx={{ fontWeight: 600 }}
                  >
                    {copiedTranscript ? 'Copied!' : 'Copy Transcript'}
                  </Button>
                )}
                <Button onClick={() => setViewingTranscriptRec(null)} color="inherit">
                  Close
                </Button>
              </Stack>
            </Stack>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}
