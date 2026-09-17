import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  TextField,
  Chip,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Paper,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  MenuBook as GuideIcon,
  HelpOutline as FaqIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Storefront as StoreIcon,
  ShoppingCart as OrdersIcon,
  QrCodeScanner as ScanIcon,
  LocalShipping as LogisticsIcon,
  Layers as WaveIcon,
  AssignmentReturn as ReturnsIcon,
  TrendingDown as ForecastIcon,
  People as StaffIcon,
  Print as PrintIcon,
  Storage as DatabaseIcon,
  CheckCircleOutline as CheckIcon,
  Keyboard as KeyboardIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Send as SendIcon
} from '@mui/icons-material';

export default function Guide() {
  const [activeTab, setActiveTab] = useState(0); // 0 = Operations Manual, 1 = FAQ, 2 = Shortcuts & Best Practices
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedAccordion, setExpandedAccordion] = useState(false);

  const handleAccordionChange = (panel) => (_event, isExpanded) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  const manualSections = [
    {
      id: 'stores',
      title: '1. Store Channels & Multi-Platform Sync',
      icon: <StoreIcon sx={{ color: '#2563eb' }} />,
      desc: 'Connect your Shopify and WooCommerce stores with encrypted credentials and background bi-directional syncing.',
      points: [
        'Connect Shopify via OAuth or custom private app access tokens (read_orders, write_orders, read_products, write_inventory).',
        'Connect WooCommerce using Consumer Key, Consumer Secret, and Store URL with REST API v3 support.',
        'Local-first database architecture stores all orders, customers, products, and inventory on your computer, enabling full offline operation.',
        'Automatic SKU & Barcode Generator: When new products sync without SKUs or barcodes, unique EAN-13 barcodes and formatted SKUs are auto-generated.'
      ]
    },
    {
      id: 'orders',
      title: '2. Order Fulfillment & International Customer Messaging',
      icon: <OrdersIcon sx={{ color: '#0891b2' }} />,
      desc: 'Process high-volume multi-store orders, detect duplicate COD placements, and communicate directly via WhatsApp.',
      points: [
        'Filter orders by unfulfilled, fulfilled, COD status, payment status, and financial risk profiles.',
        'Duplicate Order Detector: Identifies multiple orders placed by the same phone number within 48 hours to prevent fake or duplicate COD shipments.',
        'WhatsApp Communication Hub: One-click formatted international messaging for Order Confirmation, Address Verification, Dispatch Tracking, and Delivery Notifications.',
        'Manual and automated batch order status updates synced directly back to Shopify and WooCommerce.'
      ]
    },
    {
      id: 'pack',
      title: '3. Pack Station Pro (Zero-Error Verification)',
      icon: <ScanIcon sx={{ color: '#16a34a' }} />,
      desc: 'High-speed scan-to-pack workflow ensuring 100% item accuracy before parcel sealing.',
      points: [
        'Scan order waybill or invoice barcode to instantly load all required SKU line items and quantities.',
        'Scan each physical product barcode to verify item authenticity and prevent wrong size/color shipments.',
        'Visual and audio validation alerts confirm item match and notify when the parcel is completely verified.',
        'Automatic pack audit logging records the operator ID, packing duration, and timestamp for quality control.'
      ]
    },
    {
      id: 'logistics',
      title: '4. International & Regional Logistics & COD Reconciliation',
      icon: <LogisticsIcon sx={{ color: '#d97706' }} />,
      desc: 'Multi-carrier dispatch booking, real-time parcel tracking links, custom API configurations, and COD remittance settlement.',
      points: [
        'Supports International Carriers (DHL Express, FedEx CrossBorder, UPS Global, USPS Priority, Royal Mail, Aramex).',
        'Supports Regional Domestic Carriers (PostEx, Trax, TCS Express, Leopards, M&P Express, Blue Dart, Delhivery).',
        'Custom Courier & API Configuration: Add any custom shipping provider with live REST API endpoint, API token, and tracking URL template.',
        'COD Remittance Reconciliation: Record courier payment statements, track expected vs. collected cash, deduct shipping charges, and settle discrepancies.'
      ]
    },
    {
      id: 'waves',
      title: '5. Warehouse Wave Picking & Bin Location Routing',
      icon: <WaveIcon sx={{ color: '#7c3aed' }} />,
      desc: 'Batch open orders into consolidated picklists sorted by warehouse aisle, rack, shelf, and bin coordinates.',
      points: [
        'Batch multiple unfulfilled orders into a single consolidated picking session (Wave Picking).',
        'Consolidated SKU picklists calculate total units needed across all orders in the wave.',
        'Bin Location Management: Assign zone, aisle, rack, shelf, and bin coordinates to SKUs for optimized walking routes.',
        'Export printable picking sheets formatted with barcode labels and bin locations.'
      ]
    },
    {
      id: 'returns',
      title: '6. Returns & Reverse Logistics (Scan-to-Restock)',
      icon: <ReturnsIcon sx={{ color: '#dc2626' }} />,
      desc: 'Efficiently intake customer returned parcels, assess item conditions, and auto-increment warehouse stock.',
      points: [
        'Scan returned waybill or product barcode to immediately identify customer order and returned SKU.',
        'Condition Inspection: Categorize items as Resellable (restock into inventory) or Damaged / Defective (write-off).',
        'Auto Inventory Increment: One-click restocking immediately updates local SQLite stock quantities and syncs back to online stores.',
        'Reverse Analytics: Track return rates, primary return reasons (Wrong Size, Defective, Customer Changed Mind), and supplier defect trends.'
      ]
    },
    {
      id: 'forecast',
      title: '7. Inventory Velocity, Run-Out Days & Supplier Purchase Orders',
      icon: <ForecastIcon sx={{ color: '#0284c7' }} />,
      desc: 'Data-driven stock replenishment forecasting based on real 30-day burn rate and supplier PO dock receiving.',
      points: [
        '30-Day Sales Velocity: Calculates average daily sales per SKU across all sales channels.',
        'Days of Stock Remaining: Real-time countdown warning you before bestselling SKUs run out of stock.',
        'Supplier PO Generator: Create professional Purchase Orders with supplier details, expected delivery dates, and cost prices.',
        'Dock Receiving Station: Receive supplier shipments partially or fully, automatically updating stock levels.'
      ]
    },
    {
      id: 'print',
      title: '8. Thermal Print Studio & Custom Template Designer',
      icon: <PrintIcon sx={{ color: '#475569' }} />,
      desc: 'Generate 4x6 thermal shipping waybills, A4 invoices, barcode labels, and design custom HTML documents.',
      points: [
        'Generate crisp 203 DPI and 300 DPI thermal labels formatted for standard 4x6 inch (100x150mm) label printers.',
        'Generate multi-order batch A4 invoices, packing slips, barcode sticker sheets, and product price tags.',
        'Custom HTML Template Designer: Build and customize invoices and receipts with live visual preview and dynamic placeholders ({{order_name}}, {{customer_name}}, {{items_table}}, {{total}}).',
        'Document Archive: Historical archive of all generated PDFs with instant re-open, single deletion, and one-click all clear options.'
      ]
    }
  ];

  const faqs = [
    {
      q: 'Does Skulane work completely offline without an active internet connection?',
      a: 'Yes. Skulane is built with a local-first SQLite database architecture. All orders, products, packing workflows, and reports run locally at maximum speed. When internet is restored, changes automatically sync with Shopify and WooCommerce in the background.'
    },
    {
      q: 'How do I connect my own custom courier API or shipping provider?',
      a: 'Navigate to "Logistics & Couriers" > "Connected Carriers" tab and click "Add Custom Carrier / Connect API". Enter your courier name, category, live API Endpoint URL, API Secret Token/Key, and tracking URL template. You can test the connection immediately using the "Test Connection" button.'
    },
    {
      q: 'How does the Automatic SKU and Barcode Generator work for new products?',
      a: 'When new products sync from your online store that lack an SKU or barcode, Skulane automatically generates standard EAN-13 barcodes and systematic SKUs based on product title, vendor, and options. These can be saved and synced directly back to your store.'
    },
    {
      q: 'How do I prevent fake or duplicate COD orders from being dispatched?',
      a: 'Skulane includes an automated Duplicate Order Detector. When you view any order, the system scans your database for any orders placed by the same phone number within the last 48 hours. If duplicates are found, a warning banner appears with one-click options to verify or consolidate.'
    },
    {
      q: 'How does Scan-to-Restock work in Returns & Exchanges?',
      a: 'In the "Returns & Exchanges" page, enter or scan the returned order waybill or product barcode. Select the item condition (Resellable or Damaged), choose the return reason, and click "Confirm Return & Restock". If marked resellable, inventory stock is automatically incremented in the database.'
    },
    {
      q: 'How can I print 4x6 inch thermal shipping labels directly to my barcode printer?',
      a: 'Open "Print Studio", select the orders you wish to print, choose "4x6 Thermal Label" from the document kind dropdown, and click "Generate Document PDF". The PDF is generated at exact 100x150mm dimensions ready for high-speed thermal printing on Zebra, Xprinter, TSC, or Rongta printers.'
    },
    {
      q: 'Where are my database files and document PDFs stored on my computer?',
      a: 'Your database and document archive are stored securely in your Windows user profile AppData folder: AppData/Roaming/Skulane. You can view the exact path or clear data in the "Settings" page under "App & Storage Info".'
    },
    {
      q: 'Who should I contact for custom updates, specialized features, or new carrier integrations?',
      a: 'You can contact the lead developer, Muhammad Shahbaz, directly through the "Developer Support" section in the app, via WhatsApp at +92 306 1081842 or email at mrshahbaznns@gmail.com.'
    }
  ];

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3.5 }, maxWidth: 1300, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <GuideIcon sx={{ fontSize: 32, color: '#2563eb' }} />
          <div>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
              User Operations Guide & Knowledge Base
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Comprehensive manual, operational workflows, and frequently asked questions for Skulane
            </Typography>
          </div>
        </Stack>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_e, v) => setActiveTab(v)}
        sx={{ borderBottom: '1px solid #e2e8f0', mb: 3.5 }}
      >
        <Tab label="Modules & Operations Manual" sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.95rem' }} />
        <Tab label="Frequently Asked Questions (FAQ)" sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.95rem' }} />
        <Tab label="Keyboard Shortcuts & Best Practices" sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.95rem' }} />
      </Tabs>

      {/* Tab 0: Modules & Operations Manual */}
      {activeTab === 0 && (
        <Stack spacing={3}>
          {manualSections.map((sec) => (
            <Card key={sec.id} sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      p: 1.2,
                      borderRadius: 1.5,
                      bgcolor: '#f8fafc',
                      border: '1px solid #edf2f7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {sec.icon}
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      {sec.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {sec.desc}
                    </Typography>
                  </Box>
                </Stack>

                <Divider sx={{ my: 1.5 }} />

                <Stack spacing={1.2} sx={{ mt: 2 }}>
                  {sec.points.map((pt, idx) => (
                    <Stack direction="row" spacing={1.2} alignItems="flex-start" key={idx}>
                      <CheckIcon sx={{ fontSize: 18, color: '#16a34a', mt: 0.2, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.5 }}>
                        {pt}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Tab 1: Frequently Asked Questions (FAQ) */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search knowledge base and frequently asked questions..."
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#64748b' }} />
                  </InputAdornment>
                )
              }}
              sx={{ bgcolor: '#ffffff' }}
            />
          </Box>

          <Stack spacing={1.5}>
            {filteredFaqs.length === 0 ? (
              <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No FAQ items found matching "{faqSearch}".
                </Typography>
              </Card>
            ) : (
              filteredFaqs.map((faq, idx) => (
                <Accordion
                  key={idx}
                  expanded={expandedAccordion === `panel${idx}`}
                  onChange={handleAccordionChange(`panel${idx}`)}
                  sx={{
                    border: '1px solid #e2e8f0',
                    boxShadow: 'none',
                    borderRadius: '8px !important',
                    '&:before': { display: 'none' },
                    overflow: 'hidden'
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      bgcolor: expandedAccordion === `panel${idx}` ? '#f8fafc' : '#ffffff',
                      '&:hover': { bgcolor: '#f8fafc' }
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                      {faq.q}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 2.5, bgcolor: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
                    <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.6 }}>
                      {faq.a}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </Stack>

          {/* Direct Developer Contact Banner */}
          <Paper
            elevation={0}
            sx={{
              mt: 4,
              p: 3,
              bgcolor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2
            }}
          >
            <div>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e3a8a' }}>
                Have a question not listed here?
              </Typography>
              <Typography variant="body2" sx={{ color: '#1e40af' }}>
                Contact lead developer <strong>Muhammad Shahbaz</strong> on WhatsApp (+92 306 1081842) for immediate assistance.
              </Typography>
            </div>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={() => {
                if (window.api?.messaging?.openWhatsApp) {
                  window.api.messaging.openWhatsApp({
                    phone: '+923061081842',
                    text: 'Hello Muhammad Shahbaz, I have a question regarding Skulane.'
                  });
                } else {
                  window.open('https://wa.me/923061081842', '_blank');
                }
              }}
              sx={{ bgcolor: '#16a34a', fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#15803d' } }}
            >
              Ask on WhatsApp
            </Button>
          </Paper>
        </Box>
      )}

      {/* Tab 2: Keyboard Shortcuts & Best Practices */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <KeyboardIcon sx={{ color: '#2563eb' }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Warehouse Barcode Scanner Workflow
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                  Skulane is optimized for USB, Bluetooth, and 2.4GHz handheld laser and 2D image scanners.
                </Typography>

                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #f1f5f9' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Operation</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Action / Key Trigger</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow hover>
                        <TableCell sx={{ fontWeight: 600 }}>Pack Station Order Lookup</TableCell>
                        <TableCell><Chip label="Scan Order / Waybill Barcode" size="small" /></TableCell>
                      </TableRow>
                      <TableRow hover>
                        <TableCell sx={{ fontWeight: 600 }}>Pack Station SKU Scan</TableCell>
                        <TableCell><Chip label="Scan Physical Product Barcode" size="small" /></TableCell>
                      </TableRow>
                      <TableRow hover>
                        <TableCell sx={{ fontWeight: 600 }}>Returns Restock Intake</TableCell>
                        <TableCell><Chip label="Scan Return Parcel Tracking #" size="small" /></TableCell>
                      </TableRow>
                      <TableRow hover>
                        <TableCell sx={{ fontWeight: 600 }}>Wave Pick Sheet Verification</TableCell>
                        <TableCell><Chip label="Scan Pick Session Barcode" size="small" /></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <SpeedIcon sx={{ color: '#16a34a' }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Warehouse Performance Best Practices
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                  Recommended settings for enterprise fulfillment operations with over 5,000 daily orders:
                </Typography>

                <Stack spacing={1.5}>
                  <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #edf2f7' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      1. Batch Thermal Printing
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Print packing slips and waybills in batches of 50 to 100 for optimal printer spooling speeds.
                    </Typography>
                  </Box>

                  <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #edf2f7' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      2. Assign Warehouse Bin Locations
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Tag every SKU with aisle and rack coordinates in "Wave Picking & Bins" to reduce picker walking distance by up to 60%.
                    </Typography>
                  </Box>

                  <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #edf2f7' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      3. Weekly COD Remittance Reconciliation
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Log carrier remittance statements in "Logistics" every week to identify unpaid COD balances or disputed courier shipping deductions.
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
