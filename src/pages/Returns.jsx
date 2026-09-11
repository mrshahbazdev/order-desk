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
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  IconButton
} from '@mui/material';
import {
  AssignmentReturn as ReturnsIcon,
  QrCodeScanner as ScanIcon,
  CheckCircle as RestockIcon,
  ReportProblem as DefectIcon,
  Refresh as RefreshIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { formatDate } from '../utils/formatters';

const REASON_LABELS = {
  size_fit: 'Size & Fit Issue',
  wrong_item: 'Wrong Item Sent',
  defective: 'Damaged / Defective',
  customer_refused: 'Customer Refused COD',
  fake_address: 'Fake / Incomplete Address',
  other: 'General Customer Return'
};

export default function Returns() {
  const [returnsList, setReturnsList] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(false);
  const [reasonFilter, setReasonFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [alert, setAlert] = useState(null);

  // Scan-to-Restock Form State
  const [scanCode, setScanCode] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [sku, setSku] = useState('');
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('size_fit');
  const [conditionStatus, setConditionStatus] = useState('resellable');
  const [autoRestock, setAutoRestock] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [list, stats] = await Promise.all([
        window.api.returns.list({ reason: reasonFilter, search }),
        window.api.returns.getAnalytics()
      ]);
      setReturnsList(list || []);
      setAnalytics(stats || {});
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleScanLookup = async (code) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    try {
      // 1. Try finding shipment by tracking number
      const shipments = await window.api.logistics.listShipments({ search: trimmed });
      if (shipments && shipments.length > 0) {
        const sh = shipments[0];
        setTrackingNumber(sh.tracking_number);
        setOrderNumber(sh.order_name || '');
        setCustomerName(sh.customer_name || '');
        setCustomerPhone(sh.customer_phone || '');
        setAlert({ type: 'info', message: `Found shipment record: ${sh.tracking_number} for ${sh.customer_name}` });
        return;
      }

      // 2. Try looking up product variant by SKU or Barcode
      const prodRes = await window.api.products.list({ search: trimmed });
      if (prodRes && prodRes.products?.length > 0) {
        const p = prodRes.products[0];
        const v = p.variants?.find(varnt => varnt.sku === trimmed || varnt.barcode === trimmed) || p.variants?.[0];
        if (v) {
          setItemTitle(p.title);
          setSku(v.sku);
          setAlert({ type: 'info', message: `Identified product: ${p.title} (${v.sku})` });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleProcessReturn = async (e) => {
    e.preventDefault();
    if (!itemTitle.trim()) {
      setAlert({ type: 'warning', message: 'Please provide Item Title or scan a valid product barcode/SKU' });
      return;
    }

    try {
      setProcessing(true);
      await window.api.returns.processReturn({
        order_number: orderNumber,
        tracking_number: trackingNumber,
        item_title: itemTitle,
        sku,
        qty: Number(qty) || 1,
        reason,
        condition_status: conditionStatus,
        restock: autoRestock,
        customer_name: customerName,
        customer_phone: customerPhone,
        received_by: 'Returns Processing Station',
        notes
      });

      setAlert({
        type: 'success',
        message: `Return recorded successfully.${autoRestock ? ' Inventory stock increased automatically.' : ''}`
      });

      // Reset form
      setScanCode('');
      setOrderNumber('');
      setTrackingNumber('');
      setItemTitle('');
      setSku('');
      setQty(1);
      setCustomerName('');
      setCustomerPhone('');
      setNotes('');

      loadData();
    } catch (err) {
      setAlert({ type: 'error', message: `Processing error: ${err.message}` });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
            Reverse Logistics & Returns Processing
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Scan-to-restock station, customer return reasons, and damage inspection workflows
          </Typography>
        </div>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadData}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Refresh Data
        </Button>
      </Box>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* KPI Summary */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                Total Processed Returns
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#0f172a' }}>
                {analytics.totalReturns || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Cumulative parcels returned
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                Restocked to Live Inventory
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#16a34a' }}>
                {analytics.restockedCount || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Resellable condition items
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                Damaged / Defective Goods
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#dc2626' }}>
                {analytics.damagedCount || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Sent to salvage or repair
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Left: Scan-to-Restock Station */}
        <Grid item xs={12} lg={4.5}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScanIcon /> Scan-to-Restock Station
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Scan returned parcel tracking barcode or product SKU to auto-fill details
              </Typography>

              <form onSubmit={handleProcessReturn}>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Scan Barcode / Tracking Number"
                    placeholder="Scan courier sticker or product barcode..."
                    value={scanCode}
                    onChange={(e) => {
                      setScanCode(e.target.value);
                      handleScanLookup(e.target.value);
                    }}
                    autoFocus
                  />

                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Order Number"
                        placeholder="#1001"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Tracking Waybill"
                        placeholder="TRK-1002"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                      />
                    </Grid>
                  </Grid>

                  <TextField
                    fullWidth
                    size="small"
                    label="Returned Item Title"
                    required
                    value={itemTitle}
                    onChange={(e) => setItemTitle(e.target.value)}
                  />

                  <Grid container spacing={1.5}>
                    <Grid item xs={7}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Item SKU"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={5}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Quantity"
                        type="number"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                      />
                    </Grid>
                  </Grid>

                  <FormControl fullWidth size="small">
                    <InputLabel>Return Reason</InputLabel>
                    <Select
                      value={reason}
                      label="Return Reason"
                      onChange={(e) => setReason(e.target.value)}
                    >
                      <MenuItem value="size_fit">Size & Fit Issue</MenuItem>
                      <MenuItem value="wrong_item">Wrong Item Sent</MenuItem>
                      <MenuItem value="defective">Damaged / Defective</MenuItem>
                      <MenuItem value="customer_refused">Customer Refused COD</MenuItem>
                      <MenuItem value="fake_address">Fake / Incomplete Address</MenuItem>
                      <MenuItem value="other">General Customer Return</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Item Condition</InputLabel>
                    <Select
                      value={conditionStatus}
                      label="Item Condition"
                      onChange={(e) => setConditionStatus(e.target.value)}
                    >
                      <MenuItem value="resellable">Resellable (Brand New Condition)</MenuItem>
                      <MenuItem value="damaged">Damaged / Defective</MenuItem>
                      <MenuItem value="inspecting">Requires Technical Inspection</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={autoRestock}
                        onChange={(e) => setAutoRestock(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        Automatically add +{qty || 1} unit(s) back to inventory stock
                      </Typography>
                    }
                  />

                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    label="Inspection Notes"
                    placeholder="e.g. Tags intact, original box clean..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />

                  <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={processing}
                    sx={{ fontWeight: 800, textTransform: 'none', bgcolor: '#2563eb' }}
                  >
                    {processing ? <CircularProgress size={20} color="inherit" /> : 'Confirm Return & Restock'}
                  </Button>
                </Stack>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Returns Log & History Table */}
        <Grid item xs={12} lg={7.5}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 1.5 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button
                  size="small"
                  variant={reasonFilter === 'all' ? 'contained' : 'outlined'}
                  onClick={() => { setReasonFilter('all'); loadData(); }}
                >
                  All Reasons
                </Button>
                <Button
                  size="small"
                  variant={reasonFilter === 'size_fit' ? 'contained' : 'outlined'}
                  onClick={() => { setReasonFilter('size_fit'); loadData(); }}
                >
                  Size Fit
                </Button>
                <Button
                  size="small"
                  variant={reasonFilter === 'defective' ? 'contained' : 'outlined'}
                  onClick={() => { setReasonFilter('defective'); loadData(); }}
                >
                  Damaged
                </Button>
                <Button
                  size="small"
                  variant={reasonFilter === 'customer_refused' ? 'contained' : 'outlined'}
                  onClick={() => { setReasonFilter('customer_refused'); loadData(); }}
                >
                  Refused COD
                </Button>
              </Stack>

              <TextField
                size="small"
                placeholder="Search returned item, order..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                sx={{ width: 220 }}
              />
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Item & SKU</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Order Ref</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Return Reason</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Condition</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Restocked?</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date Received</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={32} />
                      </TableCell>
                    </TableRow>
                  ) : returnsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          No returns recorded in this category yet.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    returnsList.map((ret) => (
                      <TableRow key={ret.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                            {ret.item_title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            SKU: {ret.sku || '-'} · Qty: {ret.qty}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#2563eb' }}>
                          {ret.order_number || ret.tracking_number || '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={REASON_LABELS[ret.reason] || ret.reason}
                            size="small"
                            sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600, bgcolor: '#f1f5f9' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={ret.condition_status.toUpperCase()}
                            size="small"
                            color={ret.condition_status === 'resellable' ? 'success' : 'error'}
                            sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          {ret.restocked ? (
                            <Chip label="Yes (+Stock)" size="small" color="success" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }} />
                          ) : (
                            <Chip label="No" size="small" sx={{ height: 20, fontSize: '0.68rem', bgcolor: '#f1f5f9' }} />
                          )}
                        </TableCell>
                        <TableCell>{formatDate(ret.created_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
