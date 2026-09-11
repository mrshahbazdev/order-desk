import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Box,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  Science as DemoIcon,
  PlayArrow as LoadIcon,
  DeleteSweep as ClearIcon,
  CheckCircle as ActiveIcon
} from '@mui/icons-material';

export default function DemoModeCard({ onDataChanged }) {
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      if (window.api?.demo?.status) {
        const res = await window.api.demo.status();
        setIsDemoActive(Boolean(res?.isDemoLoaded));
      }
    } catch (e) {
      console.error('Failed to check demo status:', e);
    }
  };

  const handleLoadDemo = async () => {
    try {
      setLoading(true);
      setAlert(null);
      await window.api.demo.load();
      setIsDemoActive(true);
      setAlert({ type: 'success', message: 'Demo dataset loaded across all 13+ modules.' });
      if (onDataChanged) onDataChanged();
    } catch (err) {
      setAlert({ type: 'error', message: `Failed to load demo data: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleClearDemo = async () => {
    try {
      setLoading(true);
      setAlert(null);
      await window.api.demo.clear();
      setIsDemoActive(false);
      setAlert({ type: 'info', message: 'Demo data cleared from database.' });
      if (onDataChanged) onDataChanged();
    } catch (err) {
      setAlert({ type: 'error', message: `Failed to clear demo data: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <DemoIcon sx={{ fontSize: 20 }} />
            </Box>
            <div>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Operational Demo Mode
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Simulate multi-channel stores, wave picking, returns, and shipments
              </Typography>
            </div>
          </Stack>

          {isDemoActive ? (
            <Chip
              icon={<ActiveIcon sx={{ fontSize: '14px !important' }} />}
              label="Demo Active"
              color="primary"
              size="small"
              sx={{ fontWeight: 700, height: 22, fontSize: '0.7rem' }}
            />
          ) : (
            <Chip
              label="Demo Inactive"
              size="small"
              sx={{ fontWeight: 700, height: 22, fontSize: '0.7rem', bgcolor: '#f1f5f9' }}
            />
          )}
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Populate realistic Shopify & WooCommerce orders, products with barcodes, wave picking batches, carrier shipments, COD reconciliations, and staff analytics to explore Order Desk without connecting real stores.
        </Typography>

        {alert && (
          <Alert severity={alert.type} sx={{ mb: 2 }} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="contained"
            size="small"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <LoadIcon />}
            onClick={handleLoadDemo}
            disabled={loading}
            sx={{ fontWeight: 700, textTransform: 'none', bgcolor: '#2563eb' }}
          >
            {isDemoActive ? 'Reload Demo Data' : 'Load Demo Data'}
          </Button>

          {isDemoActive && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleClearDemo}
              disabled={loading}
              sx={{ fontWeight: 700, textTransform: 'none' }}
            >
              Clear Demo Data
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
