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
  IconButton,
  Tooltip,
  Alert,
  Paper
} from '@mui/material';
import {
  Email as EmailIcon,
  WhatsApp as WhatsAppIcon,
  HeadsetMic as SupportIcon,
  Code as DevIcon,
  Build as BuildIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  IntegrationInstructions as IntegrationIcon,
  Send as SendIcon,
  Storage as DatabaseIcon,
  LocalShipping as ShippingIcon,
  Tune as CustomIcon
} from '@mui/icons-material';

export default function Support() {
  const [copiedKey, setCopiedKey] = useState(null);
  const [inquirySubject, setInquirySubject] = useState('Custom Feature Request / Update');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [contactMethod, setContactMethod] = useState('whatsapp');
  const [alert, setAlert] = useState(null);

  const contactInfo = {
    developerName: 'Muhammad Shahbaz',
    developerTitle: 'Lead Software Engineer & Solutions Architect',
    primaryEmail: 'mrshahbaznns@gmail.com',
    secondaryEmail: 'mrshahbaz46@gamil.com',
    whatsappNumber: '+923061081842',
    whatsappDisplay: '+92 306 1081842',
    availability: '24/7 Global Technical Support & Custom Development'
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setAlert({ type: 'success', message: `Copied "${text}" to clipboard.` });
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleOpenWhatsApp = async (customText = null) => {
    const textToSend = customText || `Hello Muhammad Shahbaz, I am using Order Desk and would like to request support/custom updates.\n\nSubject: ${inquirySubject}\nDetails: ${inquiryMessage || 'I would like to discuss custom features.'}`;
    try {
      if (window.api?.messaging?.openWhatsApp) {
        await window.api.messaging.openWhatsApp({
          phone: contactInfo.whatsappNumber,
          text: textToSend
        });
      } else {
        const cleanPhone = contactInfo.whatsappNumber.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(textToSend)}`, '_blank');
      }
    } catch (err) {
      setAlert({ type: 'error', message: `Unable to open WhatsApp: ${err.message}` });
    }
  };

  const handleOpenEmail = (recipientEmail) => {
    const emailTo = recipientEmail || contactInfo.primaryEmail;
    const subject = encodeURIComponent(`Order Desk Inquiry: ${inquirySubject}`);
    const body = encodeURIComponent(
      `Hello Muhammad Shahbaz,\n\nI am contacting you regarding Order Desk enterprise management software.\n\nInquiry Details:\n${inquiryMessage || 'Please contact me regarding custom features and technical support.'}\n\nBest regards.`
    );
    window.open(`mailto:${emailTo}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleSendInquiry = () => {
    if (contactMethod === 'whatsapp') {
      handleOpenWhatsApp();
    } else {
      handleOpenEmail(contactInfo.primaryEmail);
    }
  };

  const services = [
    {
      title: 'Carrier & Courier API Integration',
      desc: 'Connect live APIs for custom international or regional shipping couriers (PostEx, Trax, DHL, FedEx, TCS, Leopards, Aramex).',
      icon: <ShippingIcon sx={{ color: '#2563eb' }} />
    },
    {
      title: 'Store & Channel Connectors',
      desc: 'Custom bi-directional sync bridges for Shopify, WooCommerce, Amazon, Daraz, Magento, or in-house ERP databases.',
      icon: <IntegrationIcon sx={{ color: '#0891b2' }} />
    },
    {
      title: 'Barcode & Thermal Label Templates',
      desc: 'Design bespoke 4x6 inch shipping waybills, barcode formats, custom invoices, packing slips, and QR tag layouts.',
      icon: <CustomIcon sx={{ color: '#d97706' }} />
    },
    {
      title: 'Warehouse & Wave Picking Automation',
      desc: 'Tailor-made multi-location warehouse routing algorithms, bin mapping, and handheld terminal barcode scanner integrations.',
      icon: <DatabaseIcon sx={{ color: '#16a34a' }} />
    },
    {
      title: 'Dedicated Feature Development',
      desc: 'Build specialized business modules, custom commission calculations, accounting exports, and role-based access controls.',
      icon: <DevIcon sx={{ color: '#7c3aed' }} />
    },
    {
      title: 'Maintenance & Cloud Server Setup',
      desc: 'Performance optimization, high-volume order database indexing, automated cloud backups, and offline sync stabilization.',
      icon: <BuildIcon sx={{ color: '#dc2626' }} />
    }
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3.5 }, maxWidth: 1300, mx: 'auto' }}>
      {/* Header with Developer Profile */}
      <Box sx={{ mb: 3.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} sx={{ mb: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <SupportIcon sx={{ fontSize: 32, color: '#2563eb' }} />
            <div>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Developer Support & Custom Solutions
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Direct Engineering & Software Development by <strong>Muhammad Shahbaz</strong>
              </Typography>
            </div>
          </Stack>

          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              px: 2.5,
              bgcolor: '#0f172a',
              color: '#ffffff',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5
            }}
          >
            <DevIcon sx={{ color: '#38bdf8' }} />
            <div>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Lead Software Developer
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#ffffff' }}>
                Muhammad Shahbaz
              </Typography>
            </div>
          </Paper>
        </Stack>

        <Typography variant="body1" color="text.secondary">
          Need custom feature additions, courier API integrations, ERP connectors, or technical support? Get in direct contact with Muhammad Shahbaz.
        </Typography>
      </Box>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Main Direct Contact Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* WhatsApp Card */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: '100%',
              border: '1px solid #bbf7d0',
              bgcolor: '#f0fdf4',
              boxShadow: 'none',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: '#16a34a',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <WhatsAppIcon sx={{ fontSize: 26 }} />
                </Box>
                <Chip label="Fastest Response" size="small" sx={{ fontWeight: 800, bgcolor: '#dcfce7', color: '#15803d' }} />
              </Stack>

              <Typography variant="h6" sx={{ fontWeight: 800, color: '#14532d', mb: 0.5 }}>
                WhatsApp Direct Chat
              </Typography>
              <Typography variant="body2" sx={{ color: '#166534', mb: 2 }}>
                Instant communication for urgent updates, code enhancements, and bug resolutions.
              </Typography>

              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  bgcolor: '#ffffff',
                  border: '1px solid #dcfce7',
                  borderRadius: 1.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                  {contactInfo.whatsappDisplay}
                </Typography>
                <Tooltip title="Copy WhatsApp Number">
                  <IconButton
                    size="small"
                    onClick={() => copyToClipboard(contactInfo.whatsappNumber, 'wa')}
                    sx={{ color: '#16a34a' }}
                  >
                    {copiedKey === 'wa' ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Paper>
            </CardContent>

            <Box sx={{ p: 2, pt: 0 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<WhatsAppIcon />}
                onClick={() => handleOpenWhatsApp('Hello, I need custom updates and development support for Order Desk.')}
                sx={{
                  bgcolor: '#16a34a',
                  fontWeight: 800,
                  textTransform: 'none',
                  py: 1.2,
                  '&:hover': { bgcolor: '#15803d' }
                }}
              >
                Chat on WhatsApp
              </Button>
            </Box>
          </Card>
        </Grid>

        {/* Primary Email Card */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: '100%',
              border: '1px solid #bfdbfe',
              bgcolor: '#eff6ff',
              boxShadow: 'none',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: '#2563eb',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <EmailIcon sx={{ fontSize: 26 }} />
                </Box>
                <Chip label="Primary Email" size="small" sx={{ fontWeight: 800, bgcolor: '#dbeafe', color: '#1d4ed8' }} />
              </Stack>

              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e3a8a', mb: 0.5 }}>
                Primary Support Email
              </Typography>
              <Typography variant="body2" sx={{ color: '#1e40af', mb: 2 }}>
                Send detailed technical requirements, scope documents, or integration specifications.
              </Typography>

              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  bgcolor: '#ffffff',
                  border: '1px solid #dbeafe',
                  borderRadius: 1.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a', wordBreak: 'break-all', fontSize: '0.82rem' }}>
                  {contactInfo.primaryEmail}
                </Typography>
                <Tooltip title="Copy Primary Email">
                  <IconButton
                    size="small"
                    onClick={() => copyToClipboard(contactInfo.primaryEmail, 'email1')}
                    sx={{ color: '#2563eb' }}
                  >
                    {copiedKey === 'email1' ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Paper>
            </CardContent>

            <Box sx={{ p: 2, pt: 0 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<EmailIcon />}
                onClick={() => handleOpenEmail(contactInfo.primaryEmail)}
                sx={{
                  bgcolor: '#2563eb',
                  fontWeight: 800,
                  textTransform: 'none',
                  py: 1.2,
                  '&:hover': { bgcolor: '#1d4ed8' }
                }}
              >
                Send Email
              </Button>
            </Box>
          </Card>
        </Grid>

        {/* Secondary Email Card */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: '100%',
              border: '1px solid #e2e8f0',
              bgcolor: '#f8fafc',
              boxShadow: 'none',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: '#475569',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <EmailIcon sx={{ fontSize: 26 }} />
                </Box>
                <Chip label="Secondary Email" size="small" sx={{ fontWeight: 800, bgcolor: '#f1f5f9', color: '#475569' }} />
              </Stack>

              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
                Direct Alternate Email
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Direct developer backup inbox for project contracts and commercial inquiries.
              </Typography>

              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  bgcolor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 1.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a', wordBreak: 'break-all', fontSize: '0.82rem' }}>
                  {contactInfo.secondaryEmail}
                </Typography>
                <Tooltip title="Copy Alternate Email">
                  <IconButton
                    size="small"
                    onClick={() => copyToClipboard(contactInfo.secondaryEmail, 'email2')}
                    sx={{ color: '#475569' }}
                  >
                    {copiedKey === 'email2' ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Paper>
            </CardContent>

            <Box sx={{ p: 2, pt: 0 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<EmailIcon />}
                onClick={() => handleOpenEmail(contactInfo.secondaryEmail)}
                sx={{
                  fontWeight: 800,
                  textTransform: 'none',
                  py: 1.2
                }}
              >
                Contact Alternate Email
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Inquiry Form & Services Grid */}
      <Grid container spacing={3}>
        {/* Inquiry Quick Messenger */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
                Submit Custom Request or Inquiry
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Draft your required updates or technical questions below to immediately launch direct chat or email.
              </Typography>

              <Stack spacing={2.5}>
                <TextField
                  fullWidth
                  size="small"
                  label="Inquiry Topic / Request Type"
                  value={inquirySubject}
                  onChange={(e) => setInquirySubject(e.target.value)}
                  placeholder="e.g. Courier API integration, Custom receipt template, Bug fix"
                />

                <TextField
                  fullWidth
                  multiline
                  rows={5}
                  size="small"
                  label="Project Requirements / Message Details"
                  value={inquiryMessage}
                  onChange={(e) => setInquiryMessage(e.target.value)}
                  placeholder="Describe the feature, store integration, or software update you would like to have implemented..."
                />

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', display: 'block', mb: 1 }}>
                    SEND INQUIRY VIA:
                  </Typography>
                  <Stack direction="row" spacing={1.5}>
                    <Button
                      fullWidth
                      variant={contactMethod === 'whatsapp' ? 'contained' : 'outlined'}
                      startIcon={<WhatsAppIcon />}
                      onClick={() => setContactMethod('whatsapp')}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        bgcolor: contactMethod === 'whatsapp' ? '#16a34a' : 'transparent',
                        '&:hover': { bgcolor: contactMethod === 'whatsapp' ? '#15803d' : 'transparent' }
                      }}
                    >
                      WhatsApp
                    </Button>
                    <Button
                      fullWidth
                      variant={contactMethod === 'email' ? 'contained' : 'outlined'}
                      startIcon={<EmailIcon />}
                      onClick={() => setContactMethod('email')}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        bgcolor: contactMethod === 'email' ? '#2563eb' : 'transparent',
                        '&:hover': { bgcolor: contactMethod === 'email' ? '#1d4ed8' : 'transparent' }
                      }}
                    >
                      Email Client
                    </Button>
                  </Stack>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={<SendIcon />}
                  onClick={handleSendInquiry}
                  sx={{
                    fontWeight: 800,
                    textTransform: 'none',
                    py: 1.3,
                    bgcolor: contactMethod === 'whatsapp' ? '#16a34a' : '#2563eb',
                    '&:hover': { bgcolor: contactMethod === 'whatsapp' ? '#15803d' : '#1d4ed8' }
                  }}
                >
                  Send Inquiry Now
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Custom Development Services Available */}
        <Grid item xs={12} lg={7}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
                Available Custom Engineering Services
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                We provide tailored enhancements, private deployments, and bespoke modifications for your e-commerce operations.
              </Typography>

              <Grid container spacing={2}>
                {services.map((srv, idx) => (
                  <Grid item xs={12} sm={6} key={idx}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        height: '100%',
                        border: '1px solid #f1f5f9',
                        bgcolor: '#f8fafc',
                        borderRadius: 1.5,
                        transition: 'transform 0.2s',
                        '&:hover': {
                          borderColor: '#cbd5e1',
                          bgcolor: '#ffffff'
                        }
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <Box sx={{ mt: 0.3 }}>{srv.icon}</Box>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
                            {srv.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4, display: 'block' }}>
                            {srv.desc}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
