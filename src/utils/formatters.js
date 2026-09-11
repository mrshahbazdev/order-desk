export function formatMoney(amountMinor = 0, currency = 'PKR') {
  if (amountMinor === null || amountMinor === undefined) return `${currency} 0.00`;
  const val = (amountMinor / 100).toFixed(2);
  return `${currency} ${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

export function getStatusColor(status) {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'paid':
    case 'fulfilled':
    case 'active':
    case 'done':
      return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
    case 'pending':
    case 'unfulfilled':
    case 'processing':
      return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
    case 'partial':
      return { bg: '#e0e7ff', text: '#4338ca', border: '#c7d2fe' };
    case 'refunded':
    case 'restocked':
    case 'failed':
    case 'auth_failed':
      return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' };
    default:
      return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
  }
}
