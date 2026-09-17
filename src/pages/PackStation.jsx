import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, LinearProgress, Button,
  TextField, IconButton, Divider, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Drawer, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, FormControlLabel, Switch,
  MenuItem, Select, InputAdornment, Card, CardContent, Badge,
  Alert, AlertTitle, Avatar, AvatarGroup
} from '@mui/material';
import {
  QrCodeScanner as ScanIcon,
  CheckCircle as DoneIcon,
  Cancel as CancelIcon,
  LocalShipping as ShipIcon,
  SkipNext as NextIcon,
  Settings as SettingsIcon,
  Science as DemoIcon,
  FormatListBulleted as QueueIcon,
  Assessment as StatsIcon,
  VolumeUp as SoundOnIcon,
  VolumeOff as SoundOffIcon,
  AddShoppingCart as ManualAddIcon,
  DoneAll as DoneAllIcon,
  Timer as TimerIcon,
  Inventory2 as BoxIcon,
  Scale as ScaleIcon,
  PersonOutline as PackerIcon,
  Print as PrintIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  WarningAmber as WarningIcon,
  Visibility as PreviewIcon,
  Storefront as StoreIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  ArrowForward as ArrowForwardIcon,
  FilterList as FilterIcon,
  ShoppingBag as BagIcon,
  Clear as ClearIcon,
  PlayArrow as PlayIcon,
  FlashOn as FlashIcon
} from '@mui/icons-material';
import { formatMoney } from '../utils/formatters';

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
};

const STATE = {
  WAITING: 'waiting',
  PACKING: 'packing',
  COMPLETE: 'complete'
};

// Sound synthesizer using Web Audio API
function useBeeper() {
  const ctxRef = useRef(null);

  return useCallback((kind, muted = false) => {
    if (muted) return;
    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const tones = {
        ok: [880, 0.09, 'sine'],
        match: [1046.5, 0.12, 'sine'],
        done: [1318.5, 0.3, 'sine'],
        error: [220, 0.35, 'sawtooth'],
        sample: [659.25, 0.15, 'triangle']
      };
      const [freq, dur, oscType] = tones[kind] || tones.ok;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = oscType || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {
      // audio blocked or unsupported
    }
  }, []);
}

export default function PackStation() {
  const [mode, setMode] = useState(STATE.WAITING);
  const [order, setOrder] = useState(null);
  const [session, setSession] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [buffer, setBuffer] = useState('');
  const [busy, setBusy] = useState(false);
  const [packedToday, setPackedToday] = useState(0);
  const [packerName, setPackerName] = useState('Ali');
  const [muted, setMuted] = useState(false);

  // Live Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);

  // Weight & Box selection
  const [boxType, setBoxType] = useState('small_box');
  const [parcelWeight, setParcelWeight] = useState('0.55');
  const [courierName, setCourierName] = useState('Trax Express');
  const [trackingNumber, setTrackingNumber] = useState('');

  // Print & Fulfill preferences
  const [printPrefs, setPrintPrefs] = useState({
    packingSlip: true,
    label: true,
    thermal: true,
    notifyCustomer: true
  });

  // Modals & Drawers
  const [queueOpen, setQueueOpen] = useState(false);
  const [queueOrders, setQueueOrders] = useState([]);
  const [queueSearch, setQueueSearch] = useState('');
  const [queueStoreFilter, setQueueStoreFilter] = useState('all');
  const [queueTypeFilter, setQueueTypeFilter] = useState('all'); // 'all', 'single', 'multi', 'partial'
  const [storesList, setStoresList] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);

  const [statsOpen, setStatsOpen] = useState(false);
  const [statsData, setStatsData] = useState(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHTML, setPreviewHTML] = useState('');

  const inputRef = useRef(null);
  const beep = useBeeper();

  // Focus lock
  const grabFocus = useCallback(() => {
    if (inputRef.current && !busy && !queueOpen && !statsOpen && !settingsOpen && !previewOpen) {
      inputRef.current.focus();
    }
  }, [busy, queueOpen, statsOpen, settingsOpen, previewOpen]);

  useEffect(() => {
    grabFocus();
    const id = setInterval(grabFocus, 1000);
    window.addEventListener('click', grabFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('click', grabFocus);
    };
  }, [grabFocus]);

  // Initial load
  useEffect(() => {
    if (window.api?.settings) {
      window.api.settings.get('packed_today_count', 0).then((n) => setPackedToday(Number(n) || 0));
      window.api.settings.get('packer_name', 'Operator 1').then((name) => setPackerName(name || 'Operator 1'));
    }
    loadQueue();
  }, []);

  // Timer runner
  useEffect(() => {
    if (mode === STATE.PACKING || mode === STATE.COMPLETE) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode]);

  const flash = (type, message, detail) => {
    setFeedback({ type, message, detail, at: Date.now() });
    beep(type === 'error' ? 'error' : type === 'done' ? 'done' : 'match', muted);
  };

  const loadQueue = async (searchTerm = queueSearch, storeId = queueStoreFilter, type = queueTypeFilter) => {
    setQueueLoading(true);
    try {
      if (window.api?.pack?.queue) {
        const list = await window.api.pack.queue({
          search: searchTerm,
          store_id: storeId,
          type
        });
        setQueueOrders(list || []);
      }
      if (window.api?.stores?.list) {
        const st = await window.api.stores.list();
        setStoresList(st || []);
      }
    } catch (e) {
      console.error('Failed to load queue:', e);
    } finally {
      setQueueLoading(false);
    }
  };

  const openStats = async () => {
    setStatsOpen(true);
    try {
      if (window.api?.pack?.stats) {
        const stats = await window.api.pack.stats({ days: 7 });
        const problems = await window.api.pack.problems({ limit: 15 });
        setStatsData({ ...stats, problems });
      }
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  };

  // --------------------------------------------------------------- Scan handling
  const handleScan = async (raw) => {
    const code = raw.trim();
    if (!code || busy) return;
    setBuffer('');
    setBusy(true);

    try {
      if (mode === STATE.WAITING) {
        const res = await window.api.pack.lookup(code);
        if (!res || !res.found) {
          flash('error', 'Order not found', `Nothing matches "${code}". Try Demo Order or Unfulfilled Queue.`);
          return;
        }
        if (res.alreadyFulfilled) {
          flash('error', 'Already fulfilled', `${res.order.name} was shipped earlier`);
          return;
        }
        loadOrderSession(res);
        return;
      }

      if (mode === STATE.PACKING) {
        const res = await window.api.pack.scan({ sessionId: session.id, code });

        if (res.result === 'unexpected') {
          flash('error', 'Wrong Item', res.message);
          return;
        }
        if (res.result === 'overscan') {
          flash('error', 'Already Packed', res.message);
          return;
        }

        setChecklist(res.checklist);
        if (res.complete) {
          setMode(STATE.COMPLETE);
          flash('done', 'All Items Verified!', 'Press [Enter] or click "Print & Ship" to complete.');
        } else {
          flash('ok', `Verified: ${res.item?.title || 'Item'}`, `${res.remaining} item${res.remaining === 1 ? '' : 's'} remaining`);
        }
      }
    } catch (err) {
      flash('error', 'Scan Error', err.message);
    } finally {
      setBusy(false);
      setTimeout(grabFocus, 50);
    }
  };

  // Helper to load order session state
  const loadOrderSession = (res) => {
    setOrder(res.order);
    setSession(res.session);
    setChecklist(res.checklist || []);
    setElapsedSeconds(0);
    setTrackingNumber(`TRK-${Math.floor(10000000 + Math.random() * 90000000)}`);

    const allDone = res.checklist?.every((i) => i.complete);
    if (allDone && res.checklist.length > 0) {
      setMode(STATE.COMPLETE);
      flash('done', `${res.order.name} Ready`, 'All items already scanned. Ready to ship.');
    } else {
      setMode(STATE.PACKING);
      const total = res.checklist?.reduce((s, i) => s + i.qty, 0) || 0;
      flash('ok', `Order Loaded: ${res.order.name}`, `${total} item${total === 1 ? '' : 's'} to scan.`);
    }
  };

  // Manual pack an item directly from UI
  const handleManualPack = async (itemId) => {
    if (!session || busy) return;
    setBusy(true);
    try {
      const res = await window.api.pack.manualPack({ sessionId: session.id, itemId });
      if (res.result === 'unexpected' || res.result === 'overscan') {
        flash('error', res.result === 'overscan' ? 'Already Packed' : 'Scan Issue', res.message);
        return;
      }
      setChecklist(res.checklist);
      if (res.complete) {
        setMode(STATE.COMPLETE);
        flash('done', 'All Items Verified!', 'Press [Enter] to print and complete fulfilment.');
      } else {
        flash('ok', `Packed: ${res.item?.title || 'Item'}`, `${res.remaining} item${res.remaining === 1 ? '' : 's'} left`);
      }
    } catch (err) {
      flash('error', 'Action Failed', err.message);
    } finally {
      setBusy(false);
      setTimeout(grabFocus, 50);
    }
  };

  // Unpack an item (decrement packed count)
  const handleUnpackItem = (itemId) => {
    if (!session || busy) return;
    setChecklist((prev) => {
      const updated = prev.map((it) => {
        if (it.id === itemId && it.packed > 0) {
          const newPacked = it.packed - 1;
          return { ...it, packed: newPacked, complete: newPacked >= it.qty };
        }
        return it;
      });
      const allDone = updated.every((it) => it.complete);
      if (!allDone && mode === STATE.COMPLETE) {
        setMode(STATE.PACKING);
      }
      return updated;
    });
  };

  // Partial shipment dialog state & handlers
  const [partialDialogOpen, setPartialDialogOpen] = useState(false);
  const [partialCustomerNote, setPartialCustomerNote] = useState('');

  const handleOpenPartialDialog = () => {
    const packedCount = checklist.reduce((s, i) => s + Math.min(i.packed, i.qty), 0);
    const totalCount = checklist.reduce((s, i) => s + i.qty, 0);
    setPartialCustomerNote(
      `Partial shipment: ${packedCount} of ${totalCount} items dispatched. Remaining ${totalCount - packedCount} item(s) on backorder.`
    );
    setPartialDialogOpen(true);
  };

  const handleConfirmPartialShip = async () => {
    if (!session || busy) return;
    setBusy(true);
    setPartialDialogOpen(false);
    try {
      await window.api.pack.finish({
        sessionId: session.id,
        orderId: order.id,
        print: {
          ...printPrefs,
          trackingCompany: courierName,
          trackingNumber: trackingNumber,
          weight: parcelWeight,
          boxType: boxType
        },
        fulfill: true,
        isPartial: true,
        packedItems: checklist,
        customerNote: partialCustomerNote
      });

      const n = packedToday + 1;
      setPackedToday(n);
      if (window.api?.settings) {
        window.api.settings.set('packed_today_count', String(n));
      }

      flash(
        'done',
        `Partially Shipped: ${order.name}`,
        `${packedQty} of ${totalQty} items dispatched. Status set to Partial.`
      );
      resetStation();
      loadQueue();
    } catch (err) {
      flash('error', 'Partial Fulfilment Error', err.message);
    } finally {
      setBusy(false);
      setTimeout(grabFocus, 50);
    }
  };

  // Pack all items of an order in 1-click
  const handlePackAllItems = async () => {
    if (!session || busy) return;
    setBusy(true);
    try {
      let currentChecklist = checklist;
      for (const it of currentChecklist) {
        const remaining = it.qty - it.packed;
        for (let j = 0; j < remaining; j++) {
          const res = await window.api.pack.scan({ sessionId: session.id, code: it.sku || String(it.id) });
          currentChecklist = res.checklist;
        }
      }
      setChecklist(currentChecklist);
      setMode(STATE.COMPLETE);
      flash('done', 'All Items Verified!', 'Order is packed. Click "Print & Ship" or press [Enter].');
    } catch (err) {
      flash('error', 'Pack All Failed', err.message);
    } finally {
      setBusy(false);
      setTimeout(grabFocus, 50);
    }
  };

  // Load a Demo Sample Order
  const handleLoadDemoOrder = async () => {
    setBusy(true);
    try {
      beep('sample', muted);
      const res = await window.api.pack.createSample();
      if (res && res.found) {
        loadOrderSession(res);
        loadQueue();
      } else {
        flash('error', 'Could not create demo order', 'Please check database status');
      }
    } catch (err) {
      flash('error', 'Demo Order Failed', err.message);
    } finally {
      setBusy(false);
      setTimeout(grabFocus, 50);
    }
  };

  // Pull next unfulfilled order
  const loadNext = async () => {
    setBusy(true);
    try {
      const next = await window.api.pack.next();
      if (next) {
        await handleScan(next.name || String(next.id));
      } else {
        flash('ok', 'Queue is Empty', 'No unfulfilled orders found. Click "Load Demo Order" to test.');
      }
    } catch (err) {
      flash('error', 'Could not pull next order', err.message);
    } finally {
      setBusy(false);
      setTimeout(grabFocus, 50);
    }
  };

  // Complete Order
  const completeOrder = async () => {
    if (!session || busy) return;
    setBusy(true);
    try {
      await window.api.pack.finish({
        sessionId: session.id,
        orderId: order.id,
        print: {
          ...printPrefs,
          trackingCompany: courierName,
          trackingNumber: trackingNumber,
          weight: parcelWeight,
          boxType: boxType
        },
        fulfill: true
      });

      const n = packedToday + 1;
      setPackedToday(n);
      if (window.api?.settings) {
        window.api.settings.set('packed_today_count', String(n));
      }

      if (window.api?.staff?.logPackAudit) {
        window.api.staff.logPackAudit({
          order_id: order.id,
          staff_name: 'Lead Operator',
          duration_seconds: elapsedSeconds,
          items_packed: checklist.reduce((s, i) => s + i.packed, 0) || 1,
          verification_status: 'verified'
        }).catch(() => {});
      }

      flash('done', `Fulfilled: ${order.name}`, `Processed in ${elapsedSeconds}s. Ready for next order!`);
      resetStation();
      loadQueue();
    } catch (err) {
      flash('error', 'Fulfilment Error', err.message);
    } finally {
      setBusy(false);
      setTimeout(grabFocus, 50);
    }
  };

  const resetStation = () => {
    setOrder(null);
    setSession(null);
    setChecklist([]);
    setMode(STATE.WAITING);
    setElapsedSeconds(0);
  };

  const abandon = async () => {
    if (session) await window.api.pack.abandon(session.id);
    resetStation();
    flash('ok', 'Station Cleared', 'Ready to scan another order.');
  };

  // Preview Print HTML
  const handleOpenPreview = async (kind = 'label') => {
    if (!order) return;
    try {
      const html = await window.api.print.previewHTML({
        kind,
        order,
        options: {
          trackingCompany: courierName,
          trackingNumber: trackingNumber,
          isThermal: printPrefs.thermal
        }
      });
      setPreviewHTML(html);
      setPreviewOpen(true);
    } catch (e) {
      flash('error', 'Preview Failed', e.message);
    }
  };

  // Keyboard Navigation: Enter completes, Esc abandons, F2 next
  useEffect(() => {
    const onKey = (e) => {
      if (queueOpen || statsOpen || settingsOpen || previewOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        abandon();
      }
      if (e.key === 'F2' && mode === STATE.WAITING) {
        e.preventDefault();
        loadNext();
      }
      if (e.key === 'Enter' && mode === STATE.COMPLETE && !buffer) {
        e.preventDefault();
        completeOrder();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const totalQty = checklist.reduce((s, i) => s + i.qty, 0);
  const packedQty = checklist.reduce((s, i) => s + Math.min(i.packed, i.qty), 0);
  const progress = totalQty ? Math.round((packedQty / totalQty) * 100) : 0;

  const bannerBg =
    feedback?.type === 'error'
      ? '#ef4444'
      : feedback?.type === 'done'
      ? '#10b981'
      : '#2563eb';

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <Box sx={{ p: 3, minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 2.5, bgcolor: '#f8fafc' }}>
      {/* Top Navigation & Station Control Bar */}
      <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#fff' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ScanIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  Pack Station Pro
                </Typography>
                <Chip label="High-Speed Warehouse Mode" size="small" color="primary" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }} />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Operator: <strong>{packerName}</strong> · Press <strong>F2</strong> for Next · <strong>Esc</strong> to Reset
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Tooltip title="Toggle audio beeps">
              <IconButton
                onClick={() => setMuted(!muted)}
                size="small"
                sx={{ border: '1px solid #e2e8f0', color: muted ? '#94a3b8' : '#2563eb' }}
              >
                {muted ? <SoundOffIcon /> : <SoundOnIcon />}
              </IconButton>
            </Tooltip>

            <Chip
              icon={<DoneIcon />}
              label={`${packedToday} Packed Today`}
              color="success"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />

            {/* Load Demo Order Button */}
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<DemoIcon />}
              onClick={handleLoadDemoOrder}
              disabled={busy}
              sx={{ fontWeight: 700, textTransform: 'none', borderStyle: 'dashed' }}
            >
              Load Demo Order
            </Button>

            {/* Unfulfilled Orders Queue Drawer Toggle */}
            <Badge badgeContent={queueOrders.length} color="error">
              <Button
                variant="outlined"
                startIcon={<QueueIcon />}
                onClick={() => {
                  loadQueue();
                  setQueueOpen(true);
                }}
                sx={{ fontWeight: 700, textTransform: 'none' }}
              >
                Order Queue
              </Button>
            </Badge>

            {/* Next Unfulfilled Order */}
            <Button
              variant="contained"
              startIcon={<NextIcon />}
              onClick={loadNext}
              disabled={mode !== STATE.WAITING || busy}
              sx={{ fontWeight: 700, textTransform: 'none', bgcolor: '#2563eb' }}
            >
              Next Order (F2)
            </Button>

            {/* Station Statistics */}
            <Tooltip title="Station Analytics & History">
              <IconButton onClick={openStats} sx={{ border: '1px solid #e2e8f0' }}>
                <StatsIcon />
              </IconButton>
            </Tooltip>

            {/* Settings */}
            <Tooltip title="Pack Station Settings">
              <IconButton onClick={() => setSettingsOpen(true)} sx={{ border: '1px solid #e2e8f0' }}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      {/* Main Scan Input Field */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          border: '2.5px solid',
          borderColor: bannerBg,
          borderRadius: 2,
          bgcolor: '#fff',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <ScanIcon sx={{ fontSize: 36, color: bannerBg }} />
          <TextField
            inputRef={inputRef}
            value={buffer}
            onChange={(e) => setBuffer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleScan(buffer);
              }
            }}
            onBlur={() => setTimeout(grabFocus, 50)}
            fullWidth
            autoFocus
            disabled={busy}
            placeholder={
              mode === STATE.WAITING
                ? 'Scan Order Barcode / #ID / Customer Name (or press F2)...'
                : 'Scan Item Barcode / SKU / Click Pill below...'
            }
            InputProps={{
              sx: {
                fontSize: { xs: 20, md: 26 },
                fontWeight: 700,
                letterSpacing: 0.5,
                fontFamily: 'monospace'
              },
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    variant="contained"
                    size="medium"
                    onClick={() => handleScan(buffer)}
                    disabled={!buffer.trim() || busy}
                    sx={{ textTransform: 'none', fontWeight: 700, bgcolor: bannerBg }}
                  >
                    Enter ↵
                  </Button>
                </InputAdornment>
              ),
              spellCheck: false
            }}
          />
        </Stack>

        {busy && <LinearProgress sx={{ mt: 1.5, borderRadius: 1 }} />}

        {/* Clickable Quick Scan Helper Chips when in Packing mode */}
        {order && checklist.length > 0 && (
          <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed #e2e8f0' }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mr: 1 }}>
                Quick Test / Touch Scan:
              </Typography>
              {checklist.map((it) => (
                <Tooltip key={it.id} title={`Simulate Barcode Scan: ${it.barcode || it.sku}`}>
                  <Chip
                    label={`${it.sku || it.title} (${it.packed}/${it.qty})`}
                    onClick={() => handleScan(it.barcode || it.sku || String(it.id))}
                    color={it.complete ? 'success' : 'primary'}
                    variant={it.complete ? 'filled' : 'outlined'}
                    size="small"
                    sx={{ fontWeight: 600, cursor: 'pointer', mb: 0.5 }}
                  />
                </Tooltip>
              ))}
            </Stack>
          </Box>
        )}
      </Paper>

      {/* Live Loud Audio-Visual Feedback Banner */}
      {feedback && (
        <Paper
          key={feedback.at}
          elevation={0}
          sx={{
            p: 2,
            bgcolor: bannerBg,
            color: '#fff',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 14px rgba(0,0,0,0.1)'
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.3 }}>
              {feedback.message}
            </Typography>
            {feedback.detail && (
              <Typography variant="body2" sx={{ opacity: 0.95, fontWeight: 500 }}>
                {feedback.detail}
              </Typography>
            )}
          </Box>
          <Chip
            label={feedback.type.toUpperCase()}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 800 }}
          />
        </Paper>
      )}

      {/* Order Packing Workspace */}
      {order && (
        <Paper elevation={0} sx={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden', bgcolor: '#fff' }}>
          {/* Order Header Info Card */}
          <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
              <Box>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    {order.name}
                  </Typography>
                  <Chip label={order.store_label || 'Store'} size="small" color="primary" sx={{ fontWeight: 700 }} />
                  <Chip
                    label={order.financial || 'paid'}
                    size="small"
                    color={order.financial === 'paid' ? 'success' : 'warning'}
                    variant="outlined"
                    sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                  />
                </Stack>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Customer: <strong>{order.customer?.name || order.customer_json?.name || order.email || 'Guest'}</strong> ·
                  {order.shipping_address?.city || order.ship_json?.city ? ` ${order.shipping_address?.city || order.ship_json?.city}, ${order.shipping_address?.province || ''}` : ' Local Delivery'}
                </Typography>

                {(order.shipping_address?.address1 || order.ship_json?.address1) && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                    {order.shipping_address?.address1 || order.ship_json?.address1}
                  </Typography>
                )}
              </Box>

              {/* Live Packing Timer & Items Progress */}
              <Stack direction="row" spacing={3} alignItems="center">
                <Box sx={{ textAlign: 'center', p: 1, px: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                    <TimerIcon sx={{ fontSize: 18, color: '#64748b' }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      PACK TIME
                    </Typography>
                  </Stack>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                    {formatTime(elapsedSeconds)}
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: progress === 100 ? '#10b981' : '#2563eb' }}>
                    {packedQty} / {totalQty}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    UNITS VERIFIED ({progress}%)
                  </Typography>
                </Box>
              </Stack>
            </Stack>

            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                mt: 2,
                height: 10,
                borderRadius: 5,
                bgcolor: '#e2e8f0',
                '& .MuiLinearProgress-bar': {
                  bgcolor: progress === 100 ? '#10b981' : '#2563eb'
                }
              }}
            />
          </Box>

          {/* Shipping Package & Parcel Specs Toolbar */}
          <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#fff', borderBottom: '1px solid #f1f5f9' }}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Stack direction="row" spacing={1} alignItems="center">
                <BoxIcon sx={{ color: '#64748b', fontSize: 20 }} />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>Package:</Typography>
                <Select
                  size="small"
                  value={boxType}
                  onChange={(e) => setBoxType(e.target.value)}
                  sx={{ height: 32, fontSize: '0.85rem', fontWeight: 600 }}
                >
                  <MenuItem value="flyer">Flyer Mailer (Polybag)</MenuItem>
                  <MenuItem value="small_box">Small Box (8x6x4)</MenuItem>
                  <MenuItem value="med_box">Medium Box (12x10x6)</MenuItem>
                  <MenuItem value="large_carton">Large Master Carton</MenuItem>
                </Select>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <ScaleIcon sx={{ color: '#64748b', fontSize: 20 }} />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>Weight:</Typography>
                <TextField
                  size="small"
                  value={parcelWeight}
                  onChange={(e) => setParcelWeight(e.target.value)}
                  sx={{ width: 90, '& input': { height: 16, py: 1, fontSize: '0.85rem', fontWeight: 700 } }}
                  InputProps={{ endAdornment: <Typography variant="caption">kg</Typography> }}
                />
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <ShipIcon sx={{ color: '#64748b', fontSize: 20 }} />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>Courier:</Typography>
                <Select
                  size="small"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  sx={{ height: 32, fontSize: '0.85rem', fontWeight: 600 }}
                >
                  <MenuItem value="Trax Express">Trax Express</MenuItem>
                  <MenuItem value="TCS Express">TCS Express</MenuItem>
                  <MenuItem value="PostEx Logistics">PostEx</MenuItem>
                  <MenuItem value="M&P Courier">M&P</MenuItem>
                  <MenuItem value="Leopard Courier">Leopards</MenuItem>
                  <MenuItem value="Self Delivery">Self / Driver</MenuItem>
                </Select>
              </Stack>

              <Box sx={{ flex: 1 }} />

              <Button
                size="small"
                variant="text"
                startIcon={<DoneAllIcon />}
                onClick={handlePackAllItems}
                disabled={mode === STATE.COMPLETE || busy}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Pack All Units
              </Button>

              <Button
                size="small"
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={() => handleOpenPreview('packing_slip')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Preview Slip
              </Button>
            </Stack>
          </Box>

          {/* Line Items Checklist Table */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, width: 60 }}>STATUS</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 70 }}>ITEM</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>DETAILS & SKU</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 140 }}>BARCODE</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: 130 }}>PACKED / QTY</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right', width: 160 }}>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {checklist.map((item) => (
                  <TableRow
                    key={item.id}
                    sx={{
                      bgcolor: item.complete ? '#f0fdf4' : 'inherit',
                      transition: 'background-color 0.2s',
                      '&:hover': { bgcolor: item.complete ? '#dcfce7' : '#f8fafc' }
                    }}
                  >
                    <TableCell>
                      {item.complete ? (
                        <DoneIcon sx={{ color: '#10b981', fontSize: 26 }} />
                      ) : (
                        <Box sx={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid #cbd5e1' }} />
                      )}
                    </TableCell>

                    <TableCell>
                      {item.image_url ? (
                        <Box
                          component="img"
                          src={item.image_url}
                          alt={item.title}
                          sx={{ width: 44, height: 44, borderRadius: 1.5, objectFit: 'cover', border: '1px solid #e2e8f0' }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 1.5,
                            bgcolor: '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8'
                          }}
                        >
                          <BoxIcon sx={{ fontSize: 20 }} />
                        </Box>
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        {item.title}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.3 }}>
                        <Chip
                          label={item.sku ? `SKU: ${item.sku}` : 'NO SKU'}
                          size="small"
                          sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                        />
                        {item.variant && (
                          <Typography variant="caption" color="text.secondary">
                            Option: {item.variant}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                        {item.barcode || '—'}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ textAlign: 'center' }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 900,
                          color: item.complete ? '#10b981' : '#0f172a'
                        }}
                      >
                        {item.packed} / {item.qty}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ textAlign: 'right' }}>
                      <Stack direction="row" spacing={0.8} justifyContent="flex-end" alignItems="center">
                        {item.packed > 0 && (
                          <Tooltip title="Unpack 1 unit">
                            <Button
                              size="small"
                              variant="outlined"
                              color="inherit"
                              onClick={() => handleUnpackItem(item.id)}
                              disabled={busy}
                              sx={{
                                minWidth: 32,
                                px: 1,
                                py: 0.4,
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                borderColor: '#cbd5e1',
                                color: '#64748b'
                              }}
                            >
                              -1
                            </Button>
                          </Tooltip>
                        )}
                        <Button
                          size="small"
                          variant="contained"
                          color={item.complete ? 'success' : 'primary'}
                          startIcon={<ManualAddIcon />}
                          disabled={item.complete || busy}
                          onClick={() => handleManualPack(item.id)}
                          sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem' }}
                        >
                          +1 Pack
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          {/* Fulfilment & Shipping Action Bar */}
          <Divider />
          <Box sx={{ p: 2.5, bgcolor: '#fff' }}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
              <Stack direction="row" spacing={2} alignItems="center">
                <FormControlLabel
                  control={
                    <Switch
                      checked={printPrefs.label}
                      onChange={(e) => setPrintPrefs({ ...printPrefs, label: e.target.checked })}
                      color="primary"
                    />
                  }
                  label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Print Thermal Label</Typography>}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={printPrefs.packingSlip}
                      onChange={(e) => setPrintPrefs({ ...printPrefs, packingSlip: e.target.checked })}
                      color="primary"
                    />
                  }
                  label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Print Packing Slip</Typography>}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={printPrefs.notifyCustomer}
                      onChange={(e) => setPrintPrefs({ ...printPrefs, notifyCustomer: e.target.checked })}
                      color="primary"
                    />
                  }
                  label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Notify Customer</Typography>}
                />
              </Stack>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={abandon}
                  disabled={busy}
                  sx={{ fontWeight: 700, textTransform: 'none' }}
                >
                  Clear (Esc)
                </Button>

                {/* Partial Shipment Option (e.g. 4 of 5 items packed) */}
                {packedQty > 0 && packedQty < totalQty && (
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<ShipIcon />}
                    onClick={handleOpenPartialDialog}
                    disabled={busy}
                    sx={{
                      fontWeight: 800,
                      textTransform: 'none',
                      fontSize: '0.95rem',
                      px: 2.5,
                      py: 1.2,
                      bgcolor: '#f59e0b',
                      color: '#fff',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
                      '&:hover': { bgcolor: '#d97706' }
                    }}
                  >
                    Ship Partial ({packedQty} of {totalQty} Items)
                  </Button>
                )}

                <Button
                  variant="contained"
                  size="large"
                  startIcon={<ShipIcon />}
                  disabled={mode !== STATE.COMPLETE || busy}
                  onClick={completeOrder}
                  sx={{
                    fontWeight: 900,
                    textTransform: 'none',
                    fontSize: '1.05rem',
                    px: 3.5,
                    py: 1.2,
                    bgcolor: mode === STATE.COMPLETE ? '#10b981' : '#2563eb',
                    '&:hover': { bgcolor: mode === STATE.COMPLETE ? '#059669' : '#1d4ed8' }
                  }}
                >
                  {mode === STATE.COMPLETE
                    ? 'Print & Ship Complete Order (Enter ↵)'
                    : `${totalQty - packedQty} Item(s) Remaining`}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Paper>
      )}

      {/* Waiting / Empty State with Quick Actions & Unfulfilled List */}
      {!order && (
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #e2e8f0',
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: '#fff'
          }}
        >
          <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <Box
              sx={{
                width: 72,
                height: 72,
                mx: 'auto',
                borderRadius: '50%',
                bgcolor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2
              }}
            >
              <ScanIcon sx={{ fontSize: 40 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
              Station Ready to Pack
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', mt: 1 }}>
              Scan an order barcode off a picking slip, type an order number (e.g. <code>#1001</code>), or choose an action below:
            </Typography>

            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<DemoIcon />}
                color="secondary"
                onClick={handleLoadDemoOrder}
                disabled={busy}
                sx={{ fontWeight: 800, textTransform: 'none', px: 3 }}
              >
                Load Demo Sample Order (Instant Test)
              </Button>
              <Button
                variant="contained"
                size="large"
                startIcon={<NextIcon />}
                onClick={loadNext}
                disabled={busy}
                sx={{ fontWeight: 800, textTransform: 'none', px: 3, bgcolor: '#2563eb' }}
              >
                Pull Oldest Unfulfilled (F2)
              </Button>
            </Stack>
          </Box>

          {/* Real Unfulfilled Orders List for Quick Packing */}
          <Box sx={{ p: 2.5, flex: 1, overflow: 'auto' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Pending Orders in Queue ({queueOrders.length})
              </Typography>
              <Button size="small" startIcon={<RefreshIcon />} onClick={loadQueue}>
                Refresh Queue
              </Button>
            </Stack>

            {queueOrders.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', color: '#94a3b8' }}>
                <Typography variant="body2">No pending unfulfilled orders found in the database.</Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  Click <strong>"Load Demo Sample Order"</strong> above to generate a sample order with barcodes!
                </Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>ORDER</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>CUSTOMER</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>CITY / DESTINATION</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>ITEMS SUMMARY</TableCell>
                    <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>UNITS</TableCell>
                    <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>ACTION</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {queueOrders.slice(0, 10).map((ord) => (
                    <TableRow key={ord.id} hover>
                      <TableCell sx={{ fontWeight: 700, color: '#2563eb' }}>
                        {ord.name}
                        <Chip label={ord.store_label} size="small" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
                      </TableCell>
                      <TableCell>{ord.customer_name}</TableCell>
                      <TableCell>{ord.city || '—'}</TableCell>
                      <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ord.items_summary || `${ord.item_count} item(s)`}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>
                        {ord.total_units || ord.item_count || 1}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<ScanIcon />}
                          onClick={() => handleScan(ord.name || String(ord.id))}
                          sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#2563eb' }}
                        >
                          Pack Now
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        </Paper>
      )}

      {/* Unfulfilled Orders Queue Drawer */}
      <Drawer
        anchor="right"
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 580, md: 620 },
            bgcolor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-8px 0 32px rgba(15,23,42,0.15)'
          }
        }}
      >
        {/* Top Sticky Header */}
        <Box sx={{ p: 2.5, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <QueueIcon fontSize="small" />
                </Box>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '1.15rem' }}>
                      Unfulfilled Orders Queue
                    </Typography>
                    <Chip
                      label={`${queueOrders.length} Pending`}
                      size="small"
                      color="primary"
                      sx={{ fontWeight: 700, height: 22, fontSize: '0.75rem' }}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Select any order to load into pack station or scan its barcode directly
                  </Typography>
                </Box>
              </Stack>
            </Box>
            <IconButton onClick={() => setQueueOpen(false)} size="small" sx={{ color: '#64748b' }}>
              <CancelIcon />
            </IconButton>
          </Stack>

          {/* Quick Action Buttons */}
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<NextIcon />}
              onClick={() => {
                setQueueOpen(false);
                loadNext();
              }}
              sx={{
                bgcolor: '#2563eb',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
                borderRadius: 1.5,
                boxShadow: 'none',
                '&:hover': { bgcolor: '#1d4ed8' }
              }}
            >
              Pack Next (F2)
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DemoIcon />}
              onClick={() => {
                handleLoadDemoOrder();
              }}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                borderRadius: 1.5,
                borderColor: '#cbd5e1',
                color: '#475569',
                bgcolor: '#fff',
                '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
              }}
            >
              + Load Demo Order
            </Button>
            <Box sx={{ flex: 1 }} />
            <Tooltip title="Refresh queue">
              <IconButton
                size="small"
                onClick={() => loadQueue()}
                disabled={queueLoading}
                sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5, bgcolor: '#fff' }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Search and Store Filter Row */}
          <Stack direction="row" spacing={1.5} sx={{ mt: 2 }} alignItems="center">
            <TextField
              size="small"
              placeholder="Search order #, customer, SKU, city..."
              value={queueSearch}
              onChange={(e) => {
                const val = e.target.value;
                setQueueSearch(val);
                loadQueue(val, queueStoreFilter, queueTypeFilter);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: queueSearch ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setQueueSearch('');
                        loadQueue('', queueStoreFilter, queueTypeFilter);
                      }}
                    >
                      <ClearIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null
              }}
              fullWidth
              sx={{
                bgcolor: '#f8fafc',
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  fontSize: '0.875rem'
                }
              }}
            />

            {storesList.length > 1 && (
              <Select
                size="small"
                value={queueStoreFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setQueueStoreFilter(val);
                  loadQueue(queueSearch, val, queueTypeFilter);
                }}
                sx={{
                  minWidth: 140,
                  bgcolor: '#f8fafc',
                  borderRadius: 2,
                  fontSize: '0.85rem'
                }}
              >
                <MenuItem value="all">All Stores</MenuItem>
                {storesList.map((st) => (
                  <MenuItem key={st.id} value={st.id}>
                    {st.label}
                  </MenuItem>
                ))}
              </Select>
            )}
          </Stack>

          {/* Filter Chips Bar */}
          <Stack direction="row" spacing={1} sx={{ mt: 1.5, overflowX: 'auto', pb: 0.5 }}>
            {[
              { key: 'all', label: 'All Orders' },
              { key: 'single', label: 'Single-Item' },
              { key: 'multi', label: 'Multi-Item' },
              { key: 'partial', label: 'Partial' }
            ].map((tab) => {
              const isSelected = queueTypeFilter === tab.key;
              return (
                <Chip
                  key={tab.key}
                  label={tab.label}
                  size="small"
                  clickable
                  onClick={() => {
                    setQueueTypeFilter(tab.key);
                    loadQueue(queueSearch, queueStoreFilter, tab.key);
                  }}
                  sx={{
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.78rem',
                    bgcolor: isSelected ? '#0f172a' : '#f1f5f9',
                    color: isSelected ? '#ffffff' : '#475569',
                    '&:hover': {
                      bgcolor: isSelected ? '#1e293b' : '#e2e8f0'
                    }
                  }}
                />
              );
            })}
          </Stack>
        </Box>

        {queueLoading && <LinearProgress />}

        {/* Orders List Body */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
          {queueOrders.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{
                p: 5,
                textAlign: 'center',
                borderRadius: 3,
                bgcolor: '#ffffff',
                borderStyle: 'dashed',
                borderColor: '#cbd5e1',
                mt: 3
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bgcolor: '#ecfdf5',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2
                }}
              >
                <DoneAllIcon sx={{ fontSize: 32 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
                All Caught Up!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mx: 'auto', mb: 3 }}>
                {queueSearch || queueTypeFilter !== 'all' || queueStoreFilter !== 'all'
                  ? 'No unfulfilled orders matched your current filters. Try resetting search or filter criteria.'
                  : 'There are no unfulfilled orders pending in the queue right now.'}
              </Typography>
              <Stack direction="row" spacing={1.5} justifyContent="center">
                {(queueSearch || queueTypeFilter !== 'all' || queueStoreFilter !== 'all') && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setQueueSearch('');
                      setQueueStoreFilter('all');
                      setQueueTypeFilter('all');
                      loadQueue('', 'all', 'all');
                    }}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                  >
                    Reset Filters
                  </Button>
                )}
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<DemoIcon />}
                  onClick={handleLoadDemoOrder}
                  sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#2563eb', borderRadius: 2 }}
                >
                  Load Demo Order
                </Button>
              </Stack>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {queueOrders.map((ord) => {
                const isActive = order && order.id === ord.id;
                const isSingle = (ord.total_units || ord.item_count) === 1;
                const isPartial = ord.fulfillment === 'partial';
                const isPaid = (ord.financial || '').toLowerCase() === 'paid';

                return (
                  <Card
                    key={ord.id}
                    elevation={0}
                    sx={{
                      borderRadius: 2.5,
                      border: '1.5px solid',
                      borderColor: isActive ? '#2563eb' : '#e2e8f0',
                      bgcolor: isActive ? '#f0f7ff' : '#ffffff',
                      boxShadow: isActive
                        ? '0 4px 14px rgba(37,99,235,0.12)'
                        : '0 1px 3px rgba(0,0,0,0.03)',
                      transition: 'all 0.18s ease-in-out',
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: '#2563eb',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 6px 16px rgba(15,23,42,0.08)'
                      }
                    }}
                    onClick={() => {
                      setQueueOpen(false);
                      handleScan(ord.name || String(ord.id));
                    }}
                  >
                    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                      {/* Top Header Row */}
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}
                          >
                            {ord.name}
                          </Typography>
                          <Chip
                            label={ord.store_label || 'Store'}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              bgcolor: ord.store_platform === 'shopify' ? '#e0f2fe' : '#f1f5f9',
                              color: ord.store_platform === 'shopify' ? '#0369a1' : '#334155'
                            }}
                          />
                          {isActive && (
                            <Chip
                              label="ACTIVE IN STATION"
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                bgcolor: '#dbeafe',
                                color: '#1e40af'
                              }}
                            />
                          )}
                        </Stack>

                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                          {formatTimeAgo(ord.placed_at)}
                        </Typography>
                      </Stack>

                      {/* Customer & Location */}
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                          {ord.customer_name}
                        </Typography>
                        {ord.city && (
                          <Stack direction="row" spacing={0.3} alignItems="center">
                            <LocationIcon sx={{ fontSize: 15, color: '#94a3b8' }} />
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                              {ord.city}
                            </Typography>
                          </Stack>
                        )}
                      </Stack>

                      {/* Item Thumbnails & Summary Row */}
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: isActive ? '#ffffff' : '#f8fafc',
                          border: '1px solid #edf2f7',
                          mb: 1.5
                        }}
                      >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          {ord.images && ord.images.length > 0 ? (
                            <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 34, height: 34, fontSize: '0.75rem' } }}>
                              {ord.images.map((img, idx) => (
                                <Avatar
                                  key={idx}
                                  src={img}
                                  variant="rounded"
                                  sx={{ width: 34, height: 34, border: '1px solid #cbd5e1' }}
                                />
                              ))}
                            </AvatarGroup>
                          ) : (
                            <Box
                              sx={{
                                width: 34,
                                height: 34,
                                borderRadius: 1.5,
                                bgcolor: '#e2e8f0',
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <BoxIcon sx={{ fontSize: 18 }} />
                            </Box>
                          )}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                color: '#0f172a',
                                fontWeight: 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {ord.items_summary || `${ord.item_count} items`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {ord.total_units || ord.item_count || 1} total unit{(ord.total_units || ord.item_count || 1) > 1 ? 's' : ''} to pack
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>

                      {/* Bottom Meta & Action Bar */}
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          {isSingle ? (
                            <Chip
                              label="Single-Item"
                              size="small"
                              sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#f0fdf4', color: '#15803d' }}
                            />
                          ) : isPartial ? (
                            <Chip
                              label="Partial Order"
                              size="small"
                              sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#fef3c7', color: '#b45309' }}
                            />
                          ) : (
                            <Chip
                              label={`Multi (${ord.total_units || ord.item_count} units)`}
                              size="small"
                              sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#f1f5f9', color: '#475569' }}
                            />
                          )}

                          <Chip
                            label={isPaid ? 'PAID' : 'COD'}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              bgcolor: isPaid ? '#ecfdf5' : '#fff7ed',
                              color: isPaid ? '#059669' : '#ea580c'
                            }}
                          />

                          {ord.total > 0 && (
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
                              {formatMoney(ord.total, ord.currency)}
                            </Typography>
                          )}
                        </Stack>

                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<ScanIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setQueueOpen(false);
                            handleScan(ord.name || String(ord.id));
                          }}
                          sx={{
                            fontWeight: 700,
                            textTransform: 'none',
                            bgcolor: isActive ? '#10b981' : '#2563eb',
                            boxShadow: 'none',
                            borderRadius: 1.5,
                            fontSize: '0.8rem',
                            '&:hover': { bgcolor: isActive ? '#059669' : '#1d4ed8' }
                          }}
                        >
                          {isActive ? 'Resume' : 'Pack'}
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Box>

        {/* Bottom Drawer Footer */}
        <Box sx={{ p: 2, bgcolor: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Showing <strong>{queueOrders.length}</strong> orders in queue
            </Typography>
            <Button
              size="small"
              onClick={() => setQueueOpen(false)}
              sx={{ textTransform: 'none', color: '#64748b', fontWeight: 600 }}
            >
              Close Drawer
            </Button>
          </Stack>
        </Box>
      </Drawer>

      {/* Station Statistics & Mis-Scans Modal */}
      <Dialog open={statsOpen} onClose={() => setStatsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Pack Station Throughput & Quality Metrics
        </DialogTitle>
        <DialogContent dividers>
          {statsData && (
            <Stack spacing={3}>
              <Stack direction="row" spacing={2}>
                <Card variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    7-DAY TOTAL PACKED
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#2563eb', mt: 0.5 }}>
                    {statsData.summary?.total_packed || 0}
                  </Typography>
                </Card>
                <Card variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    AVERAGE PACK DURATION
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#10b981', mt: 0.5 }}>
                    {statsData.summary?.avg_seconds || 0}s
                  </Typography>
                </Card>
                <Card variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    MIS-SCANS / QC FLAGS
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#ef4444', mt: 0.5 }}>
                    {statsData.problemCount || 0}
                  </Typography>
                </Card>
              </Stack>

              {/* Mis-Scans Table */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                  Frequent Mis-scanned Barcodes & Unknown Items
                </Typography>
                {statsData.problems?.length === 0 ? (
                  <Alert severity="success">No mis-scans recorded. Packing accuracy is 100%!</Alert>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>SCANNED CODE</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>ISSUE TYPE</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>OCCURRENCES</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>LAST SEEN</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {statsData.problems?.map((p, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.code}</TableCell>
                          <TableCell>
                            <Chip
                              label={p.result}
                              size="small"
                              color={p.result === 'unexpected' ? 'error' : 'warning'}
                              sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>{p.n}</TableCell>
                          <TableCell>{p.last_seen || 'Recently'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatsOpen(false)} sx={{ fontWeight: 700 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pack Station Settings Modal */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Pack Station Preferences</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Packer / Operator Name:
              </Typography>
              <TextField
                size="small"
                fullWidth
                value={packerName}
                onChange={(e) => {
                  setPackerName(e.target.value);
                  if (window.api?.settings) window.api.settings.set('packer_name', e.target.value);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PackerIcon sx={{ color: '#64748b' }} />
                    </InputAdornment>
                  )
                }}
              />
            </Box>

            <Divider />

            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Hardware & Automation Toggles:
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={printPrefs.thermal}
                  onChange={(e) => setPrintPrefs({ ...printPrefs, thermal: e.target.checked })}
                  color="primary"
                />
              }
              label="Use 4x6 Thermal Label Format (Roll Paper)"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={!muted}
                  onChange={(e) => setMuted(!e.target.checked)}
                  color="primary"
                />
              }
              label="Enable High-Pitch Audio Verification Beeps"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)} sx={{ fontWeight: 700 }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Document HTML Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Document Live Preview</DialogTitle>
        <DialogContent dividers sx={{ bgcolor: '#525659', p: 3 }}>
          <Box
            sx={{
              bgcolor: '#fff',
              mx: 'auto',
              width: '100%',
              maxWidth: 600,
              minHeight: 400,
              p: 2,
              borderRadius: 1,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
            }}
          >
            <iframe
              srcDoc={previewHTML}
              title="Preview"
              style={{ width: '100%', height: '500px', border: 'none' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)} sx={{ fontWeight: 700 }}>
            Close Preview
          </Button>
        </DialogActions>
      </Dialog>

      {/* Partial Shipment Confirmation Dialog */}
      <Dialog open={partialDialogOpen} onClose={() => setPartialDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#fffbeb', color: '#b45309', display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon sx={{ color: '#d97706' }} />
          Dispatch Partial Shipment ({packedQty} of {totalQty} Items)
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Alert severity="warning" sx={{ fontWeight: 500 }}>
              You are dispatching <strong>{packedQty} items</strong> out of <strong>{totalQty} total items</strong> on {order?.name}. 
              The remaining <strong>{totalQty - packedQty} item(s)</strong> will remain on <strong>Partial / Backordered</strong> status.
            </Alert>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                Shipment Breakdown:
              </Typography>
              <Table size="small" sx={{ border: '1px solid #e2e8f0', borderRadius: 1 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Item / SKU</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Packed Now</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Remaining</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {checklist.map((it) => {
                    const packed = Math.min(it.packed, it.qty);
                    const rem = it.qty - packed;
                    return (
                      <TableRow key={it.id}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{it.title}</Typography>
                          <Typography variant="caption" color="text.secondary">{it.sku || 'No SKU'}</Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center', fontWeight: 800, color: packed > 0 ? '#16a34a' : '#94a3b8' }}>
                          {packed}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center', fontWeight: 800, color: rem > 0 ? '#dc2626' : '#94a3b8' }}>
                          {rem > 0 ? `${rem} (Backorder)` : '✓ Complete'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Order Note / Customer Reason:
              </Typography>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                value={partialCustomerNote}
                onChange={(e) => setPartialCustomerNote(e.target.value)}
                placeholder="e.g. Dispatched 4 available items. 1 item will follow shortly."
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setPartialDialogOpen(false)} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<ShipIcon />}
            onClick={handleConfirmPartialShip}
            disabled={busy}
            sx={{
              fontWeight: 800,
              textTransform: 'none',
              bgcolor: '#f59e0b',
              color: '#fff',
              '&:hover': { bgcolor: '#d97706' }
            }}
          >
            Confirm & Print Partial Shipment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

