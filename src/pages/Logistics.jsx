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
  IconButton,
  Tooltip,
  Alert,
  Switch,
  FormControlLabel,
  InputAdornment,
  Divider
} from '@mui/material';
import {
  LocalShipping as ShippingIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  OpenInNew as OpenIcon,
  CheckCircle as DeliveredIcon,
  HourglassEmpty as PendingIcon,
  Cancel as ReturnedIcon,
  ReceiptLong as StatementIcon,
  Tune as SettingsIcon,
  AccountBalance as BankIcon,
  Public as GlobalIcon,
  VpnKey as ApiIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircleOutline as SuccessIcon,
  ErrorOutline as ErrorIcon,
  AddCircleOutline as AddCircleIcon,
  Language as LanguageIcon,
  Sensors as TestIcon
} from '@mui/icons-material';
import { formatMoney, formatDate } from '../utils/formatters';

export default function Logistics() {
  const [activeTab, setActiveTab] = useState(0); // 0 = Dispatches & Shipments, 1 = COD Reconciliation, 2 = Courier Accounts
  const [shipments, setShipments] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [carrierCategoryFilter, setCarrierCategoryFilter] = useState('all');
  const [alert, setAlert] = useState(null);

  // Carrier Config / API Modal
  const [carrierModalOpen, setCarrierModalOpen] = useState(false);
  const [carrierId, setCarrierId] = useState(null);
  const [carrierName, setCarrierName] = useState('');
  const [carrierCode, setCarrierCode] = useState('');
  const [carrierCategory, setCarrierCategory] = useState('regional');
  const [carrierCountry, setCarrierCountry] = useState('Pakistan');
  const [carrierTrackingUrl, setCarrierTrackingUrl] = useState('');
  const [carrierApiEndpoint, setCarrierApiEndpoint] = useState('');
  const [carrierApiKey, setCarrierApiKey] = useState('');
  const [carrierAccountNumber, setCarrierAccountNumber] = useState('');
  const [carrierIsActive, setCarrierIsActive] = useState(true);
  const [testApiResult, setTestApiResult] = useState(null);
  const [savingCarrier, setSavingCarrier] = useState(false);
  const [testingApi, setTestingApi] = useState(false);

  // New Booking Modal
  const [bookingOpen, setBookingOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [weightKg, setWeightKg] = useState(0.5);
  const [serviceType, setServiceType] = useState('Standard Express');
  const [bookingLoading, setBookingLoading] = useState(false);

  // New Reconcile Modal
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [recCourierId, setRecCourierId] = useState('');
  const [recStatementRef, setRecStatementRef] = useState('');
  const [recTotalOrders, setRecTotalOrders] = useState(1);
  const [recExpected, setRecExpected] = useState(0);
  const [recReceived, setRecReceived] = useState(0);
  const [recCharges, setRecCharges] = useState(0);
  const [recNotes, setRecNotes] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [shipList, courList, recList, met, ords] = await Promise.all([
        window.api.logistics.listShipments({ status: statusFilter, search }),
        window.api.logistics.listCouriers(),
        window.api.logistics.listReconciliations(),
        window.api.logistics.getMetrics(),
        window.api.orders.list({ limit: 100, fulfillment_status: 'unfulfilled' })
      ]);
      setShipments(shipList || []);
      setCouriers(courList || []);
      setReconciliations(recList || []);
      setMetrics(met || {});
      setOrders(ords?.orders || []);

      if (courList && courList.length > 0 && !selectedCourierId) {
        setSelectedCourierId(courList[0].id);
        setRecCourierId(courList[0].id);
      }
      if (ords?.orders?.length > 0 && !selectedOrderId) {
        setSelectedOrderId(ords.orders[0].id);
      }
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleBookShipment = async () => {
    if (!selectedOrderId || !selectedCourierId) return;
    try {
      setBookingLoading(true);
      const res = await window.api.logistics.bookShipment({
        order_id: selectedOrderId,
        courier_id: selectedCourierId,
        weight_kg: Number(weightKg) || 0.5,
        service_type: serviceType
      });
      setAlert({ type: 'success', message: `Shipment booked successfully with Waybill: ${res.tracking_number}` });
      setBookingOpen(false);
      loadAll();
    } catch (err) {
      setAlert({ type: 'error', message: `Booking error: ${err.message}` });
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCreateReconciliation = async () => {
    if (!recCourierId) return;
    try {
      setLoading(true);
      await window.api.logistics.createReconciliation({
        courier_id: recCourierId,
        statement_ref: recStatementRef,
        total_orders: Number(recTotalOrders) || 0,
        expected_amount: Number(recExpected) || 0,
        received_amount: Number(recReceived) || 0,
        courier_charges: Number(recCharges) || 0,
        notes: recNotes
      });
      setAlert({ type: 'success', message: 'COD Reconciliation statement recorded successfully.' });
      setReconcileOpen(false);
      loadAll();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateShipmentStatus = async (id, status) => {
    try {
      await window.api.logistics.updateShipmentStatus({ id, status });
      loadAll();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const [carrierHasSavedCredentials, setCarrierHasSavedCredentials] = useState(false);

  const handleOpenAddCarrier = () => {
    setCarrierId(null);
    setCarrierName('');
    setCarrierCode('');
    setCarrierCategory('regional');
    setCarrierCountry('Pakistan');
    setCarrierTrackingUrl('');
    setCarrierApiEndpoint('');
    setCarrierApiKey('');
    setCarrierAccountNumber('');
    setCarrierIsActive(true);
    setCarrierHasSavedCredentials(false);
    setTestApiResult(null);
    setCarrierModalOpen(true);
  };

  const handleOpenEditCarrier = (c) => {
    setCarrierId(c.id);
    setCarrierName(c.name || '');
    setCarrierCode(c.code || '');
    setCarrierCategory(c.category || 'regional');
    setCarrierCountry(c.country || 'Global');
    setCarrierTrackingUrl(c.tracking_url_template || '');
    setCarrierApiEndpoint(c.api_endpoint || '');
    setCarrierApiKey('');
    setCarrierAccountNumber('');
    setCarrierIsActive(c.is_active === 1 || c.is_active === true);
    setCarrierHasSavedCredentials(Boolean(c.hasCredentials));
    setTestApiResult(null);
    setCarrierModalOpen(true);
  };

  const handleSaveCarrier = async () => {
    if (!carrierName.trim() || !carrierCode.trim()) {
      setAlert({ type: 'error', message: 'Carrier Name and Carrier Code are required.' });
      return;
    }
    try {
      setSavingCarrier(true);
      const payload = {
        id: carrierId,
        name: carrierName.trim(),
        code: carrierCode.trim().toUpperCase(),
        category: carrierCategory,
        country: carrierCountry.trim(),
        tracking_url_template: carrierTrackingUrl.trim(),
        api_endpoint: carrierApiEndpoint.trim(),
        is_active: carrierIsActive ? 1 : 0
      };

      if (carrierApiKey && carrierApiKey.trim()) {
        payload.api_key = carrierApiKey.trim();
      }
      if (carrierAccountNumber && carrierAccountNumber.trim()) {
        payload.account_number = carrierAccountNumber.trim();
      }

      await window.api.logistics.saveCourier(payload);
      setAlert({ type: 'success', message: `Carrier "${carrierName}" saved securely in encrypted vault.` });
      setCarrierModalOpen(false);
      loadAll();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setSavingCarrier(false);
    }
  };

  const handleDeleteCarrier = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete carrier "${name}"?`)) return;
    try {
      await window.api.logistics.deleteCourier(id);
      setAlert({ type: 'success', message: `Carrier "${name}" deleted.` });
      loadAll();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const handleTestCarrierApi = async () => {
    try {
      setTestingApi(true);
      setTestApiResult(null);
      const res = await window.api.logistics.testCourierApi({
        api_endpoint: carrierApiEndpoint,
        api_key: carrierApiKey
      });
      setTestApiResult(res);
    } catch (err) {
      setTestApiResult({ success: false, message: err.message });
    } finally {
      setTestingApi(false);
    }
  };

  const openTrackingUrl = (courierCode, trackingNumber) => {
    const courier = couriers.find(c => c.code === courierCode || c.name === courierCode);
    if (courier && courier.tracking_url_template) {
      const url = courier.tracking_url_template.replace('{{tracking_number}}', trackingNumber);
      window.open(url, '_blank');
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
            International & Regional Logistics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Multi-carrier dispatch booking, real-time parcel tracking, and Cash on Delivery remittance reconciliation
          </Typography>
        </div>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<StatementIcon />}
            onClick={() => setReconcileOpen(true)}
            sx={{ fontWeight: 700, textTransform: 'none' }}
          >
            Reconcile COD Statement
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setBookingOpen(true)}
            sx={{ fontWeight: 800, textTransform: 'none', bgcolor: '#2563eb' }}
          >
            Book New Waybill
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
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                Active In-Transit Parcels
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#2563eb' }}>
                {metrics.inTransit || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Dispatched with carrier network
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                Delivered Shipments
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#16a34a' }}>
                {metrics.delivered || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Successfully handed to customer
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                Pending COD Receivable
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#d97706' }}>
                {formatMoney(metrics.pendingCod || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Awaiting carrier bank deposit
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                Collected & Settled COD
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#0f172a' }}>
                {formatMoney(metrics.collectedCod || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Remitted from delivered parcels
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Navigation Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_e, v) => setActiveTab(v)}
        sx={{ borderBottom: '1px solid #e2e8f0', mb: 3 }}
      >
        <Tab label="Waybills & Live Dispatches" sx={{ fontWeight: 700, textTransform: 'none' }} />
        <Tab label="COD Remittance Reconciliation" sx={{ fontWeight: 700, textTransform: 'none' }} />
        <Tab label="Connected Carriers" sx={{ fontWeight: 700, textTransform: 'none' }} />
      </Tabs>

      {/* Tab 0: Shipments */}
      {activeTab === 0 && (
        <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 1.5 }}>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant={statusFilter === 'all' ? 'contained' : 'outlined'}
                onClick={() => { setStatusFilter('all'); loadAll(); }}
              >
                All
              </Button>
              <Button
                size="small"
                variant={statusFilter === 'booked' ? 'contained' : 'outlined'}
                onClick={() => { setStatusFilter('booked'); loadAll(); }}
              >
                Booked
              </Button>
              <Button
                size="small"
                variant={statusFilter === 'in_transit' ? 'contained' : 'outlined'}
                onClick={() => { setStatusFilter('in_transit'); loadAll(); }}
              >
                In Transit
              </Button>
              <Button
                size="small"
                variant={statusFilter === 'delivered' ? 'contained' : 'outlined'}
                onClick={() => { setStatusFilter('delivered'); loadAll(); }}
              >
                Delivered
              </Button>
              <Button
                size="small"
                variant={statusFilter === 'returned' ? 'contained' : 'outlined'}
                onClick={() => { setStatusFilter('returned'); loadAll(); }}
              >
                Returned
              </Button>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <TextField
                size="small"
                placeholder="Search tracking, order, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadAll()}
                sx={{ width: 260 }}
              />
              <IconButton size="small" onClick={loadAll}>
                <RefreshIcon />
              </IconButton>
            </Stack>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Waybill Number</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Carrier</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Order Ref</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Recipient & Destination</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>COD Receivable</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Booked Date</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : shipments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        No shipments found matching the selected criteria.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  shipments.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell sx={{ fontWeight: 700, color: '#2563eb' }}>
                        {s.tracking_number}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={s.carrier_name}
                          size="small"
                          sx={{ height: 22, fontSize: '0.72rem', fontWeight: 700, bgcolor: '#f1f5f9' }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{s.order_name || '-'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.customer_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.destination_city}, {s.destination_country}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        {formatMoney(s.cod_amount, s.order_currency)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={s.status.toUpperCase()}
                          size="small"
                          color={
                            s.status === 'delivered' ? 'success' :
                            s.status === 'in_transit' ? 'primary' :
                            s.status === 'returned' ? 'error' : 'default'
                          }
                          sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>{formatDate(s.booked_at)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          {s.status === 'booked' && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleUpdateShipmentStatus(s.id, 'in_transit')}
                              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                            >
                              Mark Dispatched
                            </Button>
                          )}
                          {s.status === 'in_transit' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => handleUpdateShipmentStatus(s.id, 'delivered')}
                              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                            >
                              Mark Delivered
                            </Button>
                          )}
                          <Tooltip title="Open Live Carrier Tracking">
                            <IconButton
                              size="small"
                              onClick={() => openTrackingUrl(s.carrier_name, s.tracking_number)}
                            >
                              <OpenIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Tab 1: COD Reconciliation */}
      {activeTab === 1 && (
        <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Statement Ref</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Courier Carrier</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Orders Count</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Expected Amount</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Courier Charges</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Net Received</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Difference</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Settlement Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reconciliations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        No COD remittance statements created yet. Click "Reconcile COD Statement" to add one.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  reconciliations.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>{r.statement_ref}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{r.courier_name || r.courier_code}</TableCell>
                      <TableCell align="center">{r.total_orders}</TableCell>
                      <TableCell align="right">{formatMoney(r.expected_amount)}</TableCell>
                      <TableCell align="right" sx={{ color: '#dc2626' }}>{formatMoney(r.courier_charges)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#16a34a' }}>{formatMoney(r.received_amount)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: r.difference_amount !== 0 ? '#dc2626' : '#64748b' }}>
                        {formatMoney(r.difference_amount)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={r.status.toUpperCase()}
                          size="small"
                          color={r.status === 'settled' ? 'success' : 'error'}
                          sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>{formatDate(r.settlement_date)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Tab 2: Connected Carriers & Custom APIs */}
      {activeTab === 2 && (
        <Box>
          <Box sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1.5, flexWrap: 'wrap', gap: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                variant={carrierCategoryFilter === 'all' ? 'contained' : 'outlined'}
                onClick={() => setCarrierCategoryFilter('all')}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                All Carriers ({couriers.length})
              </Button>
              <Button
                size="small"
                variant={carrierCategoryFilter === 'international' ? 'contained' : 'outlined'}
                onClick={() => setCarrierCategoryFilter('international')}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                International ({couriers.filter(c => c.category === 'international').length})
              </Button>
              <Button
                size="small"
                variant={carrierCategoryFilter === 'regional' ? 'contained' : 'outlined'}
                onClick={() => setCarrierCategoryFilter('regional')}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Regional ({couriers.filter(c => c.category === 'regional').length})
              </Button>
            </Stack>

            <Button
              variant="contained"
              startIcon={<AddCircleIcon />}
              onClick={handleOpenAddCarrier}
              sx={{ fontWeight: 800, textTransform: 'none', bgcolor: '#2563eb' }}
            >
              Add Custom Carrier / Connect API
            </Button>
          </Box>

          <Grid container spacing={2}>
            {couriers
              .filter(c => carrierCategoryFilter === 'all' || c.category === carrierCategoryFilter)
              .map((c) => {
                const hasApi = Boolean(c.api_endpoint || c.api_key);
                return (
                  <Grid item xs={12} sm={6} md={4} key={c.id}>
                    <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <CardContent sx={{ pb: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                              {c.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                              <GlobalIcon sx={{ fontSize: 13 }} />
                              {c.country} · {c.category?.toUpperCase()}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Chip
                              label={c.code}
                              size="small"
                              sx={{ fontWeight: 800, bgcolor: '#f1f5f9', color: '#334155' }}
                            />
                            {c.is_active ? (
                              <Chip label="Active" size="small" color="success" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                            ) : (
                              <Chip label="Inactive" size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                            )}
                          </Stack>
                        </Stack>

                        <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1, border: '1px solid #edf2f7', mb: 1.5 }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            <Chip
                              icon={<ApiIcon sx={{ fontSize: '14px !important' }} />}
                              label={hasApi ? 'API Configured' : 'Tracking URL Mode'}
                              size="small"
                              color={hasApi ? 'primary' : 'default'}
                              variant={hasApi ? 'filled' : 'outlined'}
                              sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                            />
                            {c.account_number && (
                              <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569' }}>
                                Acc: {c.account_number}
                              </Typography>
                            )}
                          </Stack>

                          {c.api_endpoint ? (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                              Endpoint: {c.api_endpoint}
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', wordBreak: 'break-all', fontSize: '0.72rem' }}>
                              Tracking: {c.tracking_url_template || 'Direct booking'}
                            </Typography>
                          )}
                        </Box>
                      </CardContent>

                      <Box sx={{ px: 2, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', pt: 1.5 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<SettingsIcon sx={{ fontSize: 16 }} />}
                          onClick={() => handleOpenEditCarrier(c)}
                          sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
                        >
                          Configure API & Details
                        </Button>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteCarrier(c.id, c.name)}
                          title="Delete carrier"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
          </Grid>
        </Box>
      )}

      {/* Carrier Configuration & API Modal */}
      <Dialog open={carrierModalOpen} onClose={() => setCarrierModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{carrierId ? 'Configure Carrier & API Credentials' : 'Add Custom Courier & API Integration'}</span>
          <Chip label={carrierCategory.toUpperCase()} size="small" sx={{ fontWeight: 700 }} />
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Configure carrier account credentials, webhook endpoints, API authorization tokens, and tracking URLs.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Carrier Display Name"
                  placeholder="e.g. PostEx Logistics, DHL Express"
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Carrier Code (Identifier)"
                  placeholder="e.g. POSTEX, DHL, CUSTOM"
                  value={carrierCode}
                  onChange={(e) => setCarrierCode(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={carrierCategory}
                    label="Category"
                    onChange={(e) => setCarrierCategory(e.target.value)}
                  >
                    <MenuItem value="regional">Regional Domestic Carrier</MenuItem>
                    <MenuItem value="international">International Cross-Border Carrier</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Country / Operating Region"
                  placeholder="e.g. Pakistan, India, Global, USA, UK"
                  value={carrierCountry}
                  onChange={(e) => setCarrierCountry(e.target.value)}
                />
              </Grid>
            </Grid>

            <Divider>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>
                API INTEGRATION & AUTHENTICATION
              </Typography>
            </Divider>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="API Endpoint URL"
                  placeholder="e.g. https://api.carrier.com/v1/orders/create"
                  value={carrierApiEndpoint}
                  onChange={(e) => setCarrierApiEndpoint(e.target.value)}
                  helperText="Live carrier API URL for automated waybill creation and tracking"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="API Key / Bearer Token / Secret"
                  type="password"
                  placeholder={carrierHasSavedCredentials ? "•••••••• (Saved in Vault)" : "Enter secret token or key"}
                  value={carrierApiKey}
                  onChange={(e) => setCarrierApiKey(e.target.value)}
                  helperText={carrierHasSavedCredentials ? "Stored in OS DPAPI Vault. Leave blank to keep unchanged." : "Encrypted before disk storage"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Merchant / Client Account #"
                  placeholder={carrierHasSavedCredentials ? "•••••••• (Saved in Vault)" : "e.g. ACC-88921"}
                  value={carrierAccountNumber}
                  onChange={(e) => setCarrierAccountNumber(e.target.value)}
                  helperText={carrierHasSavedCredentials ? "Stored in OS DPAPI Vault. Leave blank to keep unchanged." : "Optional account identifier"}
                />
              </Grid>
            </Grid>

            <Divider>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>
                TRACKING & SETTINGS
              </Typography>
            </Divider>

            <TextField
              fullWidth
              size="small"
              label="Tracking URL Template"
              placeholder="e.g. https://track.carrier.com?cn={{tracking_number}}"
              value={carrierTrackingUrl}
              onChange={(e) => setCarrierTrackingUrl(e.target.value)}
              helperText="Use {{tracking_number}} placeholder to automatically link tracking waybills"
            />

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <FormControlLabel
                control={
                  <Switch
                    checked={carrierIsActive}
                    onChange={(e) => setCarrierIsActive(e.target.checked)}
                    color="primary"
                  />
                }
                label="Enable this carrier for order bookings"
              />

              <Button
                variant="outlined"
                size="small"
                startIcon={<TestIcon />}
                onClick={handleTestCarrierApi}
                disabled={testingApi || (!carrierApiEndpoint && !carrierApiKey)}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                {testingApi ? <CircularProgress size={16} /> : 'Test Connection'}
              </Button>
            </Stack>

            {testApiResult && (
              <Alert
                severity={testApiResult.success ? 'success' : 'error'}
                icon={testApiResult.success ? <SuccessIcon fontSize="inherit" /> : <ErrorIcon fontSize="inherit" />}
              >
                {testApiResult.message}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCarrierModalOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveCarrier}
            disabled={savingCarrier}
            sx={{ fontWeight: 800, textTransform: 'none', bgcolor: '#2563eb' }}
          >
            {savingCarrier ? <CircularProgress size={20} color="inherit" /> : 'Save Carrier Configuration'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Book Waybill Modal */}
      <Dialog open={bookingOpen} onClose={() => setBookingOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Book Courier Waybill</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Unfulfilled Order</InputLabel>
              <Select
                value={selectedOrderId}
                label="Select Unfulfilled Order"
                onChange={(e) => setSelectedOrderId(e.target.value)}
              >
                {orders.map(o => (
                  <MenuItem key={o.id} value={o.id}>
                    {o.name} - {formatMoney(o.total, o.currency)} ({o.phone || 'No phone'})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Delivery Carrier</InputLabel>
              <Select
                value={selectedCourierId}
                label="Delivery Carrier"
                onChange={(e) => setSelectedCourierId(e.target.value)}
              >
                {couriers.filter(c => c.is_active).map(c => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name} ({c.country})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Parcel Weight (KG)"
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Service Type"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBookingOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleBookShipment}
            disabled={bookingLoading || !selectedOrderId}
            sx={{ fontWeight: 800, textTransform: 'none', bgcolor: '#2563eb' }}
          >
            {bookingLoading ? <CircularProgress size={20} color="inherit" /> : 'Confirm Booking'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reconcile Statement Modal */}
      <Dialog open={reconcileOpen} onClose={() => setReconcileOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Record COD Remittance Statement</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Courier</InputLabel>
              <Select
                value={recCourierId}
                label="Courier"
                onChange={(e) => setRecCourierId(e.target.value)}
              >
                {couriers.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              size="small"
              label="Statement Reference #"
              placeholder="e.g. STMT-2026-09-01"
              value={recStatementRef}
              onChange={(e) => setRecStatementRef(e.target.value)}
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Delivered Orders Count"
                  type="number"
                  value={recTotalOrders}
                  onChange={(e) => setRecTotalOrders(e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Expected COD Total (PKR)"
                  type="number"
                  value={recExpected}
                  onChange={(e) => setRecExpected(e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Courier Shipping Charges"
                  type="number"
                  value={recCharges}
                  onChange={(e) => setRecCharges(e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Net Amount Deposited in Bank"
                  type="number"
                  value={recReceived}
                  onChange={(e) => setRecReceived(e.target.value)}
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              multiline
              rows={2}
              size="small"
              label="Statement Notes"
              value={recNotes}
              onChange={(e) => setRecNotes(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setReconcileOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateReconciliation}
            sx={{ fontWeight: 800, textTransform: 'none', bgcolor: '#2563eb' }}
          >
            Save Statement
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
