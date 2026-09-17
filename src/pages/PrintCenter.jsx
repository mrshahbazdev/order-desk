import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  CircularProgress,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  Slider,
  Divider
} from '@mui/material';
import {
  Print as PrintIcon,
  PictureAsPdf as PdfIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenIcon,
  Search as SearchIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Fullscreen as FullscreenIcon,
  Close as CloseIcon,
  QrCode as BarcodeIcon,
  Receipt as InvoiceIcon,
  LocalShipping as ShippingIcon,
  Description as DocIcon,
  CheckCircle as CheckIcon,
  Delete as DeleteIcon,
  Code as CodeIcon,
  Add as AddIcon,
  ContentCopy as CopyIcon,
  Restore as ResetIcon,
  Save as SaveIcon,
  AutoFixHigh as MagicIcon,
  AspectRatio as SizeIcon
} from '@mui/icons-material';
import { formatDate, formatMoney } from '../utils/formatters';

export default function PrintCenter() {
  const [activeTab, setActiveTab] = useState(0); // 0 = Live Studio, 1 = HTML & Size Designer, 2 = Document Archive
  const [studioMode, setStudioMode] = useState('single'); // 'single', 'batch', 'barcode'
  const [templateKind, setTemplateKind] = useState('invoice');
  const [pageSize, setPageSize] = useState('A4');
  
  // Search & Order Selection
  const [orderSearch, setOrderSearch] = useState('');
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedBatchIds, setSelectedBatchIds] = useState(new Set());
  
  // Printer Selection
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');

  // Template Customization Options
  const [trackingCompany, setTrackingCompany] = useState('PostEx');
  const [trackingNumberOverride, setTrackingNumberOverride] = useState('');
  const [customStoreName, setCustomStoreName] = useState('');
  const [customFooterNote, setCustomFooterNote] = useState('Thank you for shopping with us! For returns/exchange contact our support.');
  
  // Custom Barcode Sticker Settings
  const [barcodeTitle, setBarcodeTitle] = useState('Sample Product');
  const [barcodeSku, setBarcodeSku] = useState('PROD-SKU-01');
  const [barcodeCode, setBarcodeCode] = useState('890123456789');
  const [barcodePrice, setBarcodePrice] = useState('2500');
  const [barcodeCopies, setBarcodeCopies] = useState(1);

  // Zoom & Preview State
  const [zoomLevel, setZoomLevel] = useState(100);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Document History Archive
  const [documents, setDocuments] = useState([]);
  const [docFilter, setDocFilter] = useState('all');
  const [docsLoading, setDocsLoading] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // ---------------------------------------------------- Custom Template Designer State
  const [templatesList, setTemplatesList] = useState([]);
  const [selectedTplId, setSelectedTplId] = useState('');
  const [tplName, setTplName] = useState('');
  const [tplKind, setTplKind] = useState('invoice');
  const [tplPageSize, setTplPageSize] = useState('A4');
  const [tplWidthMm, setTplWidthMm] = useState(210);
  const [tplHeightMm, setTplHeightMm] = useState(297);
  const [tplMarginMm, setTplMarginMm] = useState(10);
  const [tplHtmlCode, setTplHtmlCode] = useState('');
  const [designerPreviewHtml, setDesignerPreviewHtml] = useState('');
  const [designerZoom, setDesignerZoom] = useState(100);
  const [designerLoading, setDesignerLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');

  useEffect(() => {
    loadPrinters();
    loadOrders();
    loadDocuments();
    loadTemplates();
  }, []);

  const loadPrinters = async () => {
    try {
      const list = await window.api.print.getPrinters();
      setPrinters(list || []);
      const def = list.find(p => p.isDefault);
      if (def) setSelectedPrinter(def.name);
      else if (list.length > 0) setSelectedPrinter(list[0].name);
    } catch (err) {
      console.error(err);
    }
  };

  const loadOrders = async (query = '') => {
    try {
      const res = await window.api.orders.list({
        search: query.trim() || null,
        limit: 100
      });
      const ords = res?.orders || [];
      setOrders(ords);
      if (ords.length > 0 && !selectedOrderId) {
        setSelectedOrderId(ords[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadDocuments = async () => {
    try {
      setDocsLoading(true);
      const docs = await window.api.print.listDocuments({ limit: 100 });
      setDocuments(Array.isArray(docs) ? docs : (docs?.documents || []));
    } catch (err) {
      console.error(err);
    } finally {
      setDocsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      if (window.api?.print?.getTemplates) {
        const list = await window.api.print.getTemplates();
        setTemplatesList(list || []);
        if (list && list.length > 0 && !selectedTplId) {
          loadTemplateIntoDesigner(list[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const loadTemplateIntoDesigner = (tpl) => {
    if (!tpl) return;
    setSelectedTplId(tpl.id);
    setTplName(tpl.name || 'Untitled Template');
    setTplKind(tpl.kind || 'invoice');
    setTplPageSize(tpl.pageSize || 'A4');
    setTplWidthMm(tpl.customWidthMm || 210);
    setTplHeightMm(tpl.customHeightMm || 297);
    setTplMarginMm(tpl.marginMm ?? 10);
    setTplHtmlCode(tpl.htmlContent || '');
  };

  // Debounced search for orders
  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders(orderSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [orderSearch]);

  // Update preview when studio settings change
  useEffect(() => {
    if (activeTab === 0) {
      updatePreview();
    }
  }, [
    templateKind,
    pageSize,
    selectedOrderId,
    studioMode,
    selectedBatchIds,
    trackingCompany,
    trackingNumberOverride,
    customStoreName,
    customFooterNote,
    barcodeTitle,
    barcodeSku,
    barcodeCode,
    barcodePrice,
    barcodeCopies,
    activeTab
  ]);

  // Update Designer Preview when HTML or size changes
  useEffect(() => {
    if (activeTab === 1) {
      updateDesignerPreview();
    }
  }, [tplHtmlCode, tplPageSize, tplWidthMm, tplHeightMm, tplMarginMm, selectedOrderId, activeTab]);

  const updatePreview = async () => {
    try {
      setPreviewLoading(true);
      let payload = {};
      let options = {
        pageSize,
        trackingCompany,
        trackingNumber: trackingNumberOverride,
        storeSettings: {
          storeName: customStoreName,
          footerNote: customFooterNote
        },
        footerNote: customFooterNote
      };

      if (studioMode === 'single') {
        const order = orders.find(o => o.id === selectedOrderId);
        payload = { order };
      } else if (studioMode === 'batch') {
        const batchOrders = orders.filter(o => selectedBatchIds.has(o.id));
        payload = { orders: batchOrders };
      } else if (studioMode === 'barcode') {
        payload = {
          item: {
            title: barcodeTitle,
            sku: barcodeSku,
            barcode: barcodeCode,
            price: Number(barcodePrice) * 100,
            copies: barcodeCopies
          }
        };
      }

      const html = await window.api.print.previewHTML({
        kind: templateKind,
        data: payload,
        options
      });
      setPreviewHtml(html || '');
    } catch (err) {
      console.error(err);
      setPreviewHtml(`<div style="color: red; padding: 20px; font-family: sans-serif;"><h3>Preview Render Error</h3><p>${err.message}</p></div>`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const updateDesignerPreview = async () => {
    if (!tplHtmlCode.trim()) return;
    try {
      setDesignerLoading(true);
      const order = orders.find(o => o.id === selectedOrderId) || null;
      const html = await window.api.print.renderCustomTemplate({
        htmlContent: tplHtmlCode,
        orderId: order?.id || null,
        options: {
          pageSize: tplPageSize,
          customWidthMm: tplWidthMm,
          customHeightMm: tplHeightMm,
          marginMm: tplMarginMm,
          storeSettings: { storeName: customStoreName },
          footerNote: customFooterNote
        }
      });
      setDesignerPreviewHtml(html || '');
    } catch (err) {
      console.error('Designer preview render error:', err);
    } finally {
      setDesignerLoading(false);
    }
  };

  // Save Custom Template
  const handleSaveTemplate = async () => {
    if (!tplName.trim()) {
      setAlert({ type: 'error', message: 'Please provide a template name.' });
      return;
    }
    try {
      const saved = await window.api.print.saveTemplate({
        id: selectedTplId.startsWith('tpl_system') ? `tpl_custom_${Date.now()}` : selectedTplId,
        name: tplName,
        kind: tplKind,
        pageSize: tplPageSize,
        customWidthMm: Number(tplWidthMm),
        customHeightMm: Number(tplHeightMm),
        marginMm: Number(tplMarginMm),
        htmlContent: tplHtmlCode
      });
      setAlert({ type: 'success', message: `Template "${saved.name}" saved successfully!` });
      await loadTemplates();
      setSelectedTplId(saved.id);
    } catch (err) {
      setAlert({ type: 'error', message: `Failed to save template: ${err.message}` });
    }
  };

  // Create New Blank Template
  const handleCreateNewTemplate = () => {
    const newId = `tpl_custom_${Date.now()}`;
    setSelectedTplId(newId);
    setTplName('My Custom Document Template');
    setTplKind('invoice');
    setTplPageSize('A4');
    setTplWidthMm(210);
    setTplHeightMm(297);
    setTplMarginMm(10);
    setTplHtmlCode(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: {{page_size}}; margin: {{page_margin}}mm; }
    body { font-family: sans-serif; font-size: 13px; color: #1e293b; padding: 10px; }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 15px; }
    .title { font-size: 20px; font-weight: bold; color: #2563eb; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { background: #f1f5f9; text-align: left; padding: 8px; }
    td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">{{store.name}}</div>
    <div>Order: {{order.name}} · Date: {{invoice.date}}</div>
  </div>
  <div>Customer: <strong>{{customer.name}}</strong> ({{customer.phone}})</div>
  <div>Address: {{shipping.address1}}, {{shipping.city}}</div>
  <table>
    <thead>
      <tr><th>Item</th><th>SKU</th><th>Qty</th><th>Price</th></tr>
    </thead>
    <tbody>
      {{items_table_rows}}
    </tbody>
  </table>
  <div style="text-align: right; margin-top: 15px; font-size: 16px; font-weight: bold;">
    Total: {{order.total}}
  </div>
</body>
</html>`);
  };

  // Delete Custom Template
  const handleDeleteTemplate = async () => {
    if (!selectedTplId) return;
    if (confirm(`Delete template "${tplName}"?`)) {
      try {
        await window.api.print.deleteTemplate(selectedTplId);
        setAlert({ type: 'info', message: 'Template deleted.' });
        await loadTemplates();
      } catch (err) {
        setAlert({ type: 'error', message: err.message });
      }
    }
  };

  // Reset to System Templates
  const handleResetTemplates = async () => {
    if (confirm('Reset all templates back to system factory defaults?')) {
      try {
        await window.api.print.resetTemplates();
        setAlert({ type: 'info', message: 'Templates restored to factory defaults.' });
        await loadTemplates();
      } catch (err) {
        setAlert({ type: 'error', message: err.message });
      }
    }
  };

  // Variable Insertion Helper
  const handleInsertVariable = (varTag) => {
    navigator.clipboard.writeText(varTag);
    setCopySuccess(`Copied ${varTag} to clipboard! Paste it into your HTML code.`);
    setTimeout(() => setCopySuccess(''), 3000);
  };

  // Quick Select All Unfulfilled Orders
  const handleSelectAllUnfulfilled = () => {
    const unfulfilled = orders.filter(o => o.fulfillment === 'unfulfilled' || o.fulfillment === 'partial');
    setSelectedBatchIds(new Set(unfulfilled.map(o => o.id)));
  };

  // Direct Print Trigger
  const handleDirectPrint = async () => {
    try {
      setPrintLoading(true);
      setAlert(null);

      let payload = {};
      if (studioMode === 'single') {
        const order = orders.find(o => o.id === selectedOrderId);
        payload = { order };
      } else if (studioMode === 'batch') {
        const batchOrders = orders.filter(o => selectedBatchIds.has(o.id));
        payload = { orders: batchOrders };
      } else if (studioMode === 'barcode') {
        payload = {
          items: [{
            title: barcodeTitle,
            sku: barcodeSku,
            barcode: barcodeCode,
            price: Number(barcodePrice) * 100,
            copies: barcodeCopies
          }]
        };
      }

      const res = await window.api.print.directPrint({
        kind: templateKind,
        data: payload,
        options: {
          deviceName: selectedPrinter,
          pageSize,
          isThermal: pageSize === '4x6' || pageSize === '80mm' || pageSize === '50x25',
          trackingCompany,
          trackingNumber: trackingNumberOverride,
          footerNote: customFooterNote
        }
      });

      if (res && res.success) {
        setAlert({ type: 'success', message: 'Print command successfully sent to printer spooler!' });
        loadDocuments();
      } else if (res && res.cancelled) {
        setAlert({ type: 'info', message: 'Print job was cancelled.' });
      } else {
        setAlert({ type: 'error', message: 'Direct print failed. Please check printer connection.' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: `Print error: ${err.message}` });
    } finally {
      setPrintLoading(false);
    }
  };

  // Export PDF Trigger
  const handleExportPDF = async () => {
    try {
      setPrintLoading(true);
      setAlert(null);

      let payload = {};
      if (studioMode === 'single') {
        const order = orders.find(o => o.id === selectedOrderId);
        payload = { order };
      } else if (studioMode === 'batch') {
        const batchOrders = orders.filter(o => selectedBatchIds.has(o.id));
        payload = { orders: batchOrders };
      } else if (studioMode === 'barcode') {
        payload = {
          items: [{
            title: barcodeTitle,
            sku: barcodeSku,
            barcode: barcodeCode,
            price: Number(barcodePrice) * 100,
            copies: barcodeCopies
          }]
        };
      }

      const res = await window.api.print.generatePDF({
        kind: templateKind,
        data: payload,
        options: {
          pageSize,
          isThermal: pageSize === '4x6' || pageSize === '80mm' || pageSize === '50x25',
          trackingCompany,
          trackingNumber: trackingNumberOverride,
          footerNote: customFooterNote
        }
      });

      if (res && res.filePath) {
        setAlert({ type: 'success', message: `PDF Generated: ${res.filePath}` });
        window.api.print.openPath(res.filePath);
        loadDocuments();
      }
    } catch (err) {
      setAlert({ type: 'error', message: `PDF error: ${err.message}` });
    } finally {
      setPrintLoading(false);
    }
  };

  const handleDeleteDocument = async (id) => {
    try {
      setDocsLoading(true);
      await window.api.print.deleteDocument(id);
      setAlert({ type: 'success', message: `Document #DOC-${id} deleted successfully.` });
      await loadDocuments();
    } catch (err) {
      setAlert({ type: 'error', message: `Failed to delete document: ${err.message}` });
    } finally {
      setDocsLoading(false);
    }
  };

  const handleClearAllDocuments = async () => {
    try {
      setDocsLoading(true);
      setConfirmClearOpen(false);
      const res = await window.api.print.clearAllDocuments(docFilter);
      setAlert({ type: 'success', message: `Successfully cleared ${res.count || 0} document(s) from archive.` });
      await loadDocuments();
    } catch (err) {
      setAlert({ type: 'error', message: `Failed to clear documents: ${err.message}` });
    } finally {
      setDocsLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (docFilter === 'all') return true;
    return doc.kind === docFilter;
  });

  const availableVariables = [
    { tag: '{{order.name}}', desc: 'Order # (#1001)' },
    { tag: '{{customer.name}}', desc: 'Customer Full Name' },
    { tag: '{{customer.phone}}', desc: 'Customer Phone' },
    { tag: '{{customer.email}}', desc: 'Customer Email' },
    { tag: '{{shipping.address1}}', desc: 'Street Address' },
    { tag: '{{shipping.city}}', desc: 'Delivery City' },
    { tag: '{{shipping.province}}', desc: 'Province / State' },
    { tag: '{{shipping.zip}}', desc: 'Postal Code' },
    { tag: '{{order.subtotal}}', desc: 'Order Subtotal' },
    { tag: '{{order.shipping}}', desc: 'Shipping Fee' },
    { tag: '{{order.discount}}', desc: 'Discount Amount' },
    { tag: '{{order.total}}', desc: 'Total Amount (PKR)' },
    { tag: '{{order.financial}}', desc: 'Payment Status (PAID/PENDING)' },
    { tag: '{{store.name}}', desc: 'Store / Brand Name' },
    { tag: '{{store.address}}', desc: 'Store Origin Address' },
    { tag: '{{store.phone}}', desc: 'Store Helpline Phone' },
    { tag: '{{tracking.company}}', desc: 'Courier (Trax/TCS/PostEx)' },
    { tag: '{{tracking.number}}', desc: 'Tracking Barcode Number' },
    { tag: '{{invoice.number}}', desc: 'Invoice Seq Number' },
    { tag: '{{invoice.date}}', desc: 'Formatted Current Date' },
    { tag: '{{items_table_rows}}', desc: 'All Order Items (HTML Table <tr>)' },
    { tag: '{{footer_note}}', desc: 'Custom Footer Message' },
    { tag: '{{page_size}}', desc: 'Dynamic CSS Page Size' },
    { tag: '{{page_margin}}', desc: 'Page Margin in mm' }
  ];

  return (
    <Box sx={{ p: 3, maxWidth: 1600, mx: 'auto' }}>
      {/* Top Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
            Print & Document Studio Pro
          </Typography>
          <Typography variant="body2" color="text.secondary">
            HTML/CSS native printing engine, custom template builder & thermal page geometry
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Chip
            icon={<CheckIcon />}
            label={`${printers.length} Printers Online`}
            size="small"
            color="success"
            variant="outlined"
          />
          <Chip
            label={`${templatesList.length} Templates Active`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Stack>
      </Stack>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_e, v) => setActiveTab(v)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}
        >
          <Tab icon={<PrintIcon />} iconPosition="start" label="Print & Document Studio" sx={{ fontWeight: 700 }} />
          <Tab icon={<CodeIcon />} iconPosition="start" label="HTML Template & Size Designer" sx={{ fontWeight: 700 }} />
          <Tab icon={<DocIcon />} iconPosition="start" label="Document Archive" sx={{ fontWeight: 700 }} />
        </Tabs>
      </Paper>

      {/* Alert Notifications */}
      {alert && (
        <Alert
          severity={alert.type}
          onClose={() => setAlert(null)}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {alert.message}
        </Alert>
      )}

      {/* ========================================================================= */}
      {/* TAB 0: LIVE PRINT & DOCUMENT STUDIO */}
      {/* ========================================================================= */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Left Controls Column */}
          <Grid item xs={12} md={4.5} lg={4}>
            <Card sx={{ borderRadius: 2, border: '1px solid #e2e8f0' }} elevation={0}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, color: '#0f172a' }}>
                  Print Controls & Layout
                </Typography>

                {/* Studio Mode Selector */}
                <Box sx={{ mb: 2.5 }}>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                    1. Print Mode
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                    <Button
                      fullWidth
                      size="small"
                      variant={studioMode === 'single' ? 'contained' : 'outlined'}
                      onClick={() => setStudioMode('single')}
                      sx={{ fontWeight: 700 }}
                    >
                      Single Order
                    </Button>
                    <Button
                      fullWidth
                      size="small"
                      variant={studioMode === 'batch' ? 'contained' : 'outlined'}
                      onClick={() => setStudioMode('batch')}
                      sx={{ fontWeight: 700 }}
                    >
                      Batch Queue
                    </Button>
                    <Button
                      fullWidth
                      size="small"
                      variant={studioMode === 'barcode' ? 'contained' : 'outlined'}
                      onClick={() => {
                        setStudioMode('barcode');
                        setTemplateKind('barcode');
                        setPageSize('50x25');
                      }}
                      sx={{ fontWeight: 700 }}
                    >
                      Stickers
                    </Button>
                  </Stack>
                </Box>

                {/* Template Kind & Size */}
                <Box sx={{ mb: 2.5 }}>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                    2. Document Format & Size
                  </Typography>
                  <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                    <Grid item xs={7}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Document Type</InputLabel>
                        <Select
                          value={templateKind}
                          label="Document Type"
                          onChange={(e) => {
                            const val = e.target.value;
                            setTemplateKind(val);
                            if (val === 'label') setPageSize('4x6');
                            else if (val === 'barcode') setPageSize('50x25');
                            else setPageSize('A4');
                          }}
                        >
                          <MenuItem value="invoice">Tax Invoice</MenuItem>
                          <MenuItem value="label">Thermal Shipping Label (4x6)</MenuItem>
                          <MenuItem value="packing_slip">Packing Slip</MenuItem>
                          <MenuItem value="barcode">Barcode Sticker</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={5}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Paper Size</InputLabel>
                        <Select
                          value={pageSize}
                          label="Paper Size"
                          onChange={(e) => setPageSize(e.target.value)}
                        >
                          <MenuItem value="A4">A4 (Laser)</MenuItem>
                          <MenuItem value="A5">A5 (Mini)</MenuItem>
                          <MenuItem value="4x6">4"×6" (Thermal)</MenuItem>
                          <MenuItem value="80mm">80mm POS Roll</MenuItem>
                          <MenuItem value="50x25">50×25mm Tag</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>

                {/* Single Order Search & Selector */}
                {studioMode === 'single' && (
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                      3. Select Order ({orders.length} in DB)
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 0.5 }}>
                      <TextField
                        size="small"
                        placeholder="Search order #, customer, phone..."
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                            </InputAdornment>
                          )
                        }}
                      />
                      <FormControl fullWidth size="small">
                        <Select
                          value={selectedOrderId}
                          onChange={(e) => setSelectedOrderId(e.target.value)}
                          displayEmpty
                        >
                          {orders.map(o => (
                            <MenuItem key={o.id} value={o.id}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{o.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {o.customer?.firstName ? `${o.customer.firstName} · ` : ''}{formatMoney(o.total, o.currency)}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>
                  </Box>
                )}

                {/* Batch Order Selection */}
                {studioMode === 'batch' && (
                  <Box sx={{ mb: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                        3. Batch Selection ({selectedBatchIds.size} selected)
                      </Typography>
                      <Button size="small" onClick={handleSelectAllUnfulfilled}>
                        Select Unfulfilled
                      </Button>
                    </Box>
                    <Paper variant="outlined" sx={{ maxHeight: 180, overflowY: 'auto', p: 1, mt: 0.5 }}>
                      {orders.map(o => {
                        const isChecked = selectedBatchIds.has(o.id);
                        return (
                          <Box
                            key={o.id}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              py: 0.5,
                              borderBottom: '1px solid #f1f5f9',
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              const next = new Set(selectedBatchIds);
                              if (next.has(o.id)) next.delete(o.id);
                              else next.add(o.id);
                              setSelectedBatchIds(next);
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Checkbox size="small" checked={isChecked} />
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{o.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {o.customer?.firstName || ''}
                              </Typography>
                            </Box>
                            <Chip
                              label={o.fulfillment}
                              size="small"
                              color={o.fulfillment === 'fulfilled' ? 'default' : 'warning'}
                              sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                          </Box>
                        );
                      })}
                    </Paper>
                  </Box>
                )}

                {/* Barcode Sticker Generator Controls */}
                {studioMode === 'barcode' && (
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                      3. Sticker Details & Copies
                    </Typography>
                    <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Product Title"
                          value={barcodeTitle}
                          onChange={(e) => setBarcodeTitle(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="SKU Code"
                          value={barcodeSku}
                          onChange={(e) => setBarcodeSku(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Barcode Code"
                          value={barcodeCode}
                          onChange={(e) => setBarcodeCode(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Price (PKR)"
                          value={barcodePrice}
                          onChange={(e) => setBarcodePrice(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Copies"
                          value={barcodeCopies}
                          onChange={(e) => setBarcodeCopies(Number(e.target.value))}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* Courier & Tracking Options (for Shipping Labels) */}
                {templateKind === 'label' && (
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                      4. Courier & Tracking Override
                    </Typography>
                    <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                      <Grid item xs={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Courier Carrier</InputLabel>
                          <Select
                            value={trackingCompany}
                            label="Courier Carrier"
                            onChange={(e) => setTrackingCompany(e.target.value)}
                          >
                            <MenuItem value="Trax Express">Trax Express</MenuItem>
                            <MenuItem value="TCS Express">TCS Express</MenuItem>
                            <MenuItem value="PostEx Logistics">PostEx</MenuItem>
                            <MenuItem value="M&P Courier">M&P Courier</MenuItem>
                            <MenuItem value="Leopard Courier">Leopards</MenuItem>
                            <MenuItem value="Call Courier">Call Courier</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Tracking #"
                          placeholder="e.g. TRK-998811"
                          value={trackingNumberOverride}
                          onChange={(e) => setTrackingNumberOverride(e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* Destination Printer Picker */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                    5. Target Printer
                  </Typography>
                  <FormControl fullWidth size="small" sx={{ mt: 0.5 }}>
                    <InputLabel>Select Printer</InputLabel>
                    <Select
                      value={selectedPrinter}
                      label="Select Printer"
                      onChange={(e) => setSelectedPrinter(e.target.value)}
                    >
                      {printers.map(p => (
                        <MenuItem key={p.name} value={p.name}>
                          {p.name} {p.isDefault ? ' ⭐ (Default)' : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Print & PDF Action Buttons */}
                <Stack direction="row" spacing={1.5}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={printLoading ? <CircularProgress size={20} color="inherit" /> : <PrintIcon />}
                    onClick={handleDirectPrint}
                    disabled={printLoading}
                    sx={{ fontWeight: 800, bgcolor: '#2563eb' }}
                  >
                    Direct Print
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    startIcon={<PdfIcon />}
                    onClick={handleExportPDF}
                    disabled={printLoading}
                    sx={{ fontWeight: 700 }}
                  >
                    Save PDF
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Live Preview Column */}
          <Grid item xs={12} md={7.5} lg={8}>
            <Card sx={{ borderRadius: 2, border: '1px solid #e2e8f0', height: '100%', display: 'flex', flexDirection: 'column' }} elevation={0}>
              {/* Preview Toolbar */}
              <Box
                sx={{
                  p: 1.5,
                  px: 2,
                  bgcolor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <DocIcon sx={{ color: '#64748b' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Live Document Preview ({templateKind.toUpperCase()} · {pageSize})
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ width: 140 }}>
                    <ZoomOutIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                    <Slider
                      size="small"
                      value={zoomLevel}
                      min={50}
                      max={180}
                      onChange={(_e, v) => setZoomLevel(v)}
                    />
                    <ZoomInIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                  </Stack>
                  <Typography variant="caption" sx={{ fontWeight: 700, width: 36 }}>
                    {zoomLevel}%
                  </Typography>

                  <Tooltip title="Fullscreen Preview">
                    <IconButton size="small" onClick={() => setFullscreenOpen(true)}>
                      <FullscreenIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Refresh Document Preview">
                    <IconButton size="small" onClick={updatePreview}>
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

              {/* Iframe Preview Container */}
              <Box
                sx={{
                  flex: 1,
                  minHeight: 580,
                  bgcolor: '#525659',
                  p: 3,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  overflow: 'auto'
                }}
              >
                {previewLoading ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, color: '#fff' }}>
                    <CircularProgress color="inherit" />
                    <Typography variant="body2" sx={{ mt: 2, opacity: 0.8 }}>Rendering Document...</Typography>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: 'top center',
                      transition: 'transform 0.15s ease-out'
                    }}
                  >
                    <iframe
                      title="Document Preview"
                      srcDoc={previewHtml}
                      style={{
                        width: templateKind === 'label' || templateKind === 'barcode' ? '400px' : '740px',
                        height: templateKind === 'barcode' ? '280px' : '980px',
                        backgroundColor: '#ffffff',
                        border: 'none',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
                        borderRadius: '4px'
                      }}
                    />
                  </Box>
                )}
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: HTML TEMPLATE & PAGE SIZE DESIGNER STUDIO */}
      {/* ========================================================================= */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          {/* Left Editor Column */}
          <Grid item xs={12} lg={6.5}>
            <Card sx={{ borderRadius: 2, border: '1px solid #e2e8f0' }} elevation={0}>
              <CardContent sx={{ p: 2.5 }}>
                {/* Template Selector & Action Bar */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Template & Page Geometry Designer
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleCreateNewTemplate}
                      sx={{ fontWeight: 700 }}
                    >
                      + New Template
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      color="warning"
                      startIcon={<ResetIcon />}
                      onClick={handleResetTemplates}
                    >
                      Reset Defaults
                    </Button>
                  </Stack>
                </Stack>

                {/* Template Select Dropdown */}
                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Active Template</InputLabel>
                      <Select
                        value={selectedTplId}
                        label="Active Template"
                        onChange={(e) => {
                          const t = templatesList.find(x => x.id === e.target.value);
                          if (t) loadTemplateIntoDesigner(t);
                        }}
                      >
                        {templatesList.map(t => (
                          <MenuItem key={t.id} value={t.id}>
                            {t.name} ({t.kind})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Template Title / Name"
                      value={tplName}
                      onChange={(e) => setTplName(e.target.value)}
                    />
                  </Grid>
                </Grid>

                {/* Page Geometry & Dimensions */}
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, mb: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                    <SizeIcon sx={{ fontSize: 20, color: '#2563eb' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Page Size & Custom Dimensions
                    </Typography>
                  </Stack>

                  <Grid container spacing={1.5}>
                    <Grid item xs={6} sm={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Size Preset</InputLabel>
                        <Select
                          value={tplPageSize}
                          label="Size Preset"
                          onChange={(e) => {
                            const val = e.target.value;
                            setTplPageSize(val);
                            if (val === 'A4') { setTplWidthMm(210); setTplHeightMm(297); }
                            else if (val === 'A5') { setTplWidthMm(148); setTplHeightMm(210); }
                            else if (val === '4x6') { setTplWidthMm(101.6); setTplHeightMm(152.4); }
                            else if (val === '80mm') { setTplWidthMm(80); setTplHeightMm(200); }
                            else if (val === '50x25') { setTplWidthMm(50); setTplHeightMm(25); }
                          }}
                        >
                          <MenuItem value="A4">A4 (210 × 297 mm)</MenuItem>
                          <MenuItem value="A5">A5 (148 × 210 mm)</MenuItem>
                          <MenuItem value="4x6">4"×6" (101.6 × 152.4 mm)</MenuItem>
                          <MenuItem value="80mm">POS 80mm Roll (80 × 200 mm)</MenuItem>
                          <MenuItem value="50x25">Barcode (50 × 25 mm)</MenuItem>
                          <MenuItem value="custom">Custom Size (mm)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Width (mm)"
                        value={tplWidthMm}
                        onChange={(e) => setTplWidthMm(Number(e.target.value))}
                        disabled={tplPageSize !== 'custom'}
                      />
                    </Grid>

                    <Grid item xs={6} sm={3}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Height (mm)"
                        value={tplHeightMm}
                        onChange={(e) => setTplHeightMm(Number(e.target.value))}
                        disabled={tplPageSize !== 'custom'}
                      />
                    </Grid>

                    <Grid item xs={6} sm={3}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Margin (mm)"
                        value={tplMarginMm}
                        onChange={(e) => setTplMarginMm(Number(e.target.value))}
                      />
                    </Grid>
                  </Grid>
                </Paper>

                {/* Clickable Variable Tags Palette */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                    CLICK TO COPY DYNAMIC PLACEHOLDER TAG:
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1, maxHeight: 90, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {availableVariables.map((v) => (
                      <Tooltip key={v.tag} title={`${v.desc} (Click to Copy)`}>
                        <Chip
                          label={v.tag}
                          size="small"
                          onClick={() => handleInsertVariable(v.tag)}
                          sx={{ fontFamily: 'monospace', fontWeight: 700, cursor: 'pointer', bgcolor: '#eff6ff', color: '#2563eb' }}
                        />
                      </Tooltip>
                    ))}
                  </Paper>
                  {copySuccess && (
                    <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700, display: 'block', mt: 0.5 }}>
                      ✓ {copySuccess}
                    </Typography>
                  )}
                </Box>

                {/* HTML & CSS Multi-Line Code Editor */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                    HTML & CSS TEMPLATE CODE:
                  </Typography>
                  <TextField
                    multiline
                    rows={18}
                    fullWidth
                    value={tplHtmlCode}
                    onChange={(e) => setTplHtmlCode(e.target.value)}
                    sx={{
                      '& textarea': {
                        fontFamily: 'Consolas, Monaco, monospace',
                        fontSize: '0.82rem',
                        lineHeight: 1.4,
                        bgcolor: '#0f172a',
                        color: '#38bdf8',
                        p: 1.5,
                        borderRadius: 1
                      }
                    }}
                  />
                </Box>

                {/* Bottom Action Bar */}
                <Stack direction="row" spacing={1.5} justifyContent="space-between">
                  <Button
                    color="error"
                    variant="outlined"
                    startIcon={<DeleteIcon />}
                    onClick={handleDeleteTemplate}
                    disabled={selectedTplId.startsWith('tpl_system')}
                  >
                    Delete Template
                  </Button>

                  <Stack direction="row" spacing={1.5}>
                    <Button
                      variant="outlined"
                      startIcon={<MagicIcon />}
                      onClick={updateDesignerPreview}
                      sx={{ fontWeight: 700 }}
                    >
                      Render Preview
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveTemplate}
                      sx={{ fontWeight: 800, bgcolor: '#2563eb' }}
                    >
                      Save Template
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Live Preview Column */}
          <Grid item xs={12} lg={5.5}>
            <Card sx={{ borderRadius: 2, border: '1px solid #e2e8f0', height: '100%', display: 'flex', flexDirection: 'column' }} elevation={0}>
              <Box
                sx={{
                  p: 1.5,
                  px: 2,
                  bgcolor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Real-time Render Preview ({tplPageSize} · {tplWidthMm}×{tplHeightMm}mm)
                </Typography>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Slider
                    size="small"
                    value={designerZoom}
                    min={50}
                    max={150}
                    onChange={(_e, v) => setDesignerZoom(v)}
                    sx={{ width: 90 }}
                  />
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {designerZoom}%
                  </Typography>
                </Stack>
              </Box>

              <Box
                sx={{
                  flex: 1,
                  minHeight: 600,
                  bgcolor: '#525659',
                  p: 2.5,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  overflow: 'auto'
                }}
              >
                {designerLoading ? (
                  <Box sx={{ p: 4, color: '#fff', textAlign: 'center' }}>
                    <CircularProgress color="inherit" size={30} />
                    <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>Rendering HTML...</Typography>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      transform: `scale(${designerZoom / 100})`,
                      transformOrigin: 'top center',
                      transition: 'transform 0.15s ease-out'
                    }}
                  >
                    <iframe
                      title="Designer Preview"
                      srcDoc={designerPreviewHtml}
                      style={{
                        width: tplPageSize === '4x6' ? '380px' : tplPageSize === '80mm' ? '320px' : tplPageSize === '50x25' ? '280px' : '580px',
                        height: tplPageSize === '50x25' ? '180px' : '780px',
                        backgroundColor: '#ffffff',
                        border: 'none',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
                        borderRadius: '4px'
                      }}
                    />
                  </Box>
                )}
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DOCUMENT ARCHIVE */}
      {/* ========================================================================= */}
      {activeTab === 2 && (
        <Card sx={{ borderRadius: 2, border: '1px solid #e2e8f0' }} elevation={0}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 1.5 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                size="small"
                variant={docFilter === 'all' ? 'contained' : 'outlined'}
                onClick={() => setDocFilter('all')}
              >
                All Documents
              </Button>
              <Button
                size="small"
                variant={docFilter === 'invoice' ? 'contained' : 'outlined'}
                onClick={() => setDocFilter('invoice')}
              >
                Invoices
              </Button>
              <Button
                size="small"
                variant={docFilter === 'label' ? 'contained' : 'outlined'}
                onClick={() => setDocFilter('label')}
              >
                Labels
              </Button>
              <Button
                size="small"
                variant={docFilter === 'packing_slip' ? 'contained' : 'outlined'}
                onClick={() => setDocFilter('packing_slip')}
              >
                Packing Slips
              </Button>
              <Button
                size="small"
                variant={docFilter === 'barcode' ? 'contained' : 'outlined'}
                onClick={() => setDocFilter('barcode')}
              >
                Barcodes
              </Button>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setConfirmClearOpen(true)}
                disabled={docsLoading || filteredDocuments.length === 0}
                sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 1.5 }}
              >
                Clear All {filteredDocuments.length > 0 ? `(${filteredDocuments.length})` : ''}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadDocuments}
                disabled={docsLoading}
                sx={{ textTransform: 'none', borderRadius: 1.5 }}
              >
                Refresh Archive
              </Button>
            </Stack>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Document ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Kind</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Order / Target</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Store</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Created At</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {docsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        No documents generated in this category yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map((doc) => (
                    <TableRow key={doc.id} hover>
                      <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                        {`#DOC-${doc.id}`}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={doc.kind?.toUpperCase()}
                          size="small"
                          color={doc.kind === 'barcode' ? 'secondary' : doc.kind === 'invoice' ? 'primary' : 'default'}
                          sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {doc.order_name ? (
                          <span style={{ color: '#2563eb' }}>{doc.order_name}</span>
                        ) : doc.kind === 'barcode' ? (
                          <span style={{ color: '#334155' }}>{doc.number || 'Product Barcode'}</span>
                        ) : (
                          <span style={{ color: '#64748b' }}>{doc.number || 'General Batch'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={doc.store_label || (doc.kind === 'barcode' ? 'Product Catalog' : 'Skulane')}
                          size="small"
                          sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#f1f5f9', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>{formatDate(doc.created_at)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<OpenIcon />}
                            onClick={() => window.api.print.openPath(doc.path)}
                            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
                          >
                            Open PDF
                          </Button>
                          <Tooltip title="Delete Document & PDF">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteDocument(doc.id)}
                              sx={{
                                border: '1px solid #fee2e2',
                                bgcolor: '#fef2f2',
                                borderRadius: 1.5,
                                p: 0.6,
                                '&:hover': { bgcolor: '#fee2e2' }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
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

      {/* Confirm Clear All Documents Dialog */}
      <Dialog
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon /> Clear Document Archive?
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ color: '#334155', mb: 1, fontWeight: 600 }}>
            Are you sure you want to delete <strong>{filteredDocuments.length}</strong> {docFilter === 'all' ? 'archived document(s)' : `${docFilter} document(s)`}?
          </Typography>
          <Typography variant="caption" color="text.secondary">
            This will permanently remove the document records and delete the associated PDF files from your disk.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmClearOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleClearAllDocuments}
            sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 1.5 }}
          >
            Yes, Clear All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Fullscreen Preview Modal */}
      <Dialog
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Fullscreen Document Preview
          </Typography>
          <IconButton onClick={() => setFullscreenOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3, bgcolor: '#cbd5e1', display: 'flex', justifyContent: 'center' }}>
          <iframe
            title="Fullscreen Preview"
            srcDoc={previewHtml}
            style={{
              width: templateKind === 'label' || templateKind === 'barcode' ? '420px' : '760px',
              height: '80vh',
              backgroundColor: '#ffffff',
              border: 'none',
              boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
              borderRadius: '4px'
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="contained" startIcon={<PdfIcon />} onClick={handleExportPDF}>
            Save PDF
          </Button>
          <Button onClick={() => setFullscreenOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
