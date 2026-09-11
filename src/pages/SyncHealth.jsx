import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Sync as SyncIcon,
  Refresh as RefreshIcon,
  Replay as RetryIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Send as SendIcon,
  Code as CodeIcon,
  Close as CloseIcon,
  CloudSync as CloudSyncIcon
} from '@mui/icons-material';
import { formatDate, getStatusColor } from '../utils/formatters';

export default function SyncHealth() {
  const [activeTab, setActiveTab] = useState(0); // 0 = Outbox Queue, 1 = Sync Logs
  const [outboxJobs, setOutboxJobs] = useState([]);
  const [outboxStats, setOutboxStats] = useState({ pending: 0, processing: 0, failed: 0, done: 0 });
  const [syncLogs, setSyncLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Inspector Dialog
  const [inspectItem, setInspectItem] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [jobs, stats, logs] = await Promise.all([
        window.api.sync.getOutboxJobs({ limit: 100, status: statusFilter === 'all' ? null : statusFilter }),
        window.api.sync.getOutboxStats(),
        window.api.sync.getLogs(100)
      ]);
      setOutboxJobs(jobs || []);
      setOutboxStats(stats || { pending: 0, processing: 0, failed: 0, done: 0 });
      setSyncLogs(logs || []);
    } catch (err) {
      console.error('Failed to load sync health data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubOutbox = window.api.on('outbox:stats', (stats) => {
      setOutboxStats(stats);
      loadData();
    });

    const unsubStatus = window.api.on('sync:status', () => {
      loadData();
    });

    const unsubComplete = window.api.on('sync:complete', () => {
      loadData();
    });

    return () => {
      unsubOutbox();
      unsubStatus();
      unsubComplete();
    };
  }, [statusFilter]);

  const handleFlushOutbox = async () => {
    try {
      setActionLoading(true);
      setAlert({ type: 'info', message: 'Processing outbox queue to remote channels...' });
      const stats = await window.api.sync.flushOutbox();
      if (stats) setOutboxStats(stats);
      setAlert({ type: 'success', message: 'Outbox queue processed successfully!' });
      loadData();
    } catch (err) {
      setAlert({ type: 'error', message: 'Flush failed: ' + err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryAllFailed = async () => {
    try {
      setActionLoading(true);
      await window.api.sync.retryAllFailed();
      setAlert({ type: 'success', message: 'All failed jobs requeued for immediate dispatch!' });
      loadData();
    } catch (err) {
      setAlert({ type: 'error', message: 'Retry all failed: ' + err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncAllStores = async () => {
    try {
      setActionLoading(true);
      setAlert({ type: 'info', message: 'Triggering full pull sync across all connected stores...' });
      await window.api.sync.triggerAll();
      setAlert({ type: 'success', message: 'Stores pulled and synchronized!' });
      loadData();
    } catch (err) {
      setAlert({ type: 'error', message: 'Sync error: ' + err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryJob = async (id) => {
    try {
      await window.api.sync.retryOutboxJob(id);
      setAlert({ type: 'success', message: `Queued job #${id} for immediate retry!` });
      loadData();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const handleDeleteJob = async (id) => {
    try {
      await window.api.sync.deleteOutboxJob(id);
      setAlert({ type: 'info', message: `Removed job #${id}` });
      loadData();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const handleClearLogs = async () => {
    try {
      await window.api.sync.clearLogs();
      setAlert({ type: 'info', message: 'Sync logs cleared.' });
      loadData();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
            Sync Health & Outbox
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor offline write queue (Outbox) and background sync logs
          </Typography>
        </div>

        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            sx={{ bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}
            startIcon={<CloudSyncIcon />}
            onClick={handleSyncAllStores}
            disabled={actionLoading}
          >
            Sync All Stores
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<SendIcon />}
            onClick={handleFlushOutbox}
            disabled={actionLoading || outboxStats.pending === 0}
          >
            Process Outbox ({outboxStats.pending})
          </Button>
          {outboxStats.failed > 0 && (
            <Button
              variant="contained"
              color="error"
              startIcon={<RetryIcon />}
              onClick={handleRetryAllFailed}
              disabled={actionLoading}
            >
              Retry Failed ({outboxStats.failed})
            </Button>
          )}
        </Stack>
      </Box>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 2 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Outbox Status Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              bgcolor: statusFilter === 'pending' ? '#fffbeb' : '#ffffff'
            }}
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                PENDING OUTBOX
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#d97706', mt: 0.5 }}>
                {outboxStats.pending}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              bgcolor: statusFilter === 'processing' ? '#eff6ff' : '#ffffff'
            }}
            onClick={() => setStatusFilter(statusFilter === 'processing' ? 'all' : 'processing')}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                IN PROCESSING
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#2563eb', mt: 0.5 }}>
                {outboxStats.processing}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              bgcolor: statusFilter === 'failed' ? '#fef2f2' : '#ffffff'
            }}
            onClick={() => setStatusFilter(statusFilter === 'failed' ? 'all' : 'failed')}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                FAILED / RETRYING
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#dc2626', mt: 0.5 }}>
                {outboxStats.failed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              bgcolor: statusFilter === 'done' ? '#f0fdf4' : '#ffffff'
            }}
            onClick={() => setStatusFilter(statusFilter === 'done' ? 'all' : 'done')}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                SUCCESSFULLY PUSHED
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#16a34a', mt: 0.5 }}>
                {outboxStats.done}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs & Filters */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Tabs value={activeTab} onChange={(_e, val) => setActiveTab(val)}>
          <Tab label={`Outbox Queue (${outboxJobs.length})`} />
          <Tab label={`Sync Audit Logs (${syncLogs.length})`} />
        </Tabs>

        {activeTab === 0 && (
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filter Status</InputLabel>
            <Select
              value={statusFilter}
              label="Filter Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Outbox ({outboxJobs.length})</MenuItem>
              <MenuItem value="pending">Pending ({outboxStats.pending})</MenuItem>
              <MenuItem value="processing">Processing ({outboxStats.processing})</MenuItem>
              <MenuItem value="failed">Failed ({outboxStats.failed})</MenuItem>
              <MenuItem value="done">Done ({outboxStats.done})</MenuItem>
            </Select>
          </FormControl>
        )}
      </Box>

      {activeTab === 0 ? (
        /* Outbox Table */
        <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Job ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Kind</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Store</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Attempts</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Error / Message</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Next Try</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={28} />
                    </TableCell>
                  </TableRow>
                ) : outboxJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        Outbox is currently empty for the selected filter.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  outboxJobs.map((job) => {
                    const stStyle = getStatusColor(job.status);
                    return (
                      <TableRow key={job.id} hover sx={{ cursor: 'pointer' }} onClick={() => setInspectItem({ type: 'outbox', data: job })}>
                        <TableCell sx={{ fontWeight: 700 }}>#{job.id}</TableCell>
                        <TableCell>
                          <code>{job.kind}</code>
                        </TableCell>
                        <TableCell>{job.store_label}</TableCell>
                        <TableCell>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              backgroundColor: stStyle.bg,
                              color: stStyle.text,
                              border: `1px solid ${stStyle.border}`
                            }}
                          >
                            {job.status}
                          </span>
                        </TableCell>
                        <TableCell align="center">{job.attempts || 0}</TableCell>
                        <TableCell sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Typography variant="caption" color={job.error ? 'error.main' : 'text.secondary'}>
                            {job.error || 'Ready for remote push'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {job.next_try_at ? formatDate(job.next_try_at) : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            {job.status !== 'done' && (
                              <Tooltip title="Retry Now">
                                <IconButton size="small" color="primary" onClick={() => handleRetryJob(job.id)}>
                                  <RetryIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Inspect Payload">
                              <IconButton size="small" onClick={() => setInspectItem({ type: 'outbox', data: job })}>
                                <CodeIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Job">
                              <IconButton size="small" color="error" onClick={() => handleDeleteJob(job.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      ) : (
        /* Sync Logs Table */
        <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'flex-end', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <Button size="small" color="error" onClick={handleClearLogs}>
              Clear Logs
            </Button>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Store</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Resource</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Message</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Inspect</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {syncLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">No sync logs recorded yet.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  syncLogs.map((log) => (
                    <TableRow key={log.id} hover sx={{ cursor: 'pointer' }} onClick={() => setInspectItem({ type: 'log', data: log })}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(log.created_at)}</TableCell>
                      <TableCell>{log.store_label || 'All'}</TableCell>
                      <TableCell><Chip label={log.resource} size="small" sx={{ height: 18, fontSize: '0.65rem' }} /></TableCell>
                      <TableCell>
                        <Chip
                          label={log.type}
                          size="small"
                          color={log.type === 'error' ? 'error' : (log.type === 'push' ? 'primary' : 'default')}
                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>{log.message}</TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <IconButton size="small" onClick={() => setInspectItem({ type: 'log', data: log })}>
                          <CodeIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Payload / Details Inspector Modal */}
      <Dialog
        open={Boolean(inspectItem)}
        onClose={() => setInspectItem(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {inspectItem?.type === 'outbox' ? `Outbox Job #${inspectItem?.data?.id} (${inspectItem?.data?.kind})` : `Sync Audit Log #${inspectItem?.data?.id}`}
          </Typography>
          <IconButton onClick={() => setInspectItem(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {inspectItem && (
            <Stack spacing={2}>
              {inspectItem.data.error && (
                <Alert severity="error">
                  <strong>Error:</strong> {inspectItem.data.error}
                </Alert>
              )}
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Raw Payload & Metadata:</Typography>
              <Box
                component="pre"
                sx={{
                  p: 2,
                  bgcolor: '#0f172a',
                  color: '#38bdf8',
                  borderRadius: 2,
                  overflowX: 'auto',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace'
                }}
              >
                {JSON.stringify(
                  inspectItem.type === 'outbox'
                    ? {
                        id: inspectItem.data.id,
                        store_id: inspectItem.data.store_id,
                        store_label: inspectItem.data.store_label,
                        kind: inspectItem.data.kind,
                        status: inspectItem.data.status,
                        attempts: inspectItem.data.attempts,
                        next_try_at: inspectItem.data.next_try_at,
                        payload: (() => {
                          try { return JSON.parse(inspectItem.data.payload); } catch { return inspectItem.data.payload; }
                        })(),
                        error: inspectItem.data.error
                      }
                    : inspectItem.data,
                  null,
                  2
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          {inspectItem?.type === 'outbox' && inspectItem.data.status !== 'done' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<RetryIcon />}
              onClick={() => {
                handleRetryJob(inspectItem.data.id);
                setInspectItem(null);
              }}
            >
              Retry Now
            </Button>
          )}
          <Button onClick={() => setInspectItem(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
