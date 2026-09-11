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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Stack,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Sync as SyncIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Storefront as StoreIcon,
  Language as WebIcon,
  Key as KeyIcon
} from '@mui/icons-material';
import { formatDate } from '../utils/formatters';

export default function Stores() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [platformTab, setPlatformTab] = useState(0); // 0 = Shopify, 1 = WooCommerce

  // Shopify form fields
  const [shopifyDomain, setShopifyDomain] = useState('');
  const [shopifyLabel, setShopifyLabel] = useState('');
  const [shopifyToken, setShopifyToken] = useState('');
  const [shopifyCurrency, setShopifyCurrency] = useState('PKR');

  // WooCommerce form fields
  const [wooDomain, setWooDomain] = useState('');
  const [wooLabel, setWooLabel] = useState('');
  const [wooKey, setWooKey] = useState('');
  const [wooSecret, setWooSecret] = useState('');
  const [wooCurrency, setWooCurrency] = useState('PKR');

  // Connection testing state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // Syncing state per store ID
  const [syncingStoreId, setSyncingStoreId] = useState(null);

  const loadStores = async () => {
    try {
      setLoading(true);
      const list = await window.api.stores.list();
      setStores(list || []);
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Failed to load stores: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();

    const unsubStatus = window.api.on('sync:status', () => {
      loadStores();
    });
    return () => unsubStatus();
  }, []);

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      if (platformTab === 0) {
        // Shopify
        if (!shopifyDomain || !shopifyToken) {
          setTestResult({ success: false, message: 'Please provide shopify domain and access token.' });
          return;
        }
        const res = await window.api.stores.testConnection({
          platform: 'shopify',
          domain: shopifyDomain,
          credentials: { accessToken: shopifyToken.trim() }
        });
        const shopName = res?.shop?.name || shopifyDomain;
        const currency = res?.shop?.currencyCode || 'PKR';
        setTestResult({ success: true, message: `Connected! Store: ${shopName} (${currency})` });
        if (!shopifyLabel) setShopifyLabel(shopName);
        if (res?.shop?.currencyCode) setShopifyCurrency(currency);
      } else {
        // WooCommerce
        if (!wooDomain || !wooKey || !wooSecret) {
          setTestResult({ success: false, message: 'Please provide domain, consumer key, and consumer secret.' });
          return;
        }
        const res = await window.api.stores.testConnection({
          platform: 'woo',
          domain: wooDomain,
          credentials: { consumerKey: wooKey.trim(), consumerSecret: wooSecret.trim() }
        });
        setTestResult({ success: true, message: 'Connected to WooCommerce REST API successfully!' });
        if (!wooLabel) setWooLabel('WooCommerce Store');
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Connection test failed: ' + err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveStore = async () => {
    try {
      setSubmitting(true);
      if (platformTab === 0) {
        // Shopify
        if (!shopifyDomain || !shopifyToken) {
          setTestResult({ success: false, message: 'Please provide Shopify Domain and Admin API Access Token.' });
          return;
        }
        await window.api.stores.create({
          platform: 'shopify',
          label: shopifyLabel || shopifyDomain,
          domain: shopifyDomain,
          currency: shopifyCurrency,
          credentials: { accessToken: shopifyToken.trim() }
        });
      } else {
        // WooCommerce
        if (!wooDomain || !wooKey || !wooSecret) {
          setTestResult({ success: false, message: 'Please provide WooCommerce Domain, Consumer Key, and Consumer Secret.' });
          return;
        }
        await window.api.stores.create({
          platform: 'woo',
          label: wooLabel || 'WooCommerce Store',
          domain: wooDomain,
          currency: wooCurrency,
          credentials: { consumerKey: wooKey.trim(), consumerSecret: wooSecret.trim() }
        });
      }

      setNotification({ type: 'success', message: 'Store connected! Initial sync started in background.' });
      setAddDialogOpen(false);
      resetForm();
      loadStores();
    } catch (err) {
      console.error('Save store error:', err);
      setTestResult({ success: false, message: 'Failed to save store: ' + err.message });
      setNotification({ type: 'error', message: 'Failed to add store: ' + err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStore = async (id, label) => {
    if (window.confirm(`Are you sure you want to remove ${label}? Synced orders and products will remain in local database.`)) {
      try {
        await window.api.stores.delete(id);
        setNotification({ type: 'info', message: `Store ${label} removed.` });
        loadStores();
      } catch (err) {
        setNotification({ type: 'error', message: err.message });
      }
    }
  };

  const handleSyncStore = async (id) => {
    try {
      setSyncingStoreId(id);
      setNotification({ type: 'info', message: 'Syncing store...' });
      const res = await window.api.sync.triggerStore(id);
      setNotification({
        type: 'success',
        message: `Synced ${res.ordersSynced || 0} orders & ${res.productsSynced || 0} products!`
      });
      loadStores();
    } catch (err) {
      setNotification({ type: 'error', message: 'Sync failed: ' + err.message });
    } finally {
      setSyncingStoreId(null);
    }
  };

  const resetForm = () => {
    setShopifyDomain('');
    setShopifyLabel('');
    setShopifyToken('');
    setWooDomain('');
    setWooLabel('');
    setWooKey('');
    setWooSecret('');
    setTestResult(null);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
            Store Channels
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Connect and manage your Shopify (GraphQL 2026-01) and WooCommerce (REST v3) stores
          </Typography>
        </div>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { resetForm(); setAddDialogOpen(true); }}
        >
          Connect Store
        </Button>
      </Box>

      {notification && (
        <Alert severity={notification.type} sx={{ mb: 3 }} onClose={() => setNotification(null)}>
          {notification.message}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : stores.length === 0 ? (
        <Card sx={{ p: 5, textAlign: 'center', border: '1px dashed #cbd5e1' }}>
          <StoreIcon sx={{ fontSize: 60, color: '#94a3b8', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>No Stores Connected Yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mx: 'auto', mt: 1, mb: 3 }}>
            Connect your Shopify or WooCommerce store to start pulling orders, inventory, and printing thermal labels offline.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddDialogOpen(true)}>
            Connect Your First Store
          </Button>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {stores.map(store => {
            const isSyncing = syncingStoreId === store.id;
            return (
              <Grid item xs={12} md={6} lg={4} key={store.id}>
                <Card sx={{ border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'relative' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                      <div>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>{store.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{store.domain}</Typography>
                      </div>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={store.platform.toUpperCase()}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            bgcolor: store.platform === 'shopify' ? '#e0e7ff' : '#fce7f3',
                            color: store.platform === 'shopify' ? '#3730a3' : '#9d174d'
                          }}
                        />
                        <Chip
                          label={store.status}
                          size="small"
                          color={store.status === 'active' ? 'success' : 'error'}
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                        />
                      </Stack>
                    </Stack>

                    <Divider sx={{ my: 1.5 }} />

                    <Grid container spacing={1} sx={{ mb: 2 }}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Synced Orders</Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{store.order_count || 0}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Catalog Items</Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{store.product_count || 0}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">
                          Last Synced: {store.last_orders_sync ? formatDate(store.last_orders_sync) : 'Never'}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={isSyncing ? <CircularProgress size={16} /> : <SyncIcon />}
                        disabled={isSyncing}
                        onClick={() => handleSyncStore(store.id)}
                      >
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                      </Button>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteStore(store.id, store.label)}
                        title="Remove store"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Add Store Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Connect Store</DialogTitle>
        <DialogContent>
          <Tabs
            value={platformTab}
            onChange={(_e, val) => { setPlatformTab(val); setTestResult(null); }}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5 }}
          >
            <Tab label="Shopify (GraphQL)" />
            <Tab label="WooCommerce (REST)" />
          </Tabs>

          {platformTab === 0 ? (
            <Stack spacing={2}>
              <TextField
                label="Shopify Domain"
                placeholder="mystore.myshopify.com"
                size="small"
                fullWidth
                value={shopifyDomain}
                onChange={(e) => setShopifyDomain(e.target.value)}
                helperText="Your Shopify .myshopify.com subdomain or custom domain"
              />
              <TextField
                label="Store Display Name"
                placeholder="My Flagship Store"
                size="small"
                fullWidth
                value={shopifyLabel}
                onChange={(e) => setShopifyLabel(e.target.value)}
              />
              <TextField
                label="Admin API Access Token"
                placeholder="shpat_xxxxxxxxxxxxxxxxxxxx"
                type="password"
                size="small"
                fullWidth
                value={shopifyToken}
                onChange={(e) => setShopifyToken(e.target.value)}
                helperText="Created in Shopify Admin -> Settings -> Apps -> App development"
              />
              <TextField
                label="Currency Code"
                placeholder="PKR"
                size="small"
                fullWidth
                value={shopifyCurrency}
                onChange={(e) => setShopifyCurrency(e.target.value.toUpperCase())}
              />
            </Stack>
          ) : (
            <Stack spacing={2}>
              <TextField
                label="WooCommerce Store URL"
                placeholder="https://mystore.com"
                size="small"
                fullWidth
                value={wooDomain}
                onChange={(e) => setWooDomain(e.target.value)}
                helperText="Full HTTPS URL to your WordPress / WooCommerce site"
              />
              <TextField
                label="Store Display Name"
                placeholder="Main Woo Store"
                size="small"
                fullWidth
                value={wooLabel}
                onChange={(e) => setWooLabel(e.target.value)}
              />
              <TextField
                label="Consumer Key"
                placeholder="ck_xxxxxxxxxxxxxxxxxxxx"
                size="small"
                fullWidth
                value={wooKey}
                onChange={(e) => setWooKey(e.target.value)}
              />
              <TextField
                label="Consumer Secret"
                placeholder="cs_xxxxxxxxxxxxxxxxxxxx"
                type="password"
                size="small"
                fullWidth
                value={wooSecret}
                onChange={(e) => setWooSecret(e.target.value)}
                helperText="Generated in WooCommerce -> Settings -> Advanced -> REST API"
              />
            </Stack>
          )}

          {testResult && (
            <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
              {testResult.message}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing ? <CircularProgress size={18} /> : 'Test Connection'}
          </Button>

          <Stack direction="row" spacing={1}>
            <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSaveStore}
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={18} color="inherit" /> : 'Save & Sync'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
