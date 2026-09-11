import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
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
  CircularProgress,
  Checkbox,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Layers as WaveIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Print as PrintIcon,
  CheckCircle as DoneIcon,
  LocationOn as LocationIcon,
  Inventory as InventoryIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { formatDate } from '../utils/formatters';

export default function WarehouseWaves() {
  const [activeTab, setActiveTab] = useState(0); // 0 = Wave Picklists, 1 = Rack & Bin Location Manager
  const [waves, setWaves] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // New Wave Session Modal
  const [createWaveOpen, setCreateWaveOpen] = useState(false);
  const [unfulfilledOrders, setUnfulfilledOrders] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [createdBy, setCreatedBy] = useState('Lead Picker');
  const [creatingWave, setCreatingWave] = useState(false);

  // Wave Details Dialog & Picklist Sheet
  const [selectedWaveId, setSelectedWaveId] = useState(null);
  const [waveDetails, setWaveDetails] = useState(null);
  const [waveDetailsOpen, setWaveDetailsOpen] = useState(false);

  // Location Edit State
  const [locationSearch, setLocationSearch] = useState('');
  const [editingVariant, setEditingVariant] = useState(null);
  const [zone, setZone] = useState('A');
  const [rack, setRack] = useState('01');
  const [shelf, setShelf] = useState('1');
  const [bin, setBin] = useState('B-01');

  useEffect(() => {
    loadWaves();
    loadLocations();
  }, []);

  const loadWaves = async () => {
    try {
      setLoading(true);
      const list = await window.api.picking.listWaves();
      setWaves(list || []);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const list = await window.api.picking.listLocations({ search: locationSearch });
      setLocations(list || []);
    } catch (err) {
      console.error(err);
    }
  };

  const openCreateWaveModal = async () => {
    try {
      const res = await window.api.orders.list({ limit: 200, fulfillment_status: 'unfulfilled' });
      const ords = res?.orders || [];
      setUnfulfilledOrders(ords);
      // Select all by default
      setSelectedOrderIds(new Set(ords.slice(0, 50).map(o => o.id)));
      setCreateWaveOpen(true);
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const handleToggleOrder = (id) => {
    const next = new Set(selectedOrderIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedOrderIds(next);
  };

  const handleCreateWave = async () => {
    if (selectedOrderIds.size === 0) return;
    try {
      setCreatingWave(true);
      const res = await window.api.picking.createWave({
        order_ids: Array.from(selectedOrderIds),
        created_by: createdBy
      });
      setAlert({ type: 'success', message: `Wave ${res.wave?.wave_number} generated with ${res.orders?.length} orders.` });
      setCreateWaveOpen(false);
      loadWaves();
    } catch (err) {
      setAlert({ type: 'error', message: `Failed to create wave: ${err.message}` });
    } finally {
      setCreatingWave(false);
    }
  };

  const openWaveDetails = async (waveId) => {
    try {
      setSelectedWaveId(waveId);
      const details = await window.api.picking.getWaveDetails(waveId);
      setWaveDetails(details);
      setWaveDetailsOpen(true);
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const handleUpdateWaveStatus = async (waveId, status) => {
    try {
      const updated = await window.api.picking.updateWaveStatus({ waveId, status });
      setWaveDetails(updated);
      loadWaves();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const handleSaveLocation = async () => {
    if (!editingVariant) return;
    try {
      await window.api.picking.saveLocation({
        variant_id: editingVariant.variant_id,
        zone,
        rack,
        shelf,
        bin
      });
      setAlert({ type: 'success', message: `Updated bin location for ${editingVariant.sku || editingVariant.product_title}` });
      setEditingVariant(null);
      loadLocations();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const printWavePickSheet = () => {
    window.print();
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
            Warehouse Wave Picking & Bin Locations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Consolidated batch item picklists, rack and shelf mapping, and multi-order fulfillment waves
          </Typography>
        </div>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => { loadWaves(); loadLocations(); }}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateWaveModal}
            sx={{ fontWeight: 800, textTransform: 'none', bgcolor: '#2563eb' }}
          >
            Generate Picking Wave
          </Button>
        </Stack>
      </Box>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_e, v) => setActiveTab(v)}
        sx={{ borderBottom: '1px solid #e2e8f0', mb: 3 }}
      >
        <Tab label="Picking Waves & Batches" sx={{ fontWeight: 700, textTransform: 'none' }} />
        <Tab label="Warehouse Rack & Bin Locations" sx={{ fontWeight: 700, textTransform: 'none' }} />
      </Tabs>

      {/* Tab 0: Waves */}
      {activeTab === 0 && (
        <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Wave Number</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Orders Count</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Total Items</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Created By</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Generated Date</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : waves.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        No wave picking sessions found. Click "Generate Picking Wave" to create one.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  waves.map((w) => (
                    <TableRow key={w.id} hover>
                      <TableCell sx={{ fontWeight: 800, color: '#2563eb' }}>
                        {w.wave_number}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={`${w.total_orders} Orders`} size="small" sx={{ fontWeight: 700, bgcolor: '#eff6ff', color: '#2563eb' }} />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={`${w.total_items} Items`} size="small" sx={{ fontWeight: 700, bgcolor: '#f8fafc' }} />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{w.created_by}</TableCell>
                      <TableCell>
                        <Chip
                          label={w.status.toUpperCase()}
                          size="small"
                          color={w.status === 'completed' ? 'success' : w.status === 'in_progress' ? 'primary' : 'default'}
                          sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>{formatDate(w.created_at)}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openWaveDetails(w.id)}
                          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
                        >
                          View Pick Sheet
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Tab 1: Bin Locations */}
      {activeTab === 1 && (
        <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Product Variant Bin & Shelf Directory
            </Typography>
            <TextField
              size="small"
              placeholder="Search product, SKU, bin..."
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadLocations()}
              sx={{ width: 280 }}
            />
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Product Title</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Variant & SKU</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Warehouse Zone</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Rack #</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Shelf #</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Bin Location</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Stock On-Hand</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {locations.map((loc) => (
                  <TableRow key={loc.variant_id} hover>
                    <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>{loc.product_title}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{loc.variant_title || 'Standard'}</Typography>
                      <code style={{ background: '#f8fafc', padding: '2px 4px', borderRadius: 4, fontSize: '0.75rem' }}>{loc.sku || '-'}</code>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={`Zone ${loc.zone}`} size="small" sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }} />
                    </TableCell>
                    <TableCell align="center">Rack {loc.rack}</TableCell>
                    <TableCell align="center">Shelf {loc.shelf}</TableCell>
                    <TableCell align="center">
                      <Chip label={loc.bin} size="small" color="primary" sx={{ fontWeight: 800, height: 22 }} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>{loc.stock} units</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setEditingVariant(loc);
                          setZone(loc.zone);
                          setRack(loc.rack);
                          setShelf(loc.shelf);
                          setBin(loc.bin);
                        }}
                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                      >
                        Set Location
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Create Wave Modal */}
      <Dialog open={createWaveOpen} onClose={() => setCreateWaveOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Generate Consolidated Picking Wave</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select unfulfilled orders to combine into a single consolidated warehouse item picklist:
          </Typography>

          <Box sx={{ maxHeight: 380, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 1 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedOrderIds.size > 0 && selectedOrderIds.size < unfulfilledOrders.length}
                      checked={unfulfilledOrders.length > 0 && selectedOrderIds.size === unfulfilledOrders.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedOrderIds(new Set(unfulfilledOrders.map(o => o.id)));
                        else setSelectedOrderIds(new Set());
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Order #</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Items Count</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Total Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {unfulfilledOrders.map((o) => {
                  const isSelected = selectedOrderIds.has(o.id);
                  return (
                    <TableRow key={o.id} hover selected={isSelected} onClick={() => handleToggleOrder(o.id)}>
                      <TableCell padding="checkbox">
                        <Checkbox checked={isSelected} />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#2563eb' }}>{o.name}</TableCell>
                      <TableCell>{formatDate(o.placed_at)}</TableCell>
                      <TableCell>{o.item_count || 1} item(s)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{o.total_formatted || o.total}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>

          <Stack direction="row" spacing={2} sx={{ mt: 2.5 }} alignItems="center">
            <TextField
              size="small"
              label="Assigned Picker Name"
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              sx={{ width: 260 }}
            />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {selectedOrderIds.size} order(s) selected for batch
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateWaveOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateWave}
            disabled={creatingWave || selectedOrderIds.size === 0}
            sx={{ fontWeight: 800, textTransform: 'none', bgcolor: '#2563eb' }}
          >
            {creatingWave ? <CircularProgress size={20} color="inherit" /> : `Create Wave (${selectedOrderIds.size} Orders)`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Wave Details & Printable Sheet Modal */}
      <Dialog open={waveDetailsOpen} onClose={() => setWaveDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Batch Pick Sheet: {waveDetails?.wave?.wave_number}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Generated for {waveDetails?.orders?.length} orders · {waveDetails?.items?.length} unique items
            </Typography>
          </div>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="contained"
              startIcon={<PrintIcon />}
              onClick={printWavePickSheet}
              sx={{ fontWeight: 700, textTransform: 'none' }}
            >
              Print Pick Sheet
            </Button>
            <IconButton onClick={() => setWaveDetailsOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Bin Location</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Product & Variant</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Qty to Pick</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Included in Orders</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Pick Check</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {waveDetails?.items?.map((it, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>
                      <Chip
                        label={`${it.zone || 'A'}-${it.rack || '01'}-${it.shelf || '1'}-${it.bin || 'B-01'}`}
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 800 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                      {it.title}
                      {it.variant && <Typography variant="caption" display="block" color="text.secondary">{it.variant}</Typography>}
                    </TableCell>
                    <TableCell>
                      <code>{it.sku || '-'}</code>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={`${it.total_qty} units`} size="small" sx={{ fontWeight: 800, bgcolor: '#eff6ff', color: '#2563eb', fontSize: '0.85rem' }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {it.order_names || `${it.order_count} orders`}
                    </TableCell>
                    <TableCell align="center">
                      <Checkbox />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1}>
            {waveDetails?.wave?.status !== 'completed' && (
              <Button
                variant="outlined"
                color="success"
                startIcon={<DoneIcon />}
                onClick={() => handleUpdateWaveStatus(waveDetails.wave.id, 'completed')}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Mark Wave Completed
              </Button>
            )}
          </Stack>
          <Button onClick={() => setWaveDetailsOpen(false)} sx={{ textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Location Dialog */}
      <Dialog open={!!editingVariant} onClose={() => setEditingVariant(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Assign Bin Location</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>{editingVariant?.product_title}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>SKU: {editingVariant?.sku || '-'}</Typography>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Zone (e.g. A)" value={zone} onChange={(e) => setZone(e.target.value)} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Rack (e.g. 01)" value={rack} onChange={(e) => setRack(e.target.value)} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Shelf (e.g. 2)" value={shelf} onChange={(e) => setShelf(e.target.value)} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Bin (e.g. B-04)" value={bin} onChange={(e) => setBin(e.target.value)} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditingVariant(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveLocation} sx={{ fontWeight: 800, textTransform: 'none', bgcolor: '#2563eb' }}>
            Save Location
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
