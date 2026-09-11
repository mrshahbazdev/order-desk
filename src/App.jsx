import React, { useState, useEffect } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Chip,
  Stack,
  Tooltip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ShoppingCart as OrdersIcon,
  Storefront as StoreIcon,
  Inventory2 as ProductsIcon,
  Print as PrintIcon,
  Sync as SyncIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  CheckCircle as OnlineIcon,
  CloudOff as OfflineIcon,
  QrCodeScanner as ScanIcon,
  LocalShipping as LogisticsIcon,
  AssignmentReturn as ReturnsIcon,
  Layers as WaveIcon,
  TrendingDown as ForecastIcon,
  People as StaffIcon,
  HeadsetMic as SupportIcon,
  MenuBook as GuideIcon
} from '@mui/icons-material';
import theme from './theme';

import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Stores from './pages/Stores';
import Products from './pages/Products';
import PrintCenter from './pages/PrintCenter';
import SyncHealth from './pages/SyncHealth';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import PackStation from './pages/PackStation';
import Logistics from './pages/Logistics';
import Returns from './pages/Returns';
import WarehouseWaves from './pages/WarehouseWaves';
import InventoryForecast from './pages/InventoryForecast';
import StaffAnalytics from './pages/StaffAnalytics';
import Support from './pages/Support';
import Guide from './pages/Guide';
import { ToastProvider } from './components/ToastProvider';
import ErrorBoundary from './components/ErrorBoundary';

const DRAWER_WIDTH = 250;

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { id: 'orders', label: 'Orders', icon: <OrdersIcon />, badgeKey: 'unfulfilled' },
  { id: 'pack', label: 'Pack Station', icon: <ScanIcon /> },
  { id: 'logistics', label: 'Logistics & Couriers', icon: <LogisticsIcon /> },
  { id: 'waves', label: 'Wave Picking & Bins', icon: <WaveIcon /> },
  { id: 'returns', label: 'Returns & Exchanges', icon: <ReturnsIcon /> },
  { id: 'forecast', label: 'Inventory & Forecast', icon: <ForecastIcon /> },
  { id: 'staff', label: 'Staff & Productivity', icon: <StaffIcon /> },
  { id: 'products', label: 'Products & Stock', icon: <ProductsIcon /> },
  { id: 'print', label: 'Print Studio', icon: <PrintIcon /> },
  { id: 'reports', label: 'Reports', icon: <ReportsIcon /> },
  { id: 'stores', label: 'Stores & Channels', icon: <StoreIcon /> },
  { id: 'sync', label: 'Sync Health', icon: <SyncIcon /> },
  { id: 'guide', label: 'User Guide & FAQ', icon: <GuideIcon /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
  { id: 'support', label: 'Developer Support', icon: <SupportIcon /> }
];

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [unfulfilledCount, setUnfulfilledCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState({ status: 'idle', message: 'Local database ready' });

  // Update online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync and metrics updates
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const m = await window.api.orders.getMetrics();
        if (m) setUnfulfilledCount(m.unfulfilledCount || 0);
      } catch (err) {
        console.error(err);
      }
    };

    fetchMetrics();

    const unsubStatus = window.api.on('sync:status', (data) => {
      setSyncStatus(data);
      fetchMetrics();
    });

    const unsubComplete = window.api.on('sync:complete', () => {
      fetchMetrics();
    });

    return () => {
      unsubStatus();
      unsubComplete();
    };
  }, []);

  const handleNavigate = (page, orderId = null) => {
    setSelectedOrderId(orderId);
    setCurrentPage(page);
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} onSelectOrder={(id) => handleNavigate('orders', id)} />;
      case 'orders':
        return <Orders initialSelectedOrderId={selectedOrderId} />;
      case 'pack':
        return <PackStation />;
      case 'logistics':
        return <Logistics />;
      case 'waves':
        return <WarehouseWaves />;
      case 'returns':
        return <Returns />;
      case 'forecast':
        return <InventoryForecast />;
      case 'staff':
        return <StaffAnalytics />;
      case 'stores':
        return <Stores />;
      case 'products':
        return <Products />;
      case 'print':
        return <PrintCenter />;
      case 'sync':
        return <SyncHealth />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'guide':
        return <Guide />;
      case 'support':
        return <Support />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastProvider>
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f4f6f8' }}>
        {/* Sidebar Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              bgcolor: '#0f172a',
              color: '#f8fafc',
              borderRight: '1px solid #1e293b'
            }
          }}
        >
          {/* App Brand Header */}
          <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 1.5,
                bgcolor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 900,
                fontSize: 18
              }}
            >
              OD
            </Box>
            <div>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                Order Desk
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                Local-First Multi-Store
              </Typography>
            </div>
          </Box>

          <Divider sx={{ borderColor: '#1e293b' }} />

          {/* Navigation Items */}
          <List sx={{ px: 1.5, py: 1.5 }}>
            {NAV_ITEMS.map((item) => {
              const isSelected = currentPage === item.id;
              const badgeVal = item.badgeKey === 'unfulfilled' ? unfulfilledCount : 0;

              return (
                <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => handleNavigate(item.id)}
                    sx={{
                      borderRadius: 1.5,
                      py: 1,
                      px: 1.5,
                      color: isSelected ? '#ffffff' : '#94a3b8',
                      bgcolor: isSelected ? '#1e293b !important' : 'transparent',
                      '&:hover': {
                        bgcolor: '#1e293b',
                        color: '#ffffff'
                      }
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 36,
                        color: isSelected ? '#3b82f6' : '#64748b'
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: isSelected ? 700 : 500
                      }}
                    />
                    {badgeVal > 0 && (
                      <Chip
                        label={badgeVal}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          bgcolor: '#d97706',
                          color: '#ffffff'
                        }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>

          <Box sx={{ mt: 'auto', p: 2, borderTop: '1px solid #1e293b' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              {isOnline ? (
                <OnlineIcon sx={{ fontSize: 16, color: '#22c55e' }} />
              ) : (
                <OfflineIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
              )}
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                {isOnline ? 'Network Connected' : 'Offline Mode (Local DB)'}
              </Typography>
            </Stack>
          </Box>
        </Drawer>

        {/* Main Content Area */}
        <Box component="main" sx={{ flexGrow: 1, height: '100vh', overflow: 'auto', bgcolor: '#f8fafc' }}>
          <ErrorBoundary screen={currentPage} key={currentPage}>
            {renderContent()}
          </ErrorBoundary>
        </Box>
      </Box>
      </ToastProvider>
    </ThemeProvider>
  );
}
