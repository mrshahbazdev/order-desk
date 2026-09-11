import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  Tooltip,
  TablePagination
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Print as PrintIcon,
  LocalShipping as FulfillIcon,
  Receipt as InvoiceIcon,
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon,
  Save as SaveIcon,
  LocalShipping as ShippingIcon,
  Send as SendIcon,
  Warning as WarningIcon,
  Chat as ChatIcon
} from '@mui/icons-material';
import { formatMoney, formatDate, getStatusColor } from '../utils/formatters';

export default function Orders({ initialSelectedOrderId }) {
  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState([]);
  
  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedFulfillment, setSelectedFulfillment] = useState('all');
  const [selectedFinancial, setSelectedFinancial] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Detail Modal
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [orderNoteInput, setOrderNoteInput] = useState('');
  const [orderTagsInput, setOrderTagsInput] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  // Fulfillment Dialog
  const [fulfillDialogOpen, setFulfillDialogOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingCompany, setTrackingCompany] = useState('PostEx');
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [fulfillLoading, setFulfillLoading] = useState(false);

  // Batch Fulfillment Dialog
  const [batchFulfillOpen, setBatchFulfillOpen] = useState(false);
  const [batchCarrier, setBatchCarrier] = useState('PostEx');
  const [batchFulfillLoading, setBatchFulfillLoading] = useState(false);

  // Feedback Notification
  const [alert, setAlert] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadStores = async () => {
    try {
      const st = await window.api.stores.list();
      setStores(st || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await window.api.orders.list({
        store_id: selectedStore === 'all' ? null : selectedStore,
        fulfillment: selectedFulfillment,
        financial: selectedFinancial,
        search: debouncedSearch.trim() || null,
        limit: rowsPerPage,
        offset: page * rowsPerPage
      });
      setOrders(res?.orders || []);
      setTotalCount(res?.total || 0);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setAlert({ type: 'error', message: 'Failed to load orders: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    loadOrders();
  }, [selectedStore, selectedFulfillment, selectedFinancial, debouncedSearch, page, rowsPerPage]);

  useEffect(() => {
    if (initialSelectedOrderId) {
      openOrderDetail(initialSelectedOrderId);
    }
  }, [initialSelectedOrderId]);

  const openOrderDetail = async (orderId) => {
    try {
      setDetailLoading(true);
      const order = await window.api.orders.get(orderId);
      setDetailOrder(order);
      setOrderNoteInput(order?.note || '');
      setOrderTagsInput(order?.tags || '');

      // Check duplicates
      try {
        const dup = await window.api.messaging.detectDuplicates({ orderId });
        setDuplicateInfo(dup);
      } catch (e) {
        setDuplicateInfo(null);
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to load order details: ' + err.message });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSendWhatsApp = (order, templateType = 'confirm') => {
    if (!order?.phone) {
      setAlert({ type: 'warning', message: 'Customer phone number is missing on this order.' });
      return;
    }
    const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Customer';
    let text = '';
    if (templateType === 'confirm') {
      text = `Hello ${customerName}, thank you for your order ${order.name} totaling ${formatMoney(order.total, order.currency)}. We are packing your items. Please confirm your shipping address if needed. Thank you!`;
    } else if (templateType === 'tracking') {
      text = `Hello ${customerName}, your order ${order.name} has been dispatched! Total payable on delivery: ${formatMoney(order.total, order.currency)}.`;
    } else if (templateType === 'ndr') {
      text = `Hello ${customerName}, regarding order ${order.name}: our courier partner reported a delivery attempt issue today. Please reply with your available time for delivery.`;
    }
    window.api.messaging.openWhatsApp({ phone: order.phone, text });
  };

  const handleSaveOrderDetails = async () => {
    if (!detailOrder) return;
    try {
      setSavingDetails(true);
      await window.api.orders.updateDetails({
        orderId: detailOrder.id,
        note: orderNoteInput.trim(),
        tags: orderTagsInput.trim()
      });
      setDetailOrder(prev => ({ ...prev, note: orderNoteInput.trim(), tags: orderTagsInput.trim() }));
      setAlert({ type: 'success', message: 'Order notes & tags saved!' });
      loadOrders();
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to update order details: ' + err.message });
    } finally {
      setSavingDetails(false);
    }
  };

  const handleCopyText = (text, label = 'Copied to clipboard!') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setAlert({ type: 'info', message: label });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(orders.map(o => o.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Batch Print Packing Slips
  const handleBatchPrintSlips = async (isThermal = true) => {
    if (selectedIds.size === 0) return;
    try {
      const fullOrders = await window.api.orders.getByIds(Array.from(selectedIds));
      const res = await window.api.print.generatePDF({
        kind: 'packing_slip',
        data: { orders: fullOrders },
        options: { isThermal }
      });
      if (res.filePath) {
        window.api.print.openPath(res.filePath);
        setAlert({ type: 'success', message: `Generated ${fullOrders.length} packing slips PDF!` });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Print error: ' + err.message });
    }
  };

  // Batch Print Invoices
  const handleBatchPrintInvoices = async () => {
    if (selectedIds.size === 0) return;
    try {
      const fullOrders = await window.api.orders.getByIds(Array.from(selectedIds));
      for (const ord of fullOrders) {
        const res = await window.api.print.generatePDF({
          kind: 'invoice',
          data: { order: ord },
          options: { pageSize: 'A4' }
        });
        if (res.filePath) {
          window.api.print.openPath(res.filePath);
        }
      }
      setAlert({ type: 'success', message: `Generated invoices for ${fullOrders.length} orders!` });
    } catch (err) {
      setAlert({ type: 'error', message: 'Batch invoice print error: ' + err.message });
    }
  };

  // Batch Fulfill Orders
  const handleBatchFulfillSubmit = async () => {
    if (selectedIds.size === 0) return;
    try {
      setBatchFulfillLoading(true);
      const res = await window.api.orders.batchFulfill({
        orderIds: Array.from(selectedIds),
        trackingCompany: batchCarrier
      });
      setAlert({ type: 'success', message: `Batch fulfilled ${res.count || selectedIds.size} orders via ${batchCarrier}!` });
      setBatchFulfillOpen(false);
      setSelectedIds(new Set());
      loadOrders();
    } catch (err) {
      setAlert({ type: 'error', message: 'Batch fulfill error: ' + err.message });
    } finally {
      setBatchFulfillLoading(false);
    }
  };

  // Single Print Invoice
  const handlePrintInvoice = async (order) => {
    try {
      const res = await window.api.print.generatePDF({
        kind: 'invoice',
        data: { order },
        options: { pageSize: 'A4' }
      });
      if (res.filePath) {
        window.api.print.openPath(res.filePath);
        setAlert({ type: 'success', message: `Invoice generated for ${order.name}` });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Invoice print error: ' + err.message });
    }
  };

  // Single Print Shipping Label (4x6)
  const handlePrintLabel = async (order) => {
    try {
      const res = await window.api.print.generatePDF({
        kind: 'label',
        data: { order },
        options: {
          trackingNumber: trackingNumber || order.name.replace(/[^0-9]/g, ''),
          trackingCompany
        }
      });
      if (res.filePath) {
        window.api.print.openPath(res.filePath);
        setAlert({ type: 'success', message: `Shipping label generated for ${order.name}` });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Label print error: ' + err.message });
    }
  };

  // Fulfill Order
  const handleFulfillSubmit = async () => {
    if (!detailOrder) return;
    try {
      setFulfillLoading(true);
      await window.api.orders.fulfill({
        orderId: detailOrder.id,
        trackingNumber: trackingNumber.trim(),
        trackingCompany,
        notifyCustomer
      });

      setAlert({ type: 'success', message: `Order ${detailOrder.name} marked fulfilled and queued to sync!` });
      setFulfillDialogOpen(false);
      setTrackingNumber('');
      openOrderDetail(detailOrder.id);
      loadOrders();
    } catch (err) {
      setAlert({ type: 'error', message: 'Fulfill failed: ' + err.message });
    } finally {
      setFulfillLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') {
      setDebouncedSearch(search);
      setPage(0);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
            Orders Desk
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {totalCount.toLocaleString()} total orders across channels (local SQLite)
          </Typography>
        </div>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadOrders()}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 2 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Batch Actions Bar (when selected) */}
      {selectedIds.size > 0 && (
        <Paper
          elevation={2}
          sx={{
            p: 1.5,
            mb: 2,
            bgcolor: '#0f172a',
            color: '#fff',
            borderRadius: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1.5
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {selectedIds.size} orders selected
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              variant="contained"
              size="small"
              sx={{ bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}
              startIcon={<PrintIcon />}
              onClick={() => handleBatchPrintSlips(true)}
            >
              Batch 4x6" Slips
            </Button>
            <Button
              variant="contained"
              size="small"
              sx={{ bgcolor: '#334155', '&:hover': { bgcolor: '#475569' } }}
              startIcon={<PrintIcon />}
              onClick={() => handleBatchPrintSlips(false)}
            >
              Batch A4 Slips
            </Button>
            <Button
              variant="contained"
              size="small"
              sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
              startIcon={<InvoiceIcon />}
              onClick={handleBatchPrintInvoices}
            >
              Batch Invoices
            </Button>
            <Button
              variant="contained"
              size="small"
              sx={{ bgcolor: '#d97706', '&:hover': { bgcolor: '#b45309' } }}
              startIcon={<ShippingIcon />}
              onClick={() => setBatchFulfillOpen(true)}
            >
              Batch Fulfill ({selectedIds.size})
            </Button>
            <Button
              variant="text"
              size="small"
              sx={{ color: '#94a3b8' }}
              onClick={() => setSelectedIds(new Set())}
            >
              Deselect All
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Filter and Search Bar */}
      <Card sx={{ mb: 2.5, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search order #, customer, phone, tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchSubmit}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={6} sm={2.5} md={2.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Store</InputLabel>
                <Select
                  value={selectedStore}
                  label="Store"
                  onChange={(e) => { setSelectedStore(e.target.value); setPage(0); }}
                >
                  <MenuItem value="all">All Stores</MenuItem>
                  {stores.map(st => (
                    <MenuItem key={st.id} value={st.id}>{st.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} sm={2.5} md={2.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Fulfillment</InputLabel>
                <Select
                  value={selectedFulfillment}
                  label="Fulfillment"
                  onChange={(e) => { setSelectedFulfillment(e.target.value); setPage(0); }}
                >
                  <MenuItem value="all">All Fulfillment</MenuItem>
                  <MenuItem value="unfulfilled">Unfulfilled</MenuItem>
                  <MenuItem value="partial">Partial</MenuItem>
                  <MenuItem value="fulfilled">Fulfilled</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} sm={3} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment</InputLabel>
                <Select
                  value={selectedFinancial}
                  label="Payment"
                  onChange={(e) => { setSelectedFinancial(e.target.value); setPage(0); }}
                >
                  <MenuItem value="all">All Payment Status</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="refunded">Refunded</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <TableContainer>
          <Table size="medium">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedIds.size > 0 && selectedIds.size < orders.length}
                    checked={orders.length > 0 && selectedIds.size === orders.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Order</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Store</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Payment</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Fulfillment</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Items</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1" color="text.secondary">
                      No orders match the selected filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const isSelected = selectedIds.has(order.id);
                  const fulStyle = getStatusColor(order.fulfillment);
                  const finStyle = getStatusColor(order.financial);

                  return (
                    <TableRow
                      key={order.id}
                      hover
                      selected={isSelected}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => openOrderDetail(order.id)}
                    >
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleToggleSelect(order.id)}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1d4ed8' }}>
                        {order.name}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                          {formatDate(order.placed_at)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {order.customer ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || '-' : '-'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {order.phone || order.email || ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={order.store_label}
                          size="small"
                          sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            backgroundColor: finStyle.bg,
                            color: finStyle.text,
                            border: `1px solid ${finStyle.border}`
                          }}
                        >
                          {order.financial}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            backgroundColor: fulStyle.bg,
                            color: fulStyle.text,
                            border: `1px solid ${fulStyle.border}`
                          }}
                        >
                          {order.fulfillment}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {order.item_count} items ({order.item_summary || 'products'})
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        {formatMoney(order.total, order.currency)}
                      </TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="Print Invoice">
                            <IconButton size="small" onClick={() => handlePrintInvoice(order)}>
                              <InvoiceIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Print Label">
                            <IconButton size="small" onClick={() => handlePrintLabel(order)}>
                              <PrintIcon fontSize="small" />
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

        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Card>

      {/* Order Detail Modal */}
      <Dialog
        open={Boolean(detailOrder)}
        onClose={() => setDetailOrder(null)}
        maxWidth="md"
        fullWidth
      >
        {detailOrder && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="h5" sx={{ fontWeight: 800 }}>{detailOrder.name}</Typography>
                <Chip label={detailOrder.store_label} size="small" />
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    ...getStatusColor(detailOrder.fulfillment)
                  }}
                >
                  {detailOrder.fulfillment}
                </span>
              </Stack>
              <IconButton onClick={() => setDetailOrder(null)}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers>
              {duplicateInfo?.isDuplicate && (
                <Alert severity="warning" sx={{ mb: 2.5 }} icon={<WarningIcon />}>
                  <strong>Potential Duplicate Order Detected:</strong> Found {duplicateInfo.count} other order(s) placed with this phone number. Please verify before dispatching.
                </Alert>
              )}

              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined" sx={{ p: 2, height: '100%', bgcolor: '#f8fafc' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="overline" color="text.secondary">Customer Details</Typography>
                      {detailOrder.phone && (
                        <Tooltip title="Copy Phone">
                          <IconButton size="small" onClick={() => handleCopyText(detailOrder.phone, 'Customer phone copied!')}>
                            <CopyIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {detailOrder.customer?.firstName || ''} {detailOrder.customer?.lastName || ''}
                    </Typography>
                    <Typography variant="body2">{detailOrder.email || 'No email'}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0284c7' }}>
                      {detailOrder.phone || 'No phone'}
                    </Typography>

                    {/* WhatsApp Quick Message Buttons */}
                    {detailOrder.phone && (
                      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #e2e8f0' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', display: 'block', mb: 1 }}>
                          Customer WhatsApp Notifications:
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<SendIcon />}
                            onClick={() => handleSendWhatsApp(detailOrder, 'confirm')}
                            sx={{ fontSize: '0.72rem', textTransform: 'none', py: 0.3 }}
                          >
                            Order Confirm
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<SendIcon />}
                            onClick={() => handleSendWhatsApp(detailOrder, 'tracking')}
                            sx={{ fontSize: '0.72rem', textTransform: 'none', py: 0.3 }}
                          >
                            Dispatched
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            startIcon={<ChatIcon />}
                            onClick={() => handleSendWhatsApp(detailOrder, 'ndr')}
                            sx={{ fontSize: '0.72rem', textTransform: 'none', py: 0.3 }}
                          >
                            Delivery Issue
                          </Button>
                        </Stack>
                      </Box>
                    )}
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Card variant="outlined" sx={{ p: 2, height: '100%', bgcolor: '#f8fafc' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="overline" color="text.secondary">Shipping Address</Typography>
                      <Tooltip title="Copy Full Address">
                        <IconButton
                          size="small"
                          onClick={() => {
                            const addr = `${detailOrder.shipping_address?.name || ''}\n${detailOrder.shipping_address?.address1 || ''} ${detailOrder.shipping_address?.address2 || ''}\n${detailOrder.shipping_address?.city || ''}, ${detailOrder.shipping_address?.province || ''} ${detailOrder.shipping_address?.zip || ''}\nTel: ${detailOrder.shipping_address?.phone || detailOrder.phone || ''}`;
                            handleCopyText(addr.trim(), 'Shipping address copied!');
                          }}
                        >
                          <CopyIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {detailOrder.shipping_address?.name || '-'}
                    </Typography>
                    <Typography variant="body2">
                      {detailOrder.shipping_address?.address1 || ''} {detailOrder.shipping_address?.address2 || ''}
                    </Typography>
                    <Typography variant="body2">
                      {detailOrder.shipping_address?.city || ''}, {detailOrder.shipping_address?.province || ''} {detailOrder.shipping_address?.zip || ''}
                    </Typography>
                    <Typography variant="body2">
                      Tel: {detailOrder.shipping_address?.phone || detailOrder.phone || '-'}
                    </Typography>
                  </Card>
                </Grid>
              </Grid>

              {/* Line Items Table */}
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                Order Items ({(detailOrder.items || []).length})
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Qty</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Unit Price</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(detailOrder.items || []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.title}</Typography>
                          {item.variant && <Typography variant="caption" color="text.secondary">{item.variant}</Typography>}
                        </TableCell>
                        <TableCell><code>{item.sku || '-'}</code></TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>{item.qty}</TableCell>
                        <TableCell align="right">{formatMoney(item.price, detailOrder.currency)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatMoney(item.total, detailOrder.currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Financial Totals */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                <Box sx={{ width: 280 }}>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
                      <Typography variant="body2">{formatMoney(detailOrder.subtotal, detailOrder.currency)}</Typography>
                    </Box>
                    {detailOrder.discount > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="success.main">Discount:</Typography>
                        <Typography variant="body2" color="success.main">-{formatMoney(detailOrder.discount, detailOrder.currency)}</Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Shipping:</Typography>
                      <Typography variant="body2">{formatMoney(detailOrder.shipping, detailOrder.currency)}</Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Total:</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{formatMoney(detailOrder.total, detailOrder.currency)}</Typography>
                    </Box>
                  </Stack>
                </Box>
              </Box>

              {/* Editable Notes & Tags */}
              <Card variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Order Notes & Internal Tags
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Order Notes / Instructions"
                      multiline
                      rows={2}
                      value={orderNoteInput}
                      onChange={(e) => setOrderNoteInput(e.target.value)}
                      placeholder="e.g. Deliver before 5pm, call upon arrival"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Tags (comma separated)"
                      value={orderTagsInput}
                      onChange={(e) => setOrderTagsInput(e.target.value)}
                      placeholder="e.g. VIP, Urgent, Wholesale"
                      sx={{ mb: 1.5 }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveOrderDetails}
                      disabled={savingDetails}
                    >
                      {savingDetails ? 'Saving...' : 'Save Notes & Tags'}
                    </Button>
                  </Grid>
                </Grid>
              </Card>
            </DialogContent>

            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
              <Stack direction="row" spacing={1}>
                <Button startIcon={<InvoiceIcon />} onClick={() => handlePrintInvoice(detailOrder)}>
                  Invoice
                </Button>
                <Button startIcon={<PrintIcon />} onClick={() => handlePrintLabel(detailOrder)}>
                  Shipping Label
                </Button>
              </Stack>

              <Stack direction="row" spacing={1.5}>
                {detailOrder.fulfillment !== 'fulfilled' && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<FulfillIcon />}
                    onClick={() => setFulfillDialogOpen(true)}
                  >
                    Fulfill / Dispatch
                  </Button>
                )}
                <Button onClick={() => setDetailOrder(null)}>Close</Button>
              </Stack>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Single Fulfill / Tracking Modal */}
      <Dialog open={fulfillDialogOpen} onClose={() => setFulfillDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Fulfill Order {detailOrder?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Courier / Carrier</InputLabel>
              <Select
                value={trackingCompany}
                label="Courier / Carrier"
                onChange={(e) => setTrackingCompany(e.target.value)}
              >
                <MenuItem value="PostEx">PostEx Courier</MenuItem>
                <MenuItem value="Leopards">Leopards Express</MenuItem>
                <MenuItem value="Trax">Trax Logistics</MenuItem>
                <MenuItem value="TCS">TCS Express</MenuItem>
                <MenuItem value="DHL">DHL Express</MenuItem>
                <MenuItem value="Custom">Other / Self Dispatch</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              size="small"
              label="Tracking Number / Waybill"
              placeholder="e.g. 192837482"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
            />

            <Typography variant="caption" color="text.secondary">
              This will update the order to fulfilled locally and queue the fulfillment mutation to sync back to {detailOrder?.store_platform?.toUpperCase()}.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setFulfillDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleFulfillSubmit}
            disabled={fulfillLoading}
          >
            {fulfillLoading ? <CircularProgress size={20} color="inherit" /> : 'Confirm & Dispatch'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Batch Fulfill Modal */}
      <Dialog open={batchFulfillOpen} onClose={() => setBatchFulfillOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Batch Fulfill {selectedIds.size} Orders</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Mark all selected orders as fulfilled in local database and queue fulfillment syncs to your connected store.
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel>Courier / Carrier</InputLabel>
              <Select
                value={batchCarrier}
                label="Courier / Carrier"
                onChange={(e) => setBatchCarrier(e.target.value)}
              >
                <MenuItem value="PostEx">PostEx Courier</MenuItem>
                <MenuItem value="Leopards">Leopards Express</MenuItem>
                <MenuItem value="Trax">Trax Logistics</MenuItem>
                <MenuItem value="TCS">TCS Express</MenuItem>
                <MenuItem value="DHL">DHL Express</MenuItem>
                <MenuItem value="Custom">Other / Self Dispatch</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBatchFulfillOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleBatchFulfillSubmit}
            disabled={batchFulfillLoading}
          >
            {batchFulfillLoading ? <CircularProgress size={20} color="inherit" /> : `Fulfill ${selectedIds.size} Orders`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
