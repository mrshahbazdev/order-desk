import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  CircularProgress,
  Alert,
  Tooltip,
  TablePagination,
  Collapse,
  Divider,
  Paper,
  ButtonGroup
} from '@mui/material';
import {
  Search as SearchIcon,
  QrCode as BarcodeIcon,
  Edit as EditIcon,
  Inventory as InventoryIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Storefront as StoreIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
  Science as DemoIcon,
  WarningAmber as WarningIcon,
  CheckCircle as CheckIcon,
  ErrorOutline as OutOfStockIcon,
  TrendingUp as TrendingUpIcon,
  AddCircleOutline as PlusIcon,
  RemoveCircleOutline as MinusIcon,
  Delete as DeleteIcon,
  AutoFixHigh as AutoFixIcon,
  ContentCopy as CopyIcon,
  FlashOn as FlashIcon
} from '@mui/icons-material';
import { formatMoney } from '../utils/formatters';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState([]);

  // Search, Filter & Pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStore, setSelectedStore] = useState('all');
  const [stockFilter, setStockFilter] = useState('all'); // 'all', 'out_of_stock', 'low_stock', 'in_stock'
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Expanded Product Variant Rows
  const [expandedProductIds, setExpandedProductIds] = useState(new Set());

  // Edit stock dialog
  const [editingVariant, setEditingVariant] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [stockAdjustMode, setStockAdjustMode] = useState('absolute'); // 'absolute', 'delta'
  const [newStockVal, setNewStockVal] = useState('');
  const [deltaVal, setDeltaVal] = useState(10);
  const [adjustReason, setAdjustReason] = useState('Inbound Restock / Shipment');
  const [savingStock, setSavingStock] = useState(false);

  // Add Product Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createStoreId, setCreateStoreId] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [createVendor, setCreateVendor] = useState('');
  const [createType, setCreateType] = useState('Apparel');
  const [createTags, setCreateTags] = useState('Shopify, Active');
  const [createImageUrl, setCreateImageUrl] = useState('');
  const [createVariants, setCreateVariants] = useState([
    { title: 'Standard / Default', sku: 'SKU-001', barcode: '8901001', price: 2500, stock: 20, image_url: '' }
  ]);
  const [creatingProduct, setCreatingProduct] = useState(false);

  // Add Variant Modal
  const [addVariantModalOpen, setAddVariantModalOpen] = useState(false);
  const [targetProduct, setTargetProduct] = useState(null);
  const [varTitle, setVarTitle] = useState('Size: XL / Color: Black');
  const [varSku, setVarSku] = useState('');
  const [varBarcode, setVarBarcode] = useState('');
  const [varPrice, setVarPrice] = useState('2500');
  const [varStock, setVarStock] = useState('15');
  const [varImageUrl, setVarImageUrl] = useState('');
  const [addingVariant, setAddingVariant] = useState(false);

  // Edit Variant Modal
  const [editVariantModalOpen, setEditVariantModalOpen] = useState(false);
  const [editingVariantTarget, setEditingVariantTarget] = useState(null); // { variant, product }
  const [editVarTitle, setEditVarTitle] = useState('');
  const [editVarSku, setEditVarSku] = useState('');
  const [editVarBarcode, setEditVarBarcode] = useState('');
  const [editVarPrice, setEditVarPrice] = useState('0');
  const [editVarStock, setEditVarStock] = useState('0');
  const [editVarImageUrl, setEditVarImageUrl] = useState('');
  const [savingVariant, setSavingVariant] = useState(false);

  // Auto Generation Loading State
  const [autoGeneratingMissing, setAutoGeneratingMissing] = useState(false);

  // Feedback
  const [alert, setAlert] = useState(null);

  // Presets
  const SAMPLE_PRESETS = [
    { label: '👕 Polo Shirt', url: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=300' },
    { label: '👟 Sneakers', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300' },
    { label: '🎧 Headphones', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300' },
    { label: '⌚ Smartwatch', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300' },
    { label: '🎒 Backpack', url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300' },
    { label: '⚡ Dock Station', url: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=300' }
  ];

  // Client Generator Helpers
  const generateClientEan13 = (seed) => {
    const numStr = String(Math.abs(seed || Date.now())).padStart(9, '0').slice(-9);
    const base12 = `200${numStr}`;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(base12[i], 10);
      sum += (i % 2 === 0) ? digit : digit * 3;
    }
    const checksum = (10 - (sum % 10)) % 10;
    return `${base12}${checksum}`;
  };

  const generateClientSku = (prodTitle = 'PROD', varTitle = 'STD', id = null) => {
    const cleanP = (prodTitle || 'PROD').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'PROD';
    const cleanV = (varTitle && varTitle !== 'Default' && varTitle !== 'Default Title')
      ? (varTitle.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase())
      : 'STD';
    const rand = id || Math.floor(1000 + Math.random() * 9000);
    return `${cleanP}-${cleanV}-${rand}`;
  };

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
      if (st && st.length > 0 && !createStoreId) {
        setCreateStoreId(st[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await window.api.products.list({
        store_id: selectedStore === 'all' ? null : selectedStore,
        search: debouncedSearch.trim() || null,
        stock_filter: stockFilter,
        limit: rowsPerPage,
        offset: page * rowsPerPage
      });
      setProducts(res?.products || []);
      setTotalCount(res?.total || 0);
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to load products: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedStore, stockFilter, debouncedSearch, page, rowsPerPage]);

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') {
      setDebouncedSearch(search);
      setPage(0);
    }
  };

  // Toggle variant rows expansion
  const toggleExpand = (productId) => {
    const next = new Set(expandedProductIds);
    if (next.has(productId)) next.delete(productId);
    else next.add(productId);
    setExpandedProductIds(next);
  };

  // Open Stock Adjust Modal
  const openStockModal = (variant, product) => {
    setEditingVariant(variant);
    setEditingProduct(product);
    setNewStockVal(String(variant.stock || 0));
    setDeltaVal(10);
    setStockAdjustMode('absolute');
  };

  // Save Stock Adjustment
  const handleUpdateStock = async () => {
    if (!editingVariant) return;
    try {
      setSavingStock(true);
      let targetStock = 0;
      if (stockAdjustMode === 'absolute') {
        targetStock = Math.max(0, parseInt(newStockVal, 10) || 0);
      } else {
        targetStock = Math.max(0, (editingVariant.stock || 0) + parseInt(deltaVal, 10));
      }

      await window.api.products.updateStock({
        variantId: editingVariant.id,
        stock: targetStock
      });

      setAlert({
        type: 'success',
        message: `Inventory for SKU "${editingVariant.sku || editingProduct.title}" updated to ${targetStock} units (Sync job queued to push to ${editingProduct.store_label})!`
      });
      setEditingVariant(null);
      loadProducts();
    } catch (err) {
      setAlert({ type: 'error', message: 'Stock update error: ' + err.message });
    } finally {
      setSavingStock(false);
    }
  };

  // Quick Inline Quick Step Stock (+1 / -1)
  const handleQuickStepStock = async (variant, product, delta) => {
    const targetStock = Math.max(0, (variant.stock || 0) + delta);
    try {
      await window.api.products.updateStock({
        variantId: variant.id,
        stock: targetStock
      });
      loadProducts();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  // Print Barcode Sticker
  const handlePrintBarcode = async (variant, product) => {
    try {
      const res = await window.api.print.generatePDF({
        kind: 'barcode',
        data: {
          items: [{
            title: product.title,
            sku: variant.sku,
            barcode: variant.barcode || variant.sku,
            price: variant.price,
            copies: 1
          }]
        },
        options: { pageSize: '50x25' }
      });
      if (res.filePath) {
        window.api.print.openPath(res.filePath);
        setAlert({ type: 'success', message: `Barcode label generated for SKU: ${variant.sku || product.title}` });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Barcode print error: ' + err.message });
    }
  };

  // Seed Demo Store Catalog
  const handleSeedDemo = async () => {
    try {
      setLoading(true);
      const res = await window.api.products.seedDemo(selectedStore === 'all' ? null : selectedStore);
      setAlert({ type: 'success', message: `Successfully seeded ${res.count || 4} demo store products with multi-variants & barcodes!` });
      await loadStores();
      await loadProducts();
    } catch (err) {
      setAlert({ type: 'error', message: 'Seed demo error: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // Add Product Submission
  const handleCreateProductSubmit = async () => {
    if (!createTitle.trim()) {
      setAlert({ type: 'error', message: 'Product title is required.' });
      return;
    }
    try {
      setCreatingProduct(true);
      const cleanVariants = createVariants.map(v => ({
        title: v.title || 'Standard',
        sku: v.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        barcode: v.barcode || '',
        price: (parseFloat(v.price) || 0) * 100,
        stock: parseInt(v.stock, 10) || 0,
        image_url: v.image_url?.trim() || null
      }));

      await window.api.products.create({
        store_id: createStoreId,
        title: createTitle,
        vendor: createVendor,
        type: createType,
        tags: createTags,
        image_url: createImageUrl.trim() || null,
        variants: cleanVariants
      });

      setAlert({ type: 'success', message: `Product "${createTitle}" created and linked to store successfully!` });
      setCreateModalOpen(false);
      setCreateTitle('');
      setCreateVendor('');
      setCreateImageUrl('');
      setCreateVariants([{ title: 'Standard / Default', sku: '', barcode: '', price: 2500, stock: 20, image_url: '' }]);
      loadProducts();
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to create product: ' + err.message });
    } finally {
      setCreatingProduct(false);
    }
  };

  // Add Variant Submission
  const handleAddVariantSubmit = async () => {
    if (!targetProduct) return;
    try {
      setAddingVariant(true);
      await window.api.products.addVariant({
        productId: targetProduct.id,
        variantData: {
          title: varTitle,
          sku: varSku || `SKU-${Date.now().toString().slice(-4)}`,
          barcode: varBarcode,
          price: (parseFloat(varPrice) || 0) * 100,
          stock: parseInt(varStock, 10) || 0,
          image_url: varImageUrl.trim() || null
        }
      });
      setAlert({ type: 'success', message: `Variant added to "${targetProduct.title}"!` });
      setAddVariantModalOpen(false);
      setVarImageUrl('');
      loadProducts();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setAddingVariant(false);
    }
  };

  // Auto-Generate All Missing SKUs & Barcodes across catalog
  const handleAutoGenerateAllMissing = async () => {
    try {
      setAutoGeneratingMissing(true);
      const res = await window.api.products.autoGenerateMissing({
        store_id: selectedStore === 'all' ? null : selectedStore
      });
      if (res && res.updatedCount > 0) {
        setAlert({ type: 'success', message: `⚡ Successfully generated SKUs & Barcodes for ${res.updatedCount} variant(s)!` });
      } else {
        setAlert({ type: 'info', message: 'All variants in the catalog already have valid SKUs & Barcodes!' });
      }
      await loadProducts();
    } catch (err) {
      setAlert({ type: 'error', message: 'Auto-generation error: ' + err.message });
    } finally {
      setAutoGeneratingMissing(false);
    }
  };
  // Auto-Generate missing SKUs & Barcodes for a single product
  const handleAutoGenerateSingleProduct = async (product) => {
    try {
      setLoading(true);
      const res = await window.api.products.autoGenerateMissing({
        product_id: product.id
      });
      if (res && res.updatedCount > 0) {
        setAlert({ type: 'success', message: `⚡ Successfully generated SKUs & Barcodes for "${product.title}" (${res.updatedCount} variant(s))!` });
      } else {
        setAlert({ type: 'info', message: `"${product.title}" already has valid SKUs & Barcodes on all variants!` });
      }
      await loadProducts();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Quick Generate SKU for a single variant
  const handleQuickGenerateSku = async (variant, product) => {
    try {
      const newSku = generateClientSku(product.title, variant.title, variant.id);
      await window.api.products.updateVariant({
        variantId: variant.id,
        data: { sku: newSku }
      });
      setAlert({ type: 'success', message: `⚡ Generated SKU "${newSku}" for "${variant.title || product.title}"!` });
      loadProducts();
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to generate SKU: ' + err.message });
    }
  };

  // Quick Generate Barcode (EAN-13) for a single variant
  const handleQuickGenerateBarcode = async (variant, product) => {
    try {
      const newBarcode = generateClientEan13(100000000 + variant.id * 37 + (product.id || 1));
      await window.api.products.updateVariant({
        variantId: variant.id,
        data: { barcode: newBarcode }
      });
      setAlert({ type: 'success', message: `⚡ Generated EAN-13 Barcode "${newBarcode}" for "${variant.title || product.title}"!` });
      loadProducts();
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to generate Barcode: ' + err.message });
    }
  };

  // Open Edit Variant Modal
  const openEditVariantModal = (variant, product) => {
    setEditingVariantTarget({ variant, product });
    setEditVarTitle(variant.title || 'Standard');
    setEditVarSku(variant.sku || '');
    setEditVarBarcode(variant.barcode || '');
    setEditVarPrice(String((variant.price || 0) / 100));
    setEditVarStock(String(variant.stock || 0));
    setEditVarImageUrl(variant.image_url || '');
    setEditVariantModalOpen(true);
  };

  // Save Edit Variant Modal
  const handleSaveEditVariant = async () => {
    if (!editingVariantTarget) return;
    try {
      setSavingVariant(true);
      const finalSku = editVarSku.trim() || generateClientSku(editingVariantTarget.product.title, editVarTitle, editingVariantTarget.variant.id);
      const finalBarcode = editVarBarcode.trim() || generateClientEan13(100000000 + editingVariantTarget.variant.id * 37);

      await window.api.products.updateVariant({
        variantId: editingVariantTarget.variant.id,
        data: {
          title: editVarTitle.trim(),
          sku: finalSku,
          barcode: finalBarcode,
          price: (parseFloat(editVarPrice) || 0) * 100,
          stock: parseInt(editVarStock, 10) || 0,
          image_url: editVarImageUrl.trim() || null
        }
      });
      setAlert({ type: 'success', message: `Variant details updated successfully with SKU "${finalSku}"!` });
      setEditVariantModalOpen(false);
      loadProducts();
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to save variant: ' + err.message });
    } finally {
      setSavingVariant(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id, title) => {
    if (confirm(`Delete product "${title}" and all its variants from local database?`)) {
      try {
        await window.api.products.delete(id);
        setAlert({ type: 'info', message: `Product "${title}" deleted.` });
        loadProducts();
      } catch (err) {
        setAlert({ type: 'error', message: err.message });
      }
    }
  };

  // Metrics summary calculation
  const totalStockUnits = products.reduce((s, p) => s + (p.total_stock || 0), 0);
  const outOfStockCount = products.filter(p => (p.total_stock || 0) === 0).length;
  const lowStockCount = products.filter(p => (p.total_stock || 0) > 0 && (p.total_stock || 0) <= 5).length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Top Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
            Product Catalog & Stock Center
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Multi-store inventory management, SKU barcodes & Shopify stock synchronization
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Button
            variant="outlined"
            color="warning"
            startIcon={autoGeneratingMissing ? <CircularProgress size={16} color="inherit" /> : <FlashIcon />}
            disabled={autoGeneratingMissing || loading}
            onClick={handleAutoGenerateAllMissing}
            sx={{ fontWeight: 800, borderColor: '#f59e0b', color: '#b45309', bgcolor: '#fffbeb', '&:hover': { bgcolor: '#fef3c7', borderColor: '#d97706' } }}
          >
            ⚡ Auto-Generate Missing (SKU & Barcode)
          </Button>

          <Button
            variant="outlined"
            color="secondary"
            startIcon={<DemoIcon />}
            onClick={handleSeedDemo}
            sx={{ fontWeight: 700, borderStyle: 'dashed' }}
          >
            Seed Demo Catalog
          </Button>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateModalOpen(true)}
            sx={{ fontWeight: 800, bgcolor: '#2563eb' }}
          >
            + Add Product / Stock
          </Button>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadProducts()}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

      {/* Metrics Banner */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }} elevation={0}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              TOTAL CATALOG PRODUCTS
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#0f172a', mt: 0.5 }}>
              {totalCount.toLocaleString()} Products
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }} elevation={0}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              TOTAL INVENTORY UNITS
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#2563eb', mt: 0.5 }}>
              {totalStockUnits.toLocaleString()} Units On-Hand
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }} elevation={0}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              LOW STOCK ALERTS (≤ 5)
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#f59e0b', mt: 0.5 }}>
              {lowStockCount} Items Low
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }} elevation={0}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              OUT OF STOCK (0 UNITS)
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#ef4444', mt: 0.5 }}>
              {outOfStockCount} Out of Stock
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Alert Notifications */}
      {alert && (
        <Alert severity={alert.type} sx={{ mb: 2, borderRadius: 2 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Filter Bar */}
      <Card sx={{ mb: 2.5, border: '1px solid #e2e8f0', borderRadius: 2 }} elevation={0}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Grid container spacing={2} alignItems="center">
            {/* Search Input */}
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by title, SKU, barcode, vendor, or tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchSubmit}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            {/* Store Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Matching Store</InputLabel>
                <Select
                  value={selectedStore}
                  label="Matching Store"
                  onChange={(e) => { setSelectedStore(e.target.value); setPage(0); }}
                >
                  <MenuItem value="all">🌐 All Stores ({stores.length})</MenuItem>
                  {stores.map(st => (
                    <MenuItem key={st.id} value={st.id}>
                      {st.platform === 'shopify' ? '🟢 ' : '🟣 '}{st.label} ({st.platform})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Stock Level Filter Chips */}
            <Grid item xs={12} sm={6} md={4}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip
                  label="All"
                  size="small"
                  color={stockFilter === 'all' ? 'primary' : 'default'}
                  onClick={() => setStockFilter('all')}
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  icon={<OutOfStockIcon />}
                  label="Out of Stock"
                  size="small"
                  color={stockFilter === 'out_of_stock' ? 'error' : 'default'}
                  onClick={() => setStockFilter('out_of_stock')}
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  icon={<WarningIcon />}
                  label="Low Stock"
                  size="small"
                  color={stockFilter === 'low_stock' ? 'warning' : 'default'}
                  onClick={() => setStockFilter('low_stock')}
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  icon={<CheckIcon />}
                  label="Healthy"
                  size="small"
                  color={stockFilter === 'in_stock' ? 'success' : 'default'}
                  onClick={() => setStockFilter('in_stock')}
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }} elevation={0}>
        <TableContainer>
          <Table size="medium">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ width: 40 }} />
                <TableCell sx={{ fontWeight: 800 }}>PRODUCT & IMAGE</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>STORE MATCH</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>PRIMARY SKU</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>VARIANTS</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>TOTAL STOCK</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>PRICE RANGE</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Box sx={{ color: '#94a3b8' }}>
                      <InventoryIcon sx={{ fontSize: 48, mb: 1 }} />
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>
                        No products found.
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        Click <strong>"+ Add Product / Stock"</strong> or <strong>"Seed Demo Catalog"</strong> to get started.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                products.map(product => {
                  const isExpanded = expandedProductIds.has(product.id);
                  const firstVariant = product.variants?.[0] || {};
                  const primarySku = product.primary_sku || product.variants?.find(v => v.sku && v.sku.trim())?.sku || firstVariant.sku;
                  const totalStock = product.total_stock ?? 0;

                  return (
                    <React.Fragment key={product.id}>
                      <TableRow
                        hover
                        sx={{
                          bgcolor: isExpanded ? '#f8fafc' : 'inherit',
                          '& > *': { borderBottom: isExpanded ? 'unset' : undefined }
                        }}
                      >
                        <TableCell>
                          <IconButton size="small" onClick={() => toggleExpand(product.id)}>
                            {isExpanded ? <ArrowUpIcon /> : <ArrowDownIcon />}
                          </IconButton>
                        </TableCell>

                        {/* Title & Image */}
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            {product.image_url ? (
                              <Box
                                component="img"
                                src={product.image_url}
                                alt={product.title}
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
                                <InventoryIcon sx={{ fontSize: 22 }} />
                              </Box>
                            )}
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                {product.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {product.vendor ? `Vendor: ${product.vendor} · ` : ''}{product.type || 'Product'}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>

                        {/* Store Match */}
                        <TableCell>
                          <Chip
                            icon={<StoreIcon sx={{ fontSize: 14 }} />}
                            label={product.store_label || 'Store'}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ height: 22, fontSize: '0.72rem', fontWeight: 700 }}
                          />
                        </TableCell>

                        {/* Primary SKU */}
                        <TableCell>
                          {primarySku ? (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <code style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 6px', borderRadius: 4, border: '1px solid #bfdbfe' }}>
                                {primarySku}
                              </code>
                              <Tooltip title="Copy SKU">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    navigator.clipboard.writeText(primarySku);
                                    setAlert({ type: 'info', message: `Copied SKU "${primarySku}" to clipboard!` });
                                  }}
                                  sx={{ p: 0.2 }}
                                >
                                  <CopyIcon sx={{ fontSize: 13, color: '#94a3b8' }} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              startIcon={<FlashIcon sx={{ fontSize: 12 }} />}
                              onClick={() => handleQuickGenerateSku(firstVariant, product)}
                              sx={{ height: 22, fontSize: '0.68rem', textTransform: 'none', fontWeight: 700, px: 1, borderStyle: 'dashed' }}
                            >
                              + Generate SKU
                            </Button>
                          )}
                        </TableCell>

                        {/* Variants Count */}
                        <TableCell>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => toggleExpand(product.id)}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                          >
                            {product.variants?.length || product.variant_count || 1} Variant(s) ▾
                          </Button>
                        </TableCell>

                        {/* Total Stock */}
                        <TableCell align="center">
                          <Chip
                            label={`${totalStock} Units`}
                            size="small"
                            color={totalStock === 0 ? 'error' : totalStock <= 5 ? 'warning' : 'success'}
                            variant={totalStock > 5 ? 'outlined' : 'filled'}
                            sx={{ fontWeight: 800, minWidth: 80 }}
                          />
                        </TableCell>

                        {/* Price Range */}
                        <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a' }}>
                          {product.min_price === product.max_price
                            ? formatMoney(product.min_price || 0, product.store_currency)
                            : `${formatMoney(product.min_price || 0, product.store_currency)} - ${formatMoney(product.max_price || 0, product.store_currency)}`}
                        </TableCell>

                        {/* Actions */}
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="⚡ Auto-Generate missing SKU & Barcode for this product">
                              <IconButton
                                size="small"
                                onClick={() => handleAutoGenerateSingleProduct(product)}
                                sx={{ color: '#ea580c' }}
                              >
                                <FlashIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Print Barcode Tag (50x25mm)">
                              <IconButton
                                size="small"
                                onClick={() => handlePrintBarcode(firstVariant, product)}
                              >
                                <BarcodeIcon fontSize="small" sx={{ color: '#2563eb' }} />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Adjust Stock Quantity">
                              <IconButton
                                size="small"
                                onClick={() => openStockModal(firstVariant, product)}
                              >
                                <EditIcon fontSize="small" sx={{ color: '#0f172a' }} />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Delete Product">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteProduct(product.id, product.title)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Variants Sub-Table */}
                      <TableRow sx={{ bgcolor: '#f8fafc' }}>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2, my: 1, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                  📦 All Variants for "{product.title}" ({product.variants?.length || 0})
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                    startIcon={<FlashIcon />}
                                    onClick={() => handleAutoGenerateSingleProduct(product)}
                                    sx={{ textTransform: 'none', fontWeight: 700, borderColor: '#f97316', color: '#ea580c' }}
                                  >
                                    ⚡ Auto-Generate (SKU & Barcode)
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={() => {
                                      setTargetProduct(product);
                                      setVarTitle('');
                                      setVarSku(generateClientSku(product.title, 'VAR'));
                                      setVarBarcode(generateClientEan13(100000000 + product.id * 89 + (product.variants?.length || 1)));
                                      setVarPrice(String((firstVariant.price || 0) / 100));
                                      setVarStock('20');
                                      setAddVariantModalOpen(true);
                                    }}
                                    sx={{ textTransform: 'none', fontWeight: 700 }}
                                  >
                                    + Add Variant
                                  </Button>
                                </Stack>
                              </Stack>

                              <Table size="small">
                                <TableHead>
                                  <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                                    <TableCell sx={{ fontWeight: 700 }}>VARIANT OPTION</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>BARCODE (EAN/UPC)</TableCell>
                                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>PRICE</TableCell>
                                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>AVAILABLE STOCK</TableCell>
                                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>QUICK RESTOCK</TableCell>
                                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>ACTIONS</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {(product.variants || []).map((v) => (
                                    <TableRow key={v.id} hover>
                                      {/* Variant Option & Image */}
                                      <TableCell>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                          {v.image_url || product.image_url ? (
                                            <Box
                                              component="img"
                                              src={v.image_url || product.image_url}
                                              alt={v.title}
                                              sx={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 1.5,
                                                objectFit: 'cover',
                                                border: v.image_url ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                                                bgcolor: '#f8fafc',
                                                flexShrink: 0
                                              }}
                                            />
                                          ) : (
                                            <Box
                                              sx={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 1.5,
                                                bgcolor: '#f1f5f9',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#94a3b8',
                                                flexShrink: 0
                                              }}
                                            >
                                              <InventoryIcon sx={{ fontSize: 18 }} />
                                            </Box>
                                          )}
                                          <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                              {v.title || 'Standard'}
                                            </Typography>
                                            {v.image_url && (
                                              <Typography variant="caption" sx={{ color: '#2563eb', fontWeight: 700, fontSize: '0.68rem', display: 'block' }}>
                                                🎨 Custom Option Image
                                              </Typography>
                                            )}
                                          </Box>
                                        </Stack>
                                      </TableCell>

                                      {/* SKU */}
                                      <TableCell>
                                        {v.sku && v.sku.trim() ? (
                                          <Stack direction="row" spacing={0.5} alignItems="center">
                                            <code style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e293b', background: '#f8fafc', padding: '2px 5px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                                              {v.sku}
                                            </code>
                                            <Tooltip title="Copy SKU">
                                              <IconButton
                                                size="small"
                                                onClick={() => {
                                                  navigator.clipboard.writeText(v.sku);
                                                  setAlert({ type: 'info', message: `Copied SKU "${v.sku}"` });
                                                }}
                                                sx={{ p: 0.2 }}
                                              >
                                                <CopyIcon sx={{ fontSize: 13, color: '#94a3b8' }} />
                                              </IconButton>
                                            </Tooltip>
                                          </Stack>
                                        ) : (
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            color="primary"
                                            startIcon={<FlashIcon sx={{ fontSize: 12 }} />}
                                            onClick={() => handleQuickGenerateSku(v, product)}
                                            sx={{ height: 22, fontSize: '0.68rem', textTransform: 'none', fontWeight: 700, px: 1, borderStyle: 'dashed' }}
                                          >
                                            + Generate SKU
                                          </Button>
                                        )}
                                      </TableCell>

                                      {/* Barcode */}
                                      <TableCell>
                                        {v.barcode && v.barcode.trim() ? (
                                          <Stack direction="row" spacing={0.5} alignItems="center">
                                            <code style={{ fontFamily: 'monospace', color: '#0369a1', fontWeight: 700, background: '#f0f9ff', padding: '2px 6px', borderRadius: 4, border: '1px solid #bae6fd' }}>
                                              {v.barcode}
                                            </code>
                                            <Tooltip title="Print Barcode Tag (50x25mm)">
                                              <IconButton
                                                size="small"
                                                onClick={() => handlePrintBarcode(v, product)}
                                                sx={{ p: 0.2 }}
                                              >
                                                <BarcodeIcon sx={{ fontSize: 15, color: '#0284c7' }} />
                                              </IconButton>
                                            </Tooltip>
                                          </Stack>
                                        ) : (
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            color="secondary"
                                            startIcon={<FlashIcon sx={{ fontSize: 12 }} />}
                                            onClick={() => handleQuickGenerateBarcode(v, product)}
                                            sx={{ height: 22, fontSize: '0.68rem', textTransform: 'none', fontWeight: 700, px: 1, borderStyle: 'dashed', borderColor: '#a855f7', color: '#7e22ce' }}
                                          >
                                            + Generate Barcode
                                          </Button>
                                        )}
                                      </TableCell>

                                      {/* Price */}
                                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                                        {formatMoney(v.price || 0, product.store_currency)}
                                      </TableCell>

                                      {/* Stock */}
                                      <TableCell align="center">
                                        <Chip
                                          label={`${v.stock || 0} in stock`}
                                          size="small"
                                          color={(v.stock || 0) === 0 ? 'error' : (v.stock || 0) <= 5 ? 'warning' : 'success'}
                                          sx={{ fontWeight: 800, height: 20, fontSize: '0.7rem' }}
                                        />
                                      </TableCell>

                                      {/* Quick Adjust */}
                                      <TableCell align="right">
                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                                          <IconButton
                                            size="small"
                                            color="error"
                                            disabled={(v.stock || 0) <= 0}
                                            onClick={() => handleQuickStepStock(v, product, -1)}
                                          >
                                            <MinusIcon fontSize="small" />
                                          </IconButton>
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => openStockModal(v, product)}
                                            sx={{ minWidth: 44, height: 26, fontSize: '0.75rem', fontWeight: 800, py: 0 }}
                                          >
                                            {v.stock || 0}
                                          </Button>
                                          <IconButton
                                            size="small"
                                            color="success"
                                            onClick={() => handleQuickStepStock(v, product, 1)}
                                          >
                                            <PlusIcon fontSize="small" />
                                          </IconButton>
                                        </Stack>
                                      </TableCell>

                                      {/* Actions */}
                                      <TableCell align="center">
                                        <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                                          <Tooltip title="Edit Variant Details (SKU, Barcode, Price, Stock)">
                                            <IconButton
                                              size="small"
                                              onClick={() => openEditVariantModal(v, product)}
                                              sx={{ color: '#475569' }}
                                            >
                                              <EditIcon fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                          <Tooltip title="Print Barcode Tag (50x25mm)">
                                            <IconButton
                                              size="small"
                                              onClick={() => handlePrintBarcode(v, product)}
                                              sx={{ color: '#2563eb' }}
                                            >
                                              <BarcodeIcon fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                        </Stack>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
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

      {/* Adjust Stock Dialog */}
      <Dialog open={Boolean(editingVariant)} onClose={() => setEditingVariant(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          📦 Adjust Inventory Stock
        </DialogTitle>
        <DialogContent dividers>
          {editingVariant && editingProduct && (
            <Stack spacing={2.5}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  {editingProduct.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Variant: <strong>{editingVariant.title}</strong> · SKU: <code>{editingVariant.sku || 'N/A'}</code>
                </Typography>
                <Chip
                  label={`Matching Store: ${editingProduct.store_label}`}
                  size="small"
                  color="primary"
                  sx={{ mt: 1, fontWeight: 700 }}
                />
              </Paper>

              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Adjustment Type:
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  <Button
                    fullWidth
                    variant={stockAdjustMode === 'absolute' ? 'contained' : 'outlined'}
                    onClick={() => setStockAdjustMode('absolute')}
                    sx={{ fontWeight: 700 }}
                  >
                    Set Exact Quantity
                  </Button>
                  <Button
                    fullWidth
                    variant={stockAdjustMode === 'delta' ? 'contained' : 'outlined'}
                    onClick={() => setStockAdjustMode('delta')}
                    sx={{ fontWeight: 700 }}
                  >
                    Add / Restock (+ / -)
                  </Button>
                </Stack>
              </Box>

              {stockAdjustMode === 'absolute' ? (
                <TextField
                  label="New Available Stock Units"
                  type="number"
                  fullWidth
                  size="medium"
                  value={newStockVal}
                  onChange={(e) => setNewStockVal(e.target.value)}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">Units</InputAdornment>
                  }}
                />
              ) : (
                <Stack direction="row" spacing={2} alignItems="center">
                  <TextField
                    label="Units to Add (+) or Deduct (-)"
                    type="number"
                    fullWidth
                    value={deltaVal}
                    onChange={(e) => setDeltaVal(e.target.value)}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 800, minWidth: 120 }}>
                    Result: {(editingVariant.stock || 0) + (parseInt(deltaVal, 10) || 0)} Units
                  </Typography>
                </Stack>
              )}

              <FormControl fullWidth size="small">
                <InputLabel>Reason for Adjustment</InputLabel>
                <Select
                  value={adjustReason}
                  label="Reason for Adjustment"
                  onChange={(e) => setAdjustReason(e.target.value)}
                >
                  <MenuItem value="Inbound Restock / Shipment">📦 Inbound Restock / Supplier Shipment</MenuItem>
                  <MenuItem value="Physical Cycle Count Audit">🔍 Physical Cycle Count / Audit</MenuItem>
                  <MenuItem value="Damaged / QC Rejection">⚠️ Damaged / Quality Control Rejection</MenuItem>
                  <MenuItem value="Customer Return Restock">↩️ Customer Return Restock</MenuItem>
                  <MenuItem value="Manual Correction">✏️ Manual Desk Correction</MenuItem>
                </Select>
              </FormControl>

              <Alert severity="info" sx={{ fontSize: '0.82rem' }}>
                Stock change will immediately update local database and enqueue an outbox job to sync with your remote store API.
              </Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditingVariant(null)} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateStock}
            disabled={savingStock}
            sx={{ fontWeight: 800, bgcolor: '#2563eb', px: 3 }}
          >
            {savingStock ? <CircularProgress size={20} color="inherit" /> : 'Save & Sync Stock'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Variant Details Modal */}
      <Dialog open={editVariantModalOpen} onClose={() => setEditVariantModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          ✏️ Edit Variant Details (SKU, Barcode, Image & Price)
        </DialogTitle>
        <DialogContent dividers>
          {editingVariantTarget && (
            <Stack spacing={2.5}>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  {editVarImageUrl || editingVariantTarget.product.image_url ? (
                    <Box
                      component="img"
                      src={editVarImageUrl || editingVariantTarget.product.image_url}
                      alt="Preview"
                      sx={{ width: 50, height: 50, borderRadius: 1.5, objectFit: 'cover', border: '1px solid #cbd5e1' }}
                    />
                  ) : (
                    <Box sx={{ width: 50, height: 50, borderRadius: 1.5, bgcolor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <InventoryIcon sx={{ color: '#94a3b8' }} />
                    </Box>
                  )}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      Product: {editingVariantTarget.product.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Store: {editingVariantTarget.product.store_label}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              <TextField
                label="Variant Option Name"
                fullWidth
                size="small"
                value={editVarTitle}
                onChange={(e) => setEditVarTitle(e.target.value)}
                placeholder="e.g. XL / Navy Blue"
              />

              {/* Variant Specific Image URL */}
              <Stack spacing={1}>
                <TextField
                  label="Variant Specific Image URL"
                  fullWidth
                  size="small"
                  value={editVarImageUrl}
                  onChange={(e) => setEditVarImageUrl(e.target.value)}
                  placeholder="https://... (Leave empty to use main product image)"
                  InputProps={{
                    endAdornment: editingVariantTarget.product.image_url && (
                      <InputAdornment position="end">
                        <Button
                          size="small"
                          onClick={() => setEditVarImageUrl(editingVariantTarget.product.image_url)}
                          sx={{ textTransform: 'none', fontSize: '0.72rem', fontWeight: 700 }}
                        >
                          Use Main Image
                        </Button>
                      </InputAdornment>
                    )
                  }}
                />
              </Stack>

              {/* SKU Field with Auto-Generate Helper */}
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  label="SKU Code"
                  fullWidth
                  size="small"
                  value={editVarSku}
                  onChange={(e) => setEditVarSku(e.target.value)}
                  placeholder="e.g. POLO-NVY-XL"
                />
                <Tooltip title="Generate Unique SKU">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<FlashIcon />}
                    onClick={() => setEditVarSku(generateClientSku(editingVariantTarget.product.title, editVarTitle, editingVariantTarget.variant.id))}
                    sx={{ minWidth: 110, height: 40, fontWeight: 700, textTransform: 'none' }}
                  >
                    Auto SKU
                  </Button>
                </Tooltip>
              </Stack>

              {/* Barcode Field with Auto-Generate EAN-13 Helper */}
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  label="Barcode (EAN-13 / UPC)"
                  fullWidth
                  size="small"
                  value={editVarBarcode}
                  onChange={(e) => setEditVarBarcode(e.target.value)}
                  placeholder="e.g. 2001002003004"
                />
                <Tooltip title="Generate Valid EAN-13 Barcode">
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="small"
                    startIcon={<FlashIcon />}
                    onClick={() => setEditVarBarcode(generateClientEan13(100000000 + editingVariantTarget.variant.id * 37))}
                    sx={{ minWidth: 130, height: 40, fontWeight: 700, textTransform: 'none', borderColor: '#a855f7', color: '#7e22ce' }}
                  >
                    Auto Barcode
                  </Button>
                </Tooltip>
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label={`Price (${editingVariantTarget.product.store_currency || 'PKR'})`}
                    type="number"
                    fullWidth
                    size="small"
                    value={editVarPrice}
                    onChange={(e) => setEditVarPrice(e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Available Stock Units"
                    type="number"
                    fullWidth
                    size="small"
                    value={editVarStock}
                    onChange={(e) => setEditVarStock(e.target.value)}
                  />
                </Grid>
              </Grid>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditVariantModalOpen(false)} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEditVariant}
            disabled={savingVariant}
            sx={{ fontWeight: 800, bgcolor: '#2563eb', px: 3 }}
          >
            {savingVariant ? <CircularProgress size={20} color="inherit" /> : 'Save Variant Details'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add New Product Modal */}
      <Dialog open={createModalOpen} onClose={() => setCreateModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          ➕ Add New Product & Initial Inventory
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Target Store</InputLabel>
                  <Select
                    value={createStoreId}
                    label="Target Store"
                    onChange={(e) => setCreateStoreId(e.target.value)}
                  >
                    {stores.map(st => (
                      <MenuItem key={st.id} value={st.id}>
                        {st.label} ({st.platform})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Product Type / Category"
                  value={createType}
                  onChange={(e) => setCreateType(e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Product Title *"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="e.g. Slim-Fit Cotton Chino Trousers"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Brand / Vendor"
                  value={createVendor}
                  onChange={(e) => setCreateVendor(e.target.value)}
                  placeholder="e.g. DenimLab"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Tags"
                  value={createTags}
                  onChange={(e) => setCreateTags(e.target.value)}
                  placeholder="e.g. Casual, New Arrival, Sale"
                />
              </Grid>

              {/* Product Main Image URL & Live Preview */}
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 1, display: 'block' }}>
                    🖼️ MAIN PRODUCT IMAGE
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                    {createImageUrl ? (
                      <Box
                        component="img"
                        src={createImageUrl}
                        alt="Product Preview"
                        sx={{ width: 64, height: 64, borderRadius: 2, objectFit: 'cover', border: '1.5px solid #2563eb' }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: 2,
                          bgcolor: '#e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94a3b8'
                        }}
                      >
                        <InventoryIcon sx={{ fontSize: 28 }} />
                      </Box>
                    )}
                    <Box sx={{ flex: 1, width: '100%' }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Product Image URL"
                        value={createImageUrl}
                        onChange={(e) => setCreateImageUrl(e.target.value)}
                        placeholder="https://... (or click sample preset below)"
                      />
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" gap={0.5}>
                        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, fontWeight: 700, alignSelf: 'center' }}>
                          Presets:
                        </Typography>
                        {SAMPLE_PRESETS.map((p, idx) => (
                          <Chip
                            key={idx}
                            label={p.label}
                            size="small"
                            onClick={() => setCreateImageUrl(p.url)}
                            sx={{ fontSize: '0.7rem', height: 22, cursor: 'pointer' }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>

            {/* Initial Variants Builder */}
            <Divider />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                🎨 Initial Variant Options, Images & Stock:
              </Typography>
              {createVariants.map((v, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 1.5, mb: 1.5, bgcolor: '#ffffff', borderRadius: 2 }}>
                  <Grid container spacing={1.5} alignItems="center">
                    {/* Thumbnail preview */}
                    <Grid item xs={12} sm={1}>
                      {v.image_url || createImageUrl ? (
                        <Box
                          component="img"
                          src={v.image_url || createImageUrl}
                          alt="Option"
                          sx={{ width: 42, height: 42, borderRadius: 1.5, objectFit: 'cover', border: '1px solid #cbd5e1' }}
                        />
                      ) : (
                        <Box sx={{ width: 42, height: 42, borderRadius: 1.5, bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <InventoryIcon sx={{ fontSize: 20, color: '#94a3b8' }} />
                        </Box>
                      )}
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Option (Size/Color)"
                        value={v.title}
                        onChange={(e) => {
                          const n = [...createVariants];
                          n[idx].title = e.target.value;
                          setCreateVariants(n);
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={2.5}>
                      <TextField
                        fullWidth
                        size="small"
                        label="SKU"
                        value={v.sku}
                        placeholder="Auto"
                        onChange={(e) => {
                          const n = [...createVariants];
                          n[idx].sku = e.target.value;
                          setCreateVariants(n);
                        }}
                      />
                    </Grid>

                    <Grid item xs={6} sm={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Price (PKR)"
                        type="number"
                        value={v.price}
                        onChange={(e) => {
                          const n = [...createVariants];
                          n[idx].price = e.target.value;
                          setCreateVariants(n);
                        }}
                      />
                    </Grid>

                    <Grid item xs={6} sm={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Stock"
                        type="number"
                        value={v.stock}
                        onChange={(e) => {
                          const n = [...createVariants];
                          n[idx].stock = e.target.value;
                          setCreateVariants(n);
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={1.5} sx={{ textAlign: 'right' }}>
                      {createVariants.length > 1 && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setCreateVariants(createVariants.filter((_, i) => i !== idx))}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Grid>

                    {/* Variant Specific Image URL input */}
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Variant Specific Image URL (Optional)"
                        value={v.image_url || ''}
                        onChange={(e) => {
                          const n = [...createVariants];
                          n[idx].image_url = e.target.value;
                          setCreateVariants(n);
                        }}
                        placeholder="e.g. https://... (different color or style photo)"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              ))}

              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setCreateVariants([
                  ...createVariants,
                  { title: `Option ${createVariants.length + 1}`, sku: `SKU-${Date.now().toString().slice(-4)}`, barcode: '', price: 2500, stock: 10, image_url: '' }
                ])}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                + Add Another Variant
              </Button>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateModalOpen(false)} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateProductSubmit}
            disabled={creatingProduct}
            sx={{ fontWeight: 800, bgcolor: '#2563eb', px: 3 }}
          >
            {creatingProduct ? <CircularProgress size={20} color="inherit" /> : 'Create Product'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Variant Modal */}
      <Dialog open={addVariantModalOpen} onClose={() => setAddVariantModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>➕ Add Variant to Product</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                {varImageUrl || targetProduct?.image_url ? (
                  <Box
                    component="img"
                    src={varImageUrl || targetProduct?.image_url}
                    alt="Product"
                    sx={{ width: 44, height: 44, borderRadius: 1.5, objectFit: 'cover' }}
                  />
                ) : (
                  <Box sx={{ width: 44, height: 44, borderRadius: 1.5, bgcolor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <InventoryIcon sx={{ color: '#94a3b8' }} />
                  </Box>
                )}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Product: {targetProduct?.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Store: {targetProduct?.store_label}
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            <TextField
              label="Variant Title (e.g. Size / Color)"
              fullWidth
              size="small"
              value={varTitle}
              onChange={(e) => setVarTitle(e.target.value)}
            />

            {/* Variant Image URL */}
            <TextField
              label="Variant Image URL (Optional)"
              fullWidth
              size="small"
              value={varImageUrl}
              onChange={(e) => setVarImageUrl(e.target.value)}
              placeholder="https://... (Leave empty to use main product image)"
              InputProps={{
                endAdornment: targetProduct?.image_url && (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      onClick={() => setVarImageUrl(targetProduct.image_url)}
                      sx={{ textTransform: 'none', fontSize: '0.72rem', fontWeight: 700 }}
                    >
                      Use Main Image
                    </Button>
                  </InputAdornment>
                )
              }}
            />

            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                label="SKU Code"
                fullWidth
                size="small"
                value={varSku}
                onChange={(e) => setVarSku(e.target.value)}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={() => setVarSku(generateClientSku(targetProduct?.title, varTitle))}
                sx={{ minWidth: 70, height: 40, fontWeight: 700 }}
              >
                Auto
              </Button>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                label="Barcode (EAN/UPC)"
                fullWidth
                size="small"
                value={varBarcode}
                onChange={(e) => setVarBarcode(e.target.value)}
              />
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                onClick={() => setVarBarcode(generateClientEan13())}
                sx={{ minWidth: 70, height: 40, fontWeight: 700 }}
              >
                Auto
              </Button>
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Selling Price (PKR)"
                  type="number"
                  fullWidth
                  size="small"
                  value={varPrice}
                  onChange={(e) => setVarPrice(e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Initial Stock Units"
                  type="number"
                  fullWidth
                  size="small"
                  value={varStock}
                  onChange={(e) => setVarStock(e.target.value)}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddVariantModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddVariantSubmit}
            disabled={addingVariant}
            sx={{ fontWeight: 800, bgcolor: '#2563eb' }}
          >
            {addingVariant ? <CircularProgress size={20} color="inherit" /> : 'Add Variant'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Variant Details Modal */}
      <Dialog
        open={editVariantModalOpen}
        onClose={() => setEditVariantModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          ✏️ Edit Variant Details (SKU, Barcode, Pricing & Stock)
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                {editVarImageUrl || editingVariantTarget?.product?.image_url ? (
                  <Box
                    component="img"
                    src={editVarImageUrl || editingVariantTarget?.product?.image_url}
                    alt="Product"
                    sx={{ width: 48, height: 48, borderRadius: 1.5, objectFit: 'cover', border: '1px solid #e2e8f0' }}
                  />
                ) : (
                  <Box sx={{ width: 48, height: 48, borderRadius: 1.5, bgcolor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <InventoryIcon sx={{ color: '#94a3b8' }} />
                  </Box>
                )}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    {editingVariantTarget?.product?.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Option: <strong>{editingVariantTarget?.variant?.title || 'Standard'}</strong> · Store: {editingVariantTarget?.product?.store_label}
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            <TextField
              label="Variant Option Title"
              fullWidth
              size="small"
              value={editVarTitle}
              onChange={(e) => setEditVarTitle(e.target.value)}
            />

            {/* SKU with Live Auto-Generate Button */}
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                label="SKU Code"
                fullWidth
                size="small"
                value={editVarSku}
                onChange={(e) => setEditVarSku(e.target.value)}
                placeholder="e.g. POLO-NVY-M"
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<FlashIcon />}
                onClick={() => setEditVarSku(generateClientSku(editingVariantTarget?.product?.title, editVarTitle, editingVariantTarget?.variant?.id))}
                sx={{ minWidth: 100, height: 40, textTransform: 'none', fontWeight: 700 }}
              >
                Auto SKU
              </Button>
            </Stack>

            {/* Barcode with Live Auto-Generate Button */}
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                label="Barcode (EAN-13 / UPC)"
                fullWidth
                size="small"
                value={editVarBarcode}
                onChange={(e) => setEditVarBarcode(e.target.value)}
                placeholder="e.g. 2001019274367"
              />
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                startIcon={<FlashIcon />}
                onClick={() => setEditVarBarcode(generateClientEan13(100000000 + (editingVariantTarget?.variant?.id || 1) * 37))}
                sx={{ minWidth: 120, height: 40, textTransform: 'none', fontWeight: 700 }}
              >
                Auto Barcode
              </Button>
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Selling Price (PKR)"
                  type="number"
                  fullWidth
                  size="small"
                  value={editVarPrice}
                  onChange={(e) => setEditVarPrice(e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Available Stock Units"
                  type="number"
                  fullWidth
                  size="small"
                  value={editVarStock}
                  onChange={(e) => setEditVarStock(e.target.value)}
                />
              </Grid>
            </Grid>

            {/* Variant Image URL */}
            <TextField
              label="Variant Option Image URL (Optional)"
              fullWidth
              size="small"
              value={editVarImageUrl}
              onChange={(e) => setEditVarImageUrl(e.target.value)}
              placeholder="https://... (Leave empty to use main product image)"
              InputProps={{
                endAdornment: editingVariantTarget?.product?.image_url && (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      onClick={() => setEditVarImageUrl(editingVariantTarget.product.image_url)}
                      sx={{ textTransform: 'none', fontSize: '0.72rem', fontWeight: 700 }}
                    >
                      Use Main Image
                    </Button>
                  </InputAdornment>
                )
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditVariantModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveEditVariant}
            disabled={savingVariant}
            sx={{ fontWeight: 800, bgcolor: '#2563eb', px: 3 }}
          >
            {savingVariant ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

