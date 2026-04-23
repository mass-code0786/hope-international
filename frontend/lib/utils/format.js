export function formatCurrency(value = 0) {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `$${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)}`;
}

export function currency(value = 0) {
  return formatCurrency(value);
}

export function number(value = 0) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);
}

export function cryptoAmount(value = 0, options = {}) {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  const maximumFractionDigits = Math.max(0, Math.min(Number(options.maximumFractionDigits ?? 8), 8));
  const minimumFractionDigits = Math.max(0, Math.min(Number(options.minimumFractionDigits ?? 0), maximumFractionDigits));

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits
  }).format(amount);
}

export function percentage(value = 0) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export function formatLabel(text) {
  if (!text) return '';
  const normalized = String(text)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  if (!normalized) return '';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function shortDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function dateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const incomeSourceMap = {
  direct_income: 'Direct Income',
  direct_deposit_income: 'Direct Deposit Income',
  level_deposit_income: 'Level Deposit Income',
  matching_income: 'Matching Income',
  reward_qualification: 'Reward Qualification',
  cap_overflow: 'Cap Overflow',
  manual_adjustment: 'Manual Adjustment',
  order_purchase: 'Order Purchase',
  deposit_request: 'Deposit Request',
  withdrawal_request: 'Withdrawal Request',
  seller_application_fee: 'Seller Application Fee',
  autopool_entry: 'Autopool Entry',
  autopool_matrix_income: 'Autopool Matrix Income',
  autopool_upline_income: 'Autopool Upline Income',
  autopool_auction_share: 'Autopool Auction Share',
  p2p_transfer: 'P2P Transfer',
  welcome_spin_bonus: 'Welcome Spin Bonus',
  auction_loss_compensation: 'Auction BTCT Reward',
  btct_staking_payout: 'BTCT Staking Payout'
};

const txTypeMap = {
  credit: 'Credit',
  debit: 'Debit'
};

const rankMap = {
  'no rank': 'No Rank',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  diamond: 'Diamond',
  crown: 'Crown'
};

const orderStatusMap = {
  pending: 'Pending',
  paid: 'Paid',
  cancelled: 'Cancelled',
  completed: 'Completed',
  approved: 'Approved',
  rejected: 'Rejected',
  failed: 'Failed'
};

const sellerApplicationStatusMap = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected'
};

const moderationStatusMap = {
  pending: 'Pending Moderation',
  approved: 'Approved',
  rejected: 'Rejected'
};

export function incomeSourceLabel(source) {
  if (!source) return 'Transaction';
  return incomeSourceMap[source] || source.split('_').map(capitalize).join(' ');
}

export function txTypeLabel(type) {
  if (!type) return 'Unknown';
  return txTypeMap[type] || capitalize(type);
}

export function rankLabel(rank) {
  if (!rank) return 'No Rank';
  return rankMap[String(rank).toLowerCase()] || rank;
}

export function orderStatusLabel(status) {
  if (!status) return 'Unknown';
  return orderStatusMap[status] || capitalize(status);
}

export function orderStatusVariant(status) {
  if (status === 'paid') return 'success';
  if (status === 'cancelled') return 'danger';
  return 'default';
}

function capitalize(value = '') {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function sellerApplicationStatusLabel(status) {
  if (!status) return 'Not Applied';
  return sellerApplicationStatusMap[status] || capitalize(status);
}

export function moderationStatusLabel(status) {
  if (!status) return 'Pending Moderation';
  return moderationStatusMap[status] || capitalize(status);
}

export function statusVariant(status) {
  if (status === 'approved' || status === 'paid' || status === 'completed' || status === 'processed') return 'success';
  if (status === 'rejected' || status === 'cancelled' || status === 'failed') return 'danger';
  if (status === 'pending' || status === 'processing') return 'warning';
  return 'default';
}



