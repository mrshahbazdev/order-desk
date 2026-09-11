import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Snackbar, Alert, Slide, Stack, LinearProgress, Box, Typography } from '@mui/material';

/**
 * App-wide feedback.
 *
 * Before this, sync / fulfil / print / stock updates all completed in total
 * silence — the user had no way to tell a success from a no-op. This also
 * consumes the `notification` and `sync:progress` IPC channels, which were
 * allowlisted in the preload and then never listened to.
 */

const ToastContext = createContext({ notify: () => {} });

export const useToast = () => useContext(ToastContext);

/** Wrap any async handler so failures always surface instead of hitting the console. */
export function useAsyncAction() {
  const { notify } = useToast();
  return useCallback(
    async (fn, { success, pending } = {}) => {
      try {
        if (pending) notify(pending, 'info');
        const result = await fn();
        if (success) notify(typeof success === 'function' ? success(result) : success, 'success');
        return result;
      } catch (err) {
        notify(err?.message || 'Something went wrong', 'error');
        return null;
      }
    },
    [notify]
  );
}

export function ToastProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [progress, setProgress] = useState(null);
  const idRef = useRef(0);

  const notify = useCallback((message, severity = 'info', options = {}) => {
    if (!message) return;
    idRef.current += 1;
    setQueue((q) => [
      ...q,
      {
        id: idRef.current,
        message: String(message),
        severity,
        duration: options.duration ?? (severity === 'error' ? 8000 : 3500),
        action: options.action
      }
    ]);
  }, []);

  // One at a time, so a batch of updates doesn't stack into a wall.
  useEffect(() => {
    if (!current && queue.length) {
      setCurrent(queue[0]);
      setQueue((q) => q.slice(1));
    }
  }, [queue, current]);

  // Main-process events
  useEffect(() => {
    if (!window.api?.on) return;

    const unsubNotify = window.api.on('notification', (payload) => {
      if (typeof payload === 'string') notify(payload);
      else notify(payload?.message, payload?.severity || 'info');
    });

    const unsubStatus = window.api.on('sync:status', (data) => {
      if (data?.status === 'auth_failed') {
        notify(data.message || 'A store needs reconnecting', 'error', { duration: 12000 });
      } else if (data?.status === 'error') {
        notify(data.message || 'Sync failed', 'error');
      }
    });

    const unsubProgress = window.api.on('sync:progress', (data) => {
      if (!data) return;
      setProgress(data.done && data.total ? { ...data } : null);
    });

    const unsubComplete = window.api.on('sync:complete', (data) => {
      setProgress(null);
      const orders = data?.orderRes?.totalProcessed || 0;
      const products = data?.productRes?.totalProcessed || 0;
      if (orders || products) {
        notify(
          `Synced ${orders} order${orders === 1 ? '' : 's'}` +
            (products ? ` and ${products} product${products === 1 ? '' : 's'}` : ''),
          'success'
        );
      }
    });

    return () => {
      unsubNotify(); unsubStatus(); unsubProgress(); unsubComplete();
    };
  }, [notify]);

  const pct = progress && progress.total ? (progress.done / progress.total) * 100 : null;

  return (
    <ToastContext.Provider value={{ notify }}>
      {/* Thin sync bar under the app bar — a long backfill used to look frozen */}
      {progress && (
        <Box
          sx={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1400,
            bgcolor: 'rgba(15,23,42,0.92)', color: '#fff', px: 2, py: 0.75
          }}
        >
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {progress.label || `Syncing ${progress.resource || ''}`}
            </Typography>
            <Typography variant="caption">
              {progress.done.toLocaleString()} / {progress.total.toLocaleString()}
            </Typography>
          </Stack>
          <LinearProgress
            variant={pct == null ? 'indeterminate' : 'determinate'}
            value={pct ?? 0}
            sx={{ height: 4, borderRadius: 2 }}
          />
        </Box>
      )}

      {children}

      <Snackbar
        key={current?.id}
        open={!!current}
        autoHideDuration={current?.duration}
        onClose={(_e, reason) => { if (reason !== 'clickaway') setCurrent(null); }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        TransitionComponent={(p) => <Slide {...p} direction="left" />}
      >
        {current && (
          <Alert
            severity={current.severity}
            variant="filled"
            onClose={() => setCurrent(null)}
            action={current.action}
            sx={{ minWidth: 320, boxShadow: '0 8px 24px rgba(15,23,42,0.25)' }}
          >
            {current.message}
          </Alert>
        )}
      </Snackbar>
    </ToastContext.Provider>
  );
}
