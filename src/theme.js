import { createTheme } from '@mui/material/styles';

const palette = {
  mode: 'light',
  primary: {
    main: '#1D4ED8',
    dark: '#1E3A8A',
    light: '#3B82F6',
    contrastText: '#FFFFFF'
  },
  secondary: {
    main: '#0F172A',
    dark: '#020617',
    light: '#334155',
    contrastText: '#FFFFFF'
  },
  success: { main: '#059669', contrastText: '#FFFFFF' },
  warning: { main: '#D97706', contrastText: '#FFFFFF' },
  error:   { main: '#DC2626', contrastText: '#FFFFFF' },
  info:    { main: '#0284C7', contrastText: '#FFFFFF' },
  background: {
    default: '#F4F6F8',
    paper: '#FFFFFF'
  },
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    disabled: '#94A3B8'
  },
  divider: '#E5E7EB',
  grey: {
    50:  '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A'
  }
};

const typography = {
  fontFamily: '"Inter","Segoe UI","Helvetica Neue",Arial,sans-serif',
  h1: { fontWeight: 700, letterSpacing: '-0.02em' },
  h2: { fontWeight: 700, letterSpacing: '-0.02em' },
  h3: { fontWeight: 700, letterSpacing: '-0.01em' },
  h4: { fontWeight: 700, letterSpacing: '-0.01em', fontSize: '1.5rem' },
  h5: { fontWeight: 600, fontSize: '1.2rem' },
  h6: { fontWeight: 600, fontSize: '1.05rem' },
  subtitle1: { fontWeight: 600 },
  subtitle2: { fontWeight: 600, color: '#475569' },
  body1: { fontSize: '0.9375rem' },
  body2: { fontSize: '0.875rem' },
  button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
  overline: { letterSpacing: '0.08em', fontWeight: 700, fontSize: '0.72rem' }
};

const theme = createTheme({
  palette,
  typography,
  shape: { borderRadius: 8 },
  shadows: [
    'none',
    '0 1px 2px rgba(15,23,42,0.06)',
    '0 2px 4px rgba(15,23,42,0.08)',
    '0 3px 6px rgba(15,23,42,0.08)',
    '0 4px 8px rgba(15,23,42,0.10)',
    '0 6px 12px rgba(15,23,42,0.10)',
    ...Array(19).fill('0 8px 16px rgba(15,23,42,0.12)')
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#F4F6F8',
          color: '#0F172A'
        },
        '*::-webkit-scrollbar': { width: 8, height: 8 },
        '*::-webkit-scrollbar-thumb': { background: '#CBD5E1', borderRadius: 4 },
        '*::-webkit-scrollbar-thumb:hover': { background: '#94A3B8' }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#FFFFFF',
          color: '#0F172A',
          borderBottom: '1px solid #E5E7EB',
          boxShadow: 'none'
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          backgroundColor: '#0F172A',
          color: '#E2E8F0',
          borderRight: 'none'
        }
      }
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #E5E7EB'
        }
      }
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #E5E7EB',
          borderRadius: 10
        }
      }
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          paddingLeft: 16,
          paddingRight: 16,
          fontWeight: 600
        },
        containedPrimary: {
          backgroundColor: '#1D4ED8',
          '&:hover': { backgroundColor: '#1E3A8A' }
        },
        outlined: {
          borderColor: '#CBD5E1',
          color: '#0F172A',
          '&:hover': { backgroundColor: '#F1F5F9', borderColor: '#94A3B8' }
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#FFFFFF'
        },
        notchedOutline: { borderColor: '#CBD5E1' }
      }
    },
    MuiTextField: {
      defaultProps: { size: 'small' }
    },
    MuiFormControl: {
      defaultProps: { size: 'small' }
    },
    MuiSelect: {
      defaultProps: { size: 'small' }
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 6 }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#F8FAFC',
          color: '#334155',
          fontWeight: 700,
          fontSize: '0.78rem',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          borderBottom: '1px solid #E5E7EB'
        },
        body: {
          borderBottom: '1px solid #F1F5F9',
          fontSize: '0.875rem'
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: '#F8FAFC' }
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 12 }
      }
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          borderBottom: '1px solid #E5E7EB',
          padding: '16px 24px'
        }
      }
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '12px 24px',
          borderTop: '1px solid #E5E7EB'
        }
      }
    },
    MuiTabs: {
      styleOverrides: {
        root: { borderBottom: '1px solid #E5E7EB', minHeight: 42 },
        indicator: { height: 3, borderRadius: 3 }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 42,
          fontSize: '0.9rem'
        }
      }
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8, border: '1px solid transparent' }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: '#0F172A', fontSize: '0.75rem' }
      }
    }
  }
});

export default theme;
