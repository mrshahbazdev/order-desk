import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Divider,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  VpnKey as KeyIcon,
  CheckCircle as CheckIcon,
  Store as StoreIcon,
  Receipt as ReceiptIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import DemoModeCard from '../components/DemoModeCard';

export default function Settings() {
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('INV-2026-');

  // License state
  const [licenseInfo, setLicenseInfo] = useState({ tier: 'free', label: 'Free Tier' });
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [activatingLicense, setActivatingLicense] = useState(false);

  // App info
  const [appInfo, setAppInfo] = useState({});
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [all, lic, app] = await Promise.all([
        window.api.settings.getAll(),
        window.api.license.get(),
        window.api.settings.getAppInfo()
      ]);

      if (all) {
        setStoreName(all.store_name || 'Skulane');
        setStoreAddress(all.store_address || 'Lahore Commercial Hub, Pakistan');
        setStorePhone(all.store_phone || '+92 300 1234567');
        setStoreEmail(all.store_email || 'mrshahbaznns@gmail.com');
        setInvoicePrefix(all.invoice_prefix || 'INV-2026-');
      }

      setLicenseInfo(lic || { tier: 'free', label: 'Free Tier' });
      setAppInfo(app || {});
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await Promise.all([
        window.api.settings.set('store_name', storeName),
        window.api.settings.set('store_address', storeAddress),
        window.api.settings.set('store_phone', storePhone),
        window.api.settings.set('store_email', storeEmail),
        window.api.settings.set('invoice_prefix', invoicePrefix)
      ]);
      setAlert({ type: 'success', message: 'Settings saved successfully!' });
    } catch (err) {
      setAlert({ type: 'error', message: 'Save error: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleActivateLicense = async () => {
    if (!licenseKeyInput.trim()) return;
    try {
      setActivatingLicense(true);
      const res = await window.api.license.activate(licenseKeyInput.trim());
      setLicenseInfo(res);
      setAlert({ type: 'success', message: `License activated successfully: ${res.tier?.toUpperCase()} tier!` });
      setLicenseKeyInput('');
    } catch (err) {
      setAlert({ type: 'error', message: 'License activation error: ' + err.message });
    } finally {
      setActivatingLicense(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
            Settings & Preferences
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure merchant information, invoice numbering, and offline licenses
          </Typography>
        </div>

        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
          onClick={handleSaveSettings}
          disabled={saving}
        >
          Save Changes
        </Button>
      </Box>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Merchant & Branding Info */}
        <Grid item xs={12} md={6}>
          <Card sx={{ border: '1px solid #e2e8f0', height: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <StoreIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Merchant Information</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Printed on invoice headers and shipping label sender sections.
              </Typography>

              <Stack spacing={2}>
                <TextField
                  label="Business / Store Name"
                  size="small"
                  fullWidth
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />
                <TextField
                  label="Dispatch / Physical Address"
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                />
                <TextField
                  label="Contact Phone"
                  size="small"
                  fullWidth
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                />
                <TextField
                  label="Support Email"
                  size="small"
                  fullWidth
                  value={storeEmail}
                  onChange={(e) => setStoreEmail(e.target.value)}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Licensing & System */}
        <Grid item xs={12} md={6}>
          <Stack spacing={3}>
            {/* Demo Mode Card */}
            <DemoModeCard onDataChanged={loadSettings} />

            {/* License Card */}
            <Card sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <KeyIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>App License</Typography>
                  </Stack>
                  <Chip
                    label={licenseInfo.label || 'Free Tier'}
                    color={licenseInfo.tier === 'free' ? 'default' : 'success'}
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {licenseInfo.tier === 'free'
                    ? 'Free tier includes 1 connected store and basic documents. Upgrade to Pro/Business for unlimited stores and batch print.'
                    : `Active License (${licenseInfo.tier?.toUpperCase()}). Registered to ${licenseInfo.email || 'Merchant'}. Max stores: ${licenseInfo.maxStores || 'Unlimited'}`}
                </Typography>

                <Stack direction="row" spacing={1}>
                  <TextField
                    placeholder="Paste your Ed25519 license key..."
                    size="small"
                    fullWidth
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleActivateLicense}
                    disabled={activatingLicense || !licenseKeyInput.trim()}
                  >
                    Activate
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* System Info */}
            <Card sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  App & Storage Info
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Developer:</strong> Muhammad Shahbaz
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Version:</strong> {appInfo.version || '1.0.2'} (Local-first)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Storage:</strong> SQLite3 with WAL mode & SafeStorage DPAPI encryption
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all', mt: 0.5 }}>
                  <strong>Data Path:</strong> {appInfo.userDataPath || '-'}
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
