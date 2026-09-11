import React from 'react';
import { Box, Typography, Button, Paper, Stack, Collapse } from '@mui/material';
import { ErrorOutline, Refresh, ContentCopy } from '@mui/icons-material';

/**
 * Without this, a single render error anywhere blanks the entire window and
 * the only way back is killing the process — which, for a desktop app sitting
 * on a packing table, looks like the app is broken rather than one screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => this.setState({ error: null, info: null, showDetails: false });

  copyDetails = async () => {
    const diagnostics = window.api?.app?.getDiagnostics
      ? await window.api.app.getDiagnostics().catch(() => ({}))
      : {};
    const text = [
      `Screen: ${this.props.screen || 'unknown'}`,
      `Error: ${this.state.error?.message}`,
      this.state.error?.stack,
      '--- environment ---',
      JSON.stringify(diagnostics, null, 2)
    ].join('\n');
    navigator.clipboard.writeText(text);
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <Paper sx={{ p: 4, maxWidth: 640, width: '100%' }}>
          <Stack spacing={2}>
            <ErrorOutline sx={{ fontSize: 44, color: '#dc2626' }} />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              This screen ran into a problem
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your data is safe — nothing was lost, and everything is still stored
              locally. Going back usually clears it.
            </Typography>

            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#fef2f2' }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#991b1b' }}>
                {this.state.error.message}
              </Typography>
            </Paper>

            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" startIcon={<Refresh />} onClick={this.reset}>
                Try again
              </Button>
              <Button variant="outlined" startIcon={<ContentCopy />} onClick={this.copyDetails}>
                Copy diagnostics
              </Button>
              <Button
                variant="text"
                onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
              >
                {this.state.showDetails ? 'Hide' : 'Show'} details
              </Button>
            </Stack>

            <Collapse in={this.state.showDetails}>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5, bgcolor: '#0f172a', color: '#e2e8f0',
                  maxHeight: 260, overflow: 'auto'
                }}
              >
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', m: 0 }}
                >
                  {this.state.error.stack}
                  {this.state.info?.componentStack}
                </Typography>
              </Paper>
            </Collapse>
          </Stack>
        </Paper>
      </Box>
    );
  }
}
