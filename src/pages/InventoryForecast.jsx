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
  CircularProgress,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import {
  TrendingDown as DepletionIcon,
  ShoppingBag as PoIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as HealthyIcon,
  MoveToInbox as ReceiveIcon
} from '@mui/icons-material';
import { formatMoney, formatDate } from '../utils/formatters';

export default function InventoryForecast() {
  const [activeTab, setActiveTab] = useState(0); // 0 = Runout Days & Reorder Alerts, 1 = Supplier Purchase Orders
  const [forecastItems, setForecastItems] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // New Purchase Order Modal
  const [poOpen, setPoOpen] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState([
    { item_title: '', sku: '', qty_ordered: 50, unit_cost: 150000 }
  ]);
  const [creatingPo, setCreatingPo] = useState(false);

  // Stock Receiving Dialog
  const [selectedPo, setSelectedPo] = useState(null);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receiptInputs, setReceiptInputs] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [forecast, pos] = await Promise.all([
        window.api.forecasting.getInventoryForecast({ daysLookback: 30 }),
        window.api.forecasting.listPurchaseOrders()
      ]);
      setForecastItems(forecast || []);
      setPurchaseOrders(pos || []);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePo = async (e) => {
    e.preventDefault();
    if (!supplierName.trim()) return;

    try {
      setCreatingPo(true);
      await window.api.forecasting.createPurchaseOrder({
        supplier_name: supplierName,
        supplier_email: supplierEmail,
        supplier_phone: supplierPhone,
        expected_delivery: expectedDate,
        notes: poNotes,
        items: poItems
      });

      setAlert({ type: 'success', message: 'Supplier Purchase Order created successfully.' });
      setPoOpen(false);
      setSupplierName('');
      setSupplierEmail('');
      setSupplierPhone('');
      setPoNotes('');
      loadData();
    } catch (err) {
      setAlert({ type: 'error', message: `PO error: ${err.message}` });
    } finally {
      setCreatingPo(false);
    }
  };

  const openReceiveModal = (po) => {
    setSelectedPo(po);
    const initial = {};
    (po.items || []).forEach(it => {
      const remaining = Math.max(0, it.qty_ordered - it.qty_received);
      initial[it.id] = remaining;
    });
    setReceiptInputs(initial);
    setReceiveModalOpen(true);
  };

  const handleConfirmReceiveStock = async () => {
    if (!selectedPo) return;
    try {
      const itemReceipts = Object.entries(receiptInputs).map(([itemId, qty]) => ({
        item_id: parseInt(itemId, 10),
        qty_received: parseInt(qty, 10) || 0
      }));

      await window.api.forecasting.receiveStock({
        poId: selectedPo.id,
        itemReceipts
      });

      setAlert({ type: 'success', message: `Stock received & inventory updated for ${selectedPo.po_number}` });
      setReceiveModalOpen(false);
      loadData();
    } catch (err) {
      setAlert({ type: 'error', message: `Receive error: ${err.message}` });
    }
  };

  const criticalOutCount = forecastItems.filter(i => i.reorderStatus === 'critical_out').length;
  const reorderNowCount = forecastItems.filter(i => i.reorderStatus === 'reorder_now').length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
            Inventory Velocity & Smart Reordering
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sales burn-rate forecasting, stock depletion countdowns, and supplier purchase orders
          </Typography>
        </div>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Refresh Forecast
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setPoOpen(true)}
            sx={{ fontWeight: 800, textTransform: 'none', bgcolor: '#2563eb' }}
          >
            Create Purchase Order
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
                Out of Stock (Stockout)
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#dc2626' }}>
                {criticalOutCount} Items
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Zero units available for sale
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                Urgent Reorder Needed
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#d97706' }}>
                {reorderNowCount} Items
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Depletes within 7 days at current speed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                Active Supplier POs
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#2563eb' }}>
                {purchaseOrders.filter(p => p.status !== 'received').length} Orders
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Awaiting factory / warehouse delivery
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
        <Tab label="Stock Depletion Days & Reorder Suggestions" sx={{ fontWeight: 700, textTransform: 'none' }} />
        <Tab label="Supplier Purchase Orders (PO)" sx={{ fontWeight: 700, textTransform: 'none' }} />
      </Tabs>

      {/* Tab 0: Forecast Table */}
      {activeTab === 0 && (
        <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Product Title</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Stock On-Hand</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Sales Velocity (30d)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Days of Stock Left</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Recommended PO Qty</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : forecastItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        No product catalog items found to analyze.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  forecastItems.map((item) => (
                    <TableRow key={item.variant_id} hover>
                      <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                        {item.product_title}
                        {item.variant_title && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {item.variant_title}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <code>{item.sku || '-'}</code>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>
                        {item.stock} units
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${item.dailyVelocity} / day`}
                          size="small"
                          sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={item.daysOfStock === 999 ? '30+ Days' : `${item.daysOfStock} Days`}
                          size="small"
                          color={
                            item.daysOfStock === 0 ? 'error' :
                            item.daysOfStock <= 7 ? 'warning' :
                            item.daysOfStock <= 15 ? 'default' : 'success'
                          }
                          sx={{ fontWeight: 800, height: 22 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={
                            item.reorderStatus === 'critical_out' ? 'OUT OF STOCK' :
                            item.reorderStatus === 'reorder_now' ? 'REORDER NOW' :
                            item.reorderStatus === 'warning_low' ? 'LOW STOCK' : 'HEALTHY'
                          }
                          size="small"
                          color={
                            item.reorderStatus === 'critical_out' ? 'error' :
                            item.reorderStatus === 'reorder_now' ? 'warning' : 'default'
                          }
                          sx={{ height: 20, fontSize: '0.68rem', fontWeight: 800 }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: item.recommendedReorderQty > 0 ? '#2563eb' : '#64748b' }}>
                        {item.recommendedReorderQty > 0 ? `+${item.recommendedReorderQty} units` : 'Adequate'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Tab 1: Purchase Orders */}
      {activeTab === 1 && (
        <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>PO Number</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Supplier</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Line Items</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total Value</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Expected Date</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {purchaseOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        No purchase orders recorded yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  purchaseOrders.map((po) => (
                    <TableRow key={po.id} hover>
                      <TableCell sx={{ fontWeight: 800, color: '#2563eb' }}>{po.po_number}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{po.supplier_name}</TableCell>
                      <TableCell align="center">{po.items?.length || 0} item(s)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>{formatMoney(po.total_amount)}</TableCell>
                      <TableCell>
                        <Chip
                          label={po.status.toUpperCase()}
                          size="small"
                          color={po.status === 'received' ? 'success' : po.status === 'partially_received' ? 'primary' : 'default'}
                          sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>{po.expected_delivery || '-'}</TableCell>
                      <TableCell align="right">
                        {po.status !== 'received' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<ReceiveIcon />}
                            onClick={() => openReceiveModal(po)}
                            sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
                          >
                            Receive Stock
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Create Purchase Order Dialog */}
      <Dialog open={poOpen} onClose={() => setPoOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleCreatePo}>
          <DialogTitle sx={{ fontWeight: 800 }}>Generate Supplier Purchase Order</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 0.5, mb: 2 }}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Supplier Name"
                  required
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Expected Delivery Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Supplier Email"
                  value={supplierEmail}
                  onChange={(e) => setSupplierEmail(e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Supplier Phone"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Order Items
            </Typography>

            {poItems.map((item, idx) => (
              <Grid container spacing={1.5} key={idx} sx={{ mb: 1 }}>
                <Grid item xs={5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Item Title"
                    required
                    value={item.item_title}
                    onChange={(e) => {
                      const next = [...poItems];
                      next[idx].item_title = e.target.value;
                      setPoItems(next);
                    }}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="SKU"
                    value={item.sku}
                    onChange={(e) => {
                      const next = [...poItems];
                      next[idx].sku = e.target.value;
                      setPoItems(next);
                    }}
                  />
                </Grid>
                <Grid item xs={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Quantity"
                    type="number"
                    value={item.qty_ordered}
                    onChange={(e) => {
                      const next = [...poItems];
                      next[idx].qty_ordered = e.target.value;
                      setPoItems(next);
                    }}
                  />
                </Grid>
                <Grid item xs={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Unit Cost"
                    type="number"
                    value={item.unit_cost}
                    onChange={(e) => {
                      const next = [...poItems];
                      next[idx].unit_cost = e.target.value;
                      setPoItems(next);
                    }}
                  />
                </Grid>
              </Grid>
            ))}

            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setPoItems([...poItems, { item_title: '', sku: '', qty_ordered: 50, unit_cost: 100000 }])}
              sx={{ textTransform: 'none', mt: 1 }}
            >
              Add Another Line Item
            </Button>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setPoOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={creatingPo}
              sx={{ fontWeight: 800, textTransform: 'none', bgcolor: '#2563eb' }}
            >
              {creatingPo ? <CircularProgress size={20} color="inherit" /> : 'Confirm & Save Purchase Order'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Receive Stock Modal */}
      <Dialog open={receiveModalOpen} onClose={() => setReceiveModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Receive Stock: {selectedPo?.po_number}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter the quantity received at the dock to automatically increase live warehouse stock:
          </Typography>

          {selectedPo?.items?.map((it) => (
            <Box key={it.id} sx={{ mb: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{it.item_title}</Typography>
                <Typography variant="caption" color="text.secondary">Ordered: {it.qty_ordered} · Received: {it.qty_received}</Typography>
              </Stack>
              <TextField
                fullWidth
                size="small"
                label="Units Received Today"
                type="number"
                value={receiptInputs[it.id] ?? 0}
                onChange={(e) => setReceiptInputs({ ...receiptInputs, [it.id]: e.target.value })}
              />
            </Box>
          ))}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setReceiveModalOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleConfirmReceiveStock} sx={{ fontWeight: 800, textTransform: 'none' }}>
            Update Inventory Stock
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
