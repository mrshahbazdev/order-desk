import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  IconButton,
  Alert
} from '@mui/material';
import {
  People as StaffIcon,
  Timer as SpeedIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  CheckCircle as VerifiedIcon,
  Speed as PerformanceIcon,
  Badge as BadgeIcon
} from '@mui/icons-material';
import { formatDate } from '../utils/formatters';

export default function StaffAnalytics() {
  const [activeTab, setActiveTab] = useState(0); // 0 = Speed & Leaderboard, 1 = Audit Logs, 2 = Staff Profiles
  const [analytics, setAnalytics] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // New Staff Modal
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState('Packer');
  const [empCode, setEmpCode] = useState('');
  const [pinCode, setPinCode] = useState('1234');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stats, logs, staff] = await Promise.all([
        window.api.staff.getAnalytics(),
        window.api.staff.listAuditLogs({ limit: 100 }),
        window.api.staff.listStaff()
      ]);
      setAnalytics(stats || {});
      setAuditLogs(logs || []);
      setStaffMembers(staff || []);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!staffName.trim() || !empCode.trim()) return;

    try {
      await window.api.staff.saveStaff({
        name: staffName,
        role: staffRole,
        employee_code: empCode,
        pin_code: pinCode,
        is_active: 1
      });
      setAlert({ type: 'success', message: `Staff member ${staffName} added successfully.` });
      setStaffModalOpen(false);
      setStaffName('');
      setEmpCode('');
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
            Warehouse Staff & Pack Station Productivity
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Operator shift accountability, packing speed metrics, and parcel verification audit logs
          </Typography>
        </div>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEmpCode(`EMP-${Math.floor(100 + Math.random() * 900)}`);
              setStaffModalOpen(true);
            }}
            sx={{ fontWeight: 800, textTransform: 'none', bgcolor: '#2563eb' }}
          >
            Add Staff Member
          </Button>
        </Stack>
      </Box>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                Total Verified Parcels
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#0f172a' }}>
                {analytics.totalParcelsPacked || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Barcode-verified through Pack Station
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                Average Packing Duration
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#2563eb' }}>
                {analytics.avgDuration || 0}s / order
              </Typography>
              <Typography variant="caption" color="text.secondary">
                From scan start to shipping label print
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                Active Station Operators
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#16a34a' }}>
                {staffMembers.filter(s => s.is_active).length} Members
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Authorized pickers and packers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_e, v) => setActiveTab(v)}
        sx={{ borderBottom: '1px solid #e2e8f0', mb: 3 }}
      >
        <Tab label="Operator Speed & Productivity Ranking" sx={{ fontWeight: 700, textTransform: 'none' }} />
        <Tab label="Parcel Pack Audit Trail" sx={{ fontWeight: 700, textTransform: 'none' }} />
        <Tab label="Staff Directory & Permissions" sx={{ fontWeight: 700, textTransform: 'none' }} />
      </Tabs>

      {/* Tab 0: Leaderboard */}
      {activeTab === 0 && (
        <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 70 }}>Rank</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Operator Name</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Parcels Packed</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Items Handled</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Avg Speed (Seconds / Parcel)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {analytics.operatorLeaderboard?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        No packing shift records logged yet. Complete orders in Pack Station to track staff metrics.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  analytics.operatorLeaderboard?.map((op, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ fontWeight: 800, color: '#64748b' }}>
                        #{idx + 1}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                        {op.staff_name}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${op.parcels_packed} parcels`}
                          size="small"
                          sx={{ fontWeight: 800, bgcolor: '#eff6ff', color: '#2563eb' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={`${op.total_items} items`} size="small" sx={{ fontWeight: 700, bgcolor: '#f8fafc' }} />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        {Math.round(op.avg_duration_sec || 0)}s
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Tab 1: Audit Logs */}
      {activeTab === 1 && (
        <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Order #</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Operator</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Items Packed</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Duration</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Verification</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        No audit logs found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ fontWeight: 700, color: '#2563eb' }}>
                        {log.order_name || `Order #${log.order_id}`}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{log.staff_name}</TableCell>
                      <TableCell align="center">{log.items_packed} item(s)</TableCell>
                      <TableCell align="center">{log.duration_seconds}s</TableCell>
                      <TableCell>
                        <Chip
                          label={log.verification_status.toUpperCase()}
                          size="small"
                          color={log.verification_status === 'verified' ? 'success' : 'warning'}
                          sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>{formatDate(log.completed_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Tab 2: Staff Profiles */}
      {activeTab === 2 && (
        <Grid container spacing={2}>
          {staffMembers.map((s) => (
            <Grid item xs={12} sm={6} md={4} key={s.id}>
              <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <div>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{s.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.employee_code}</Typography>
                    </div>
                    <Chip label={s.role} size="small" color="primary" sx={{ fontWeight: 700 }} />
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 1.5, color: '#64748b', fontSize: '0.8rem' }}>
                    Status: {s.is_active ? 'Active on Floor' : 'Inactive'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add Staff Dialog */}
      <Dialog open={staffModalOpen} onClose={() => setStaffModalOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleCreateStaff}>
          <DialogTitle sx={{ fontWeight: 800 }}>Add Staff Member</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField
                fullWidth
                size="small"
                label="Full Name"
                required
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
              />

              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select
                  value={staffRole}
                  label="Role"
                  onChange={(e) => setStaffRole(e.target.value)}
                >
                  <MenuItem value="Packer">Packer (Pack Station)</MenuItem>
                  <MenuItem value="Picker">Picker (Wave Picking)</MenuItem>
                  <MenuItem value="Supervisor">Supervisor</MenuItem>
                  <MenuItem value="Manager">Warehouse Manager</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                size="small"
                label="Employee Code"
                required
                value={empCode}
                onChange={(e) => setEmpCode(e.target.value)}
              />

              <TextField
                fullWidth
                size="small"
                label="Station Quick PIN"
                type="password"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setStaffModalOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ fontWeight: 800, textTransform: 'none', bgcolor: '#2563eb' }}>
              Save Staff Member
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
