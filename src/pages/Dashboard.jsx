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
  Paper,
  CircularProgress,
  Stack,
  Alert
} from '@mui/material';
import {
  Sync as SyncIcon,
  ShoppingCart as OrdersIcon,
  LocalShipping as ShippingIcon,
  AttachMoney as MoneyIcon,
  Print as PrintIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  LocalShipping as LogisticsIcon,
  AssignmentReturn as ReturnsIcon,
  Layers as WaveIcon,
  TrendingDown as ForecastIcon,
  People as StaffIcon,
  QrCodeScanner as ScanIcon,
  Storefront as StoreIcon
} from '@mui/icons-material';
import { formatMoney, formatDate, getStatusColor } from '../utils/formatters';

export default function Dashboard({ onNavigate, onSelectOrder }) {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    unfulfilledCount: 0,
    paidCount: 0,
    todayCount: 0,
    todayRevenue: 0
  });
  const [stores, setStores] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [notification, setNotification] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [met, stList, ords] = await Promise.all([
        window.api.orders.getMetrics(),
        window.api.stores.list(),
        window.api.orders.list({ limit: 10, sort: 'placed_at DESC' })
      ]);

      setMetrics(met || {});
      setStores(stList || []);
      setRecentOrders(ords?.orders || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for sync events
    const unsub = window.api.on('sync:complete', () => {
      loadData();
    });
    return () => unsub();
  }, []);

  const handleSyncAll = async () => {
    try {
      setSyncing(true);
      setNotification({ type: 'info', message: 'Syncing all active stores in background...' });
      await window.api.sync.triggerAll();
      setNotification({ type: 'success', message: 'All stores synced successfully!' });
      await loadData();
    } catch (err) {
      setNotification({ type: 'error', message: `Sync failed: ${err.message}` });
    } finally {
      setSyncing(false);
    }
  };

  const handleQuickPrintSlips = async () => {
    try {
      const res = await window.api.orders.list({ fulfillment: 'unfulfilled', limit: 50 });
      if (!res?.orders?.length) {
        setNotification({ type: 'warning', message: 'No unfulfilled orders found to print.' });
        return;
      }
      const fullOrders = await window.api.orders.getByIds(res.orders.map(o => o.id));
      const pdfRes = await window.api.print.generatePDF({
        kind: 'packing_slip',
        data: { orders: fullOrders },
        options: { isThermal: true }
      });
      if (pdfRes.filePath) {
        window.api.print.openPath(pdfRes.filePath);
        setNotification({ type: 'success', message: `Generated ${fullOrders.length} packing slips PDF!` });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Print error: ' + err.message });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
            Store Operations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Local-first real-time view across your Shopify & WooCommerce channels
          </Typography>
        </div>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handleQuickPrintSlips}
            disabled={metrics.unfulfilledCount === 0}
          >
            Batch Print Slips ({metrics.unfulfilledCount})
          </Button>
          <Button
            variant="contained"
            startIcon={syncing ? <CircularProgress size={18} color="inherit" /> : <SyncIcon />}
            onClick={handleSyncAll}
            disabled={syncing || stores.length === 0}
          >
            Sync All Stores
          </Button>
        </Stack>
      </Box>

      {notification && (
        <Alert severity={notification.type} sx={{ mb: 3 }} onClose={() => setNotification(null)}>
          {notification.message}
        </Alert>
      )}

      {/* Metric Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', borderColor: '#2563eb' }
            }}
            onClick={() => onNavigate('reports')}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <div>
                  <Typography variant="overline" color="text.secondary">Total Revenue</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
                    {formatMoney(metrics.totalRevenue || 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Today: {formatMoney(metrics.todayRevenue || 0)}
                  </Typography>
                </div>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#eff6ff', color: '#2563eb' }}>
                  <MoneyIcon />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', borderColor: '#16a34a' }
            }}
            onClick={() => onNavigate('orders')}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <div>
                  <Typography variant="overline" color="text.secondary">Total Orders</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
                    {(metrics.totalOrders || 0).toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Today: {metrics.todayCount || 0} orders
                  </Typography>
                </div>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f0fdf4', color: '#16a34a' }}>
                  <OrdersIcon />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', borderColor: '#d97706' }
            }}
            onClick={() => onNavigate('orders')}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <div>
                  <Typography variant="overline" color="text.secondary">To Pack & Ship</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#b45309', mt: 0.5 }}>
                    {metrics.unfulfilledCount || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Unfulfilled orders (click to view)
                  </Typography>
                </div>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fffbeb', color: '#d97706' }}>
                  <ShippingIcon />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', borderColor: '#475569' }
            }}
            onClick={() => onNavigate('stores')}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <div>
                  <Typography variant="overline" color="text.secondary">Connected Channels</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
                    {stores.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Shopify & WooCommerce
                  </Typography>
                </div>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', color: '#475569' }}>
                  <StoreIcon />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Enterprise Operations Quick Access Hub */}
      <Card sx={{ mb: 3, border: '1px solid #e2e8f0', boxShadow: 'none', bgcolor: '#f8fafc' }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="overline" sx={{ fontWeight: 800, color: '#64748b', display: 'block', mb: 1.5 }}>
            Enterprise Logistics & Warehouse Operations
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={6} sm={4} md={2.4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<LogisticsIcon />}
                onClick={() => onNavigate('logistics')}
                sx={{
                  bgcolor: '#fff',
                  justifyContent: 'flex-start',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  textTransform: 'none',
                  py: 1,
                  borderRadius: 1.5,
                  borderColor: '#cbd5e1',
                  color: '#0f172a'
                }}
              >
                Logistics & Couriers
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ScanIcon />}
                onClick={() => onNavigate('pack')}
                sx={{
                  bgcolor: '#fff',
                  justifyContent: 'flex-start',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  textTransform: 'none',
                  py: 1,
                  borderRadius: 1.5,
                  borderColor: '#cbd5e1',
                  color: '#0f172a'
                }}
              >
                Pack Station Pro
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<WaveIcon />}
                onClick={() => onNavigate('waves')}
                sx={{
                  bgcolor: '#fff',
                  justifyContent: 'flex-start',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  textTransform: 'none',
                  py: 1,
                  borderRadius: 1.5,
                  borderColor: '#cbd5e1',
                  color: '#0f172a'
                }}
              >
                Wave Picking & Bins
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ReturnsIcon />}
                onClick={() => onNavigate('returns')}
                sx={{
                  bgcolor: '#fff',
                  justifyContent: 'flex-start',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  textTransform: 'none',
                  py: 1,
                  borderRadius: 1.5,
                  borderColor: '#cbd5e1',
                  color: '#0f172a'
                }}
              >
                Returns & Restock
              </Button>
            </Grid>
            <Grid item xs={12} sm={4} md={2.4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ForecastIcon />}
                onClick={() => onNavigate('forecast')}
                sx={{
                  bgcolor: '#fff',
                  justifyContent: 'flex-start',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  textTransform: 'none',
                  py: 1,
                  borderRadius: 1.5,
                  borderColor: '#cbd5e1',
                  color: '#0f172a'
                }}
              >
                Inventory Forecast
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Channels Section */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Connected Stores</Typography>
                <Button size="small" onClick={() => onNavigate('stores')}>Manage</Button>
              </Stack>

              {stores.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <StoreIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">No stores connected yet.</Typography>
                  <Button variant="outlined" size="small" sx={{ mt: 1.5 }} onClick={() => onNavigate('stores')}>
                    Connect Store
                  </Button>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {stores.map(st => (
                    <Box
                      key={st.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{st.label}</Typography>
                          <Chip
                            label={st.platform.toUpperCase()}
                            size="small"
                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800, bgcolor: st.platform === 'shopify' ? '#e0e7ff' : '#fce7f3' }}
                          />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {st.order_count || 0} orders • {st.product_count || 0} products
                        </Typography>
                      </div>
                      <IconButton
                        size="small"
                        onClick={async () => {
                          await window.api.sync.triggerStore(st.id);
                          loadData();
                        }}
                        title="Sync store"
                      >
                        <SyncIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Orders Table */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ pb: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Recent Orders</Typography>
                <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => onNavigate('orders')}>
                  View All
                </Button>
              </Stack>

              {recentOrders.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">No orders synced yet.</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Order</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Channel</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Fulfillment</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentOrders.map(order => {
                        const fulStyle = getStatusColor(order.fulfillment);
                        return (
                          <TableRow
                            key={order.id}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => {
                              if (onSelectOrder) onSelectOrder(order.id);
                              onNavigate('orders');
                            }}
                          >
                            <TableCell sx={{ fontWeight: 700, color: '#1e40af' }}>
                              {order.name}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {order.customer ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || '-' : '-'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(order.placed_at)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={order.store_label}
                                size="small"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            </TableCell>
                            <TableCell>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
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
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              {formatMoney(order.total, order.currency)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
