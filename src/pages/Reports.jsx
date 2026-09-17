import React, { useState, useEffect, useMemo } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Avatar
} from '@mui/material';
import {
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  ShoppingCart as OrdersIcon,
  AttachMoney as RevenueIcon,
  LocalShipping as ShippingIcon,
  Storefront as StoreIcon,
  Inventory2 as InventoryIcon
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { formatMoney, formatDate } from '../utils/formatters';

const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function Reports() {
  const [metrics, setMetrics] = useState({});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('30d');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [met, ords] = await Promise.all([
        window.api.orders.getMetrics(),
        window.api.orders.list({ limit: 5000, include_items: true })
      ]);
      setMetrics(met || {});
      setOrders(ords?.orders || []);
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter orders by date range
  const filteredOrders = useMemo(() => {
    if (!orders.length) return [];
    if (dateFilter === 'all') return orders;

    const now = new Date();
    let cutoff = new Date();
    if (dateFilter === 'today') {
      cutoff.setHours(0, 0, 0, 0);
    } else if (dateFilter === '7d') {
      cutoff.setDate(now.getDate() - 7);
    } else if (dateFilter === '30d') {
      cutoff.setDate(now.getDate() - 30);
    } else if (dateFilter === '90d') {
      cutoff.setDate(now.getDate() - 90);
    }

    return orders.filter(o => {
      if (!o.placed_at) return true;
      const d = new Date(o.placed_at);
      return d >= cutoff;
    });
  }, [orders, dateFilter]);

  // Derived metrics for selected timeframe
  const summaryMetrics = useMemo(() => {
    const total = filteredOrders.length;
    const revenue = filteredOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
    const unfulfilled = filteredOrders.filter(o => o.fulfillment === 'unfulfilled' || !o.fulfillment).length;
    const fulfilled = filteredOrders.filter(o => o.fulfillment === 'fulfilled').length;
    const aov = total > 0 ? Math.round(revenue / total) : 0;
    const fulfillmentRate = total > 0 ? Math.round((fulfilled / total) * 100) : 100;

    return { total, revenue, unfulfilled, fulfilled, aov, fulfillmentRate };
  }, [filteredOrders]);

  // Timeline chart data (grouped by date)
  const timelineData = useMemo(() => {
    if (!filteredOrders.length) return [];
    const dateMap = {};

    filteredOrders.forEach(o => {
      const dateStr = o.placed_at ? new Date(o.placed_at).toISOString().split('T')[0] : 'Unknown';
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = { date: dateStr, sales: 0, orders: 0 };
      }
      dateMap[dateStr].sales += (Number(o.total) || 0) / 100; // standard currency unit
      dateMap[dateStr].orders += 1;
    });

    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredOrders]);

  // Channel share data
  const channelData = useMemo(() => {
    if (!filteredOrders.length) return [];
    const chMap = {};

    filteredOrders.forEach(o => {
      const channel = o.store_label || 'Direct';
      if (!chMap[channel]) {
        chMap[channel] = { name: channel, value: 0, count: 0 };
      }
      chMap[channel].value += (Number(o.total) || 0) / 100;
      chMap[channel].count += 1;
    });

    return Object.values(chMap);
  }, [filteredOrders]);

function resolveOrGenerateSku(title, variant, existingSku) {
  if (existingSku && typeof existingSku === 'string' && existingSku.trim() && existingSku.trim() !== '-') {
    return existingSku.trim();
  }
  const cleanTitle = (title || 'PRD').replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  let prefix = cleanTitle.slice(0, 3).map(w => w.substring(0, 3).toUpperCase()).join('-');
  if (!prefix) prefix = 'ITEM';
  
  if (variant && variant.trim() && variant !== 'Default Title') {
    const varClean = variant.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
    return `${prefix}-${varClean || '01'}`;
  }
  return `${prefix}-001`;
}

  // Top selling products
  const topProducts = useMemo(() => {
    if (!filteredOrders.length) return [];
    const prodMap = {};

    filteredOrders.forEach(o => {
      const items = o.items || [];
      items.forEach(it => {
        const title = it.title || 'Unknown Product';
        const displaySku = resolveOrGenerateSku(title, it.variant, it.sku);
        const key = `${title}__${it.variant || ''}__${displaySku}`;
        if (!prodMap[key]) {
          prodMap[key] = {
            title,
            variant: it.variant || '',
            image_url: it.image_url || null,
            qty: 0,
            revenue: 0,
            sku: displaySku
          };
        }
        const itemQty = Number(it.qty) || 1;
        const itemTotal = Number(it.total) || (Number(it.price) * itemQty) || 0;
        prodMap[key].qty += itemQty;
        prodMap[key].revenue += itemTotal;
        if (!prodMap[key].image_url && it.image_url) {
          prodMap[key].image_url = it.image_url;
        }
      });
    });

    return Object.values(prodMap)
      .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
      .slice(0, 15);
  }, [filteredOrders]);

  const handleExportCSV = () => {
    if (!filteredOrders.length) return;
    const headers = ['Order Name', 'Placed At', 'Customer', 'Phone', 'Email', 'Store', 'Financial', 'Fulfillment', 'Total Formatted'];
    const rows = filteredOrders.map(o => [
      `"${o.name || ''}"`,
      `"${o.placed_at || ''}"`,
      `"${(o.customer?.firstName || '') + ' ' + (o.customer?.lastName || '')}"`,
      `"${o.phone || ''}"`,
      `"${o.email || ''}"`,
      `"${o.store_label || ''}"`,
      `"${o.financial || ''}"`,
      `"${o.fulfillment || ''}"`,
      `"${formatMoney(o.total, o.currency)}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `OrderDesk_Analytics_${dateFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
            Reports & Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cross-channel performance, revenue trends, and inventory insights
          </Typography>
        </div>

        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={dateFilter}
              label="Date Range"
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
              <MenuItem value="all">All Time</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
            disabled={filteredOrders.length === 0}
          >
            Export CSV
          </Button>
        </Stack>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                    Gross Sales
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
                    {formatMoney(summaryMetrics.revenue)}
                  </Typography>
                </div>
                <Box sx={{ p: 1, bgcolor: '#eff6ff', borderRadius: 2, color: '#2563eb' }}>
                  <RevenueIcon />
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                In selected timeframe
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Orders
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#2563eb', mt: 0.5 }}>
                    {summaryMetrics.total.toLocaleString()}
                  </Typography>
                </div>
                <Box sx={{ p: 1, bgcolor: '#f0fdf4', borderRadius: 2, color: '#16a34a' }}>
                  <OrdersIcon />
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Avg Order: <strong>{formatMoney(summaryMetrics.aov)}</strong>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                    Fulfillment Rate
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#10b981', mt: 0.5 }}>
                    {summaryMetrics.fulfillmentRate}%
                  </Typography>
                </div>
                <Box sx={{ p: 1, bgcolor: '#ecfdf5', borderRadius: 2, color: '#059669' }}>
                  <ShippingIcon />
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {summaryMetrics.fulfilled} dispatched of {summaryMetrics.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                    Pending Dispatch
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#f59e0b', mt: 0.5 }}>
                    {summaryMetrics.unfulfilled}
                  </Typography>
                </div>
                <Box sx={{ p: 1, bgcolor: '#fffbeb', borderRadius: 2, color: '#d97706' }}>
                  <StoreIcon />
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Orders awaiting packaging
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Visual Analytics Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Sales Timeline Area Chart */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Sales Volume & Order Trend
              </Typography>
              {timelineData.length > 0 ? (
                <Box sx={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer>
                    <AreaChart data={timelineData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                      <Tooltip
                        formatter={(value, name) => [
                          name === 'sales' ? `PKR ${Number(value).toLocaleString()}` : value,
                          name === 'sales' ? 'Revenue' : 'Orders'
                        ]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No order activity in this timeframe.</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Store Share Pie Chart */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Channel Sales Share
              </Typography>
              {channelData.length > 0 ? (
                <Box sx={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={channelData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {channelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`PKR ${Number(value).toLocaleString()}`, 'Sales']} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No channel data available.</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top Products Table */}
      <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <CardContent sx={{ pb: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Top Selling Products
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Based on orders placed during the selected timeframe
          </Typography>
        </CardContent>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 60 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Units Sold</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Total Revenue</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#64748b' }}>
                      No sales data found for this timeframe.
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Try selecting a different date range or sync your latest Shopify/Woo orders.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                topProducts.map((prod, idx) => (
                  <TableRow key={`${prod.title}_${prod.sku}_${idx}`} hover>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 700 }}>
                      {`#${idx + 1}`}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          src={prod.image_url}
                          variant="rounded"
                          sx={{ width: 36, height: 36, bgcolor: '#f1f5f9', border: '1px solid #e2e8f0' }}
                        >
                          <InventoryIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                            {prod.title}
                          </Typography>
                          {prod.variant && (
                            <Chip
                              label={prod.variant}
                              size="small"
                              sx={{ height: 18, fontSize: '0.68rem', mt: 0.3, bgcolor: '#f1f5f9' }}
                            />
                          )}
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <code style={{ background: '#f8fafc', padding: '3px 6px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: '0.8rem', fontWeight: 600 }}>
                        {prod.sku}
                      </code>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${prod.qty} units`}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          bgcolor: idx === 0 ? '#eff6ff' : '#f8fafc',
                          color: idx === 0 ? '#2563eb' : '#334155',
                          border: idx === 0 ? '1px solid #bfdbfe' : '1px solid #e2e8f0'
                        }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                      {formatMoney(prod.revenue)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
