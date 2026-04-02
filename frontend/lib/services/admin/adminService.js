import { apiFetch } from '@/lib/api/client';

function toEnvelope(payload) {
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return {
      data: payload.data ?? null,
      pagination: payload.pagination ?? null,
      summary: payload.summary ?? null,
      message: payload.message ?? ''
    };
  }

  return {
    data: payload ?? null,
    pagination: null,
    summary: null,
    message: ''
  };
}

function withQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') return;
    query.set(key, String(value));
  });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
}

export async function getAdminDashboardOverview() {
  const envelope = toEnvelope(await apiFetch('/admin/dashboard'));
  const data = envelope.data || {};
  return {
    ...envelope,
    data: {
      summary: data.summary || {},
      recentOrders: Array.isArray(data.recentOrders) ? data.recentOrders : [],
      recentTransactions: Array.isArray(data.recentTransactions) ? data.recentTransactions : [],
      charts: data.charts || {}
    }
  };
}

export async function getAdminUsers(params = {}) {
  return toEnvelope(await apiFetch(`/admin/users${withQuery(params)}`));
}

export async function getAdminUsersSearch(params = {}) {
  return toEnvelope(await apiFetch(`/admin/users/search${withQuery(params)}`));
}

export async function getAdminUserDetails(userId) {
  return toEnvelope(await apiFetch(`/admin/users/${userId}`));
}

export async function updateAdminUserStatus(userId, isActive) {
  return toEnvelope(
    await apiFetch(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive })
    })
  );
}

export async function updateAdminUserRank(userId, rankId) {
  return toEnvelope(
    await apiFetch(`/admin/users/${userId}/rank`, {
      method: 'PATCH',
      body: JSON.stringify({ rankId })
    })
  );
}

export async function getAdminRanks() {
  return toEnvelope(await apiFetch('/admin/ranks'));
}

export async function getAdminProducts(params = {}) {
  return toEnvelope(await apiFetch(`/admin/products${withQuery(params)}`));
}

export async function getAdminProductDetails(productId) {
  return toEnvelope(await apiFetch(`/admin/products/${productId}`));
}

export async function createAdminProduct(payload) {
  return toEnvelope(
    await apiFetch('/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

export async function updateAdminProduct(productId, payload) {
  return toEnvelope(
    await apiFetch(`/admin/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  );
}

export async function getAdminOrders(params = {}) {
  return toEnvelope(await apiFetch(`/admin/orders${withQuery(params)}`));
}

export async function getAdminOrderDetails(orderId) {
  return toEnvelope(await apiFetch(`/admin/orders/${orderId}`));
}

export async function getAdminWalletTransactions(params = {}) {
  return toEnvelope(await apiFetch(`/admin/wallet/transactions${withQuery(params)}`));
}

export async function getAdminWalletSummary() {
  return toEnvelope(await apiFetch('/admin/wallet/summary'));
}

export async function createManualWalletAdjustment(payload) {
  return toEnvelope(
    await apiFetch('/admin/wallet/adjust', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

export async function getAdminWeeklyCompensation(params = {}) {
  return toEnvelope(await apiFetch(`/admin/compensation/weekly${withQuery(params)}`));
}

export async function getAdminWeeklyCompensationDetail(cycleId) {
  return toEnvelope(await apiFetch(`/admin/compensation/weekly/${cycleId}`));
}

export async function runWeeklyMatching(payload) {
  return toEnvelope(
    await apiFetch('/admin/compensation/weekly/run', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

export async function getAdminMonthlyCompensation(params = {}) {
  return toEnvelope(await apiFetch(`/admin/compensation/monthly${withQuery(params)}`));
}

export async function getAdminMonthlyCompensationDetail(cycleId) {
  return toEnvelope(await apiFetch(`/admin/compensation/monthly/${cycleId}`));
}

export async function runMonthlyRewards(payload) {
  return toEnvelope(
    await apiFetch('/admin/compensation/monthly/run', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

export async function getAdminRewardQualifications(params = {}) {
  return toEnvelope(await apiFetch(`/admin/rewards/qualifications${withQuery(params)}`));
}

export async function getAdminRewardsSummary(params = {}) {
  return toEnvelope(await apiFetch(`/admin/rewards/summary${withQuery(params)}`));
}

export async function updateAdminRewardQualificationStatus(id, status) {
  return toEnvelope(
    await apiFetch(`/admin/rewards/qualifications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
  );
}

export async function getAdminTeamSummary(userId) {
  return toEnvelope(await apiFetch(`/admin/team/user/${userId}/summary`));
}

export async function getAdminTeamTree(userId, depth = 2) {
  return toEnvelope(await apiFetch(`/admin/team/user/${userId}/tree${withQuery({ depth })}`));
}

export async function getAdminSettings() {
  return toEnvelope(await apiFetch('/admin/settings'));
}

export async function updateAdminSettings(payload) {
  return toEnvelope(
    await apiFetch('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  );
}

export async function getAdminDepositWalletSettings() {
  return toEnvelope(await apiFetch('/admin/settings/deposit-wallet'));
}

export async function updateAdminDepositWalletSettings(payload) {
  return toEnvelope(
    await apiFetch('/admin/settings/deposit-wallet', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  );
}

export async function getAdminBanners(params = {}) {
  return toEnvelope(await apiFetch(`/admin/banners${withQuery(params)}`));
}

export async function createAdminBanner(payload) {
  return toEnvelope(
    await apiFetch('/admin/banners', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

export async function updateAdminBanner(id, payload) {
  return toEnvelope(
    await apiFetch(`/admin/banners/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  );
}

export async function deleteAdminBanner(id) {
  return toEnvelope(
    await apiFetch(`/admin/banners/${id}`, {
      method: 'DELETE'
    })
  );
}

export async function getAdminDeposits(params = {}) {
  return toEnvelope(await apiFetch(`/admin/wallet/deposits${withQuery(params)}`));
}

export async function reviewAdminDeposit(id, payload) {
  return toEnvelope(
    await apiFetch(`/admin/wallet/deposits/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  );
}

export async function getAdminWithdrawals(params = {}) {
  return toEnvelope(await apiFetch(`/admin/wallet/withdrawals${withQuery(params)}`));
}

export async function reviewAdminWithdrawal(id, payload) {
  return toEnvelope(
    await apiFetch(`/admin/wallet/withdrawals/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  );
}

export async function getAdminP2pTransfers(params = {}) {
  return toEnvelope(await apiFetch(`/admin/wallet/p2p${withQuery(params)}`));
}

export async function getAdminWalletBindings(params = {}) {
  return toEnvelope(await apiFetch(`/admin/wallet/bindings${withQuery(params)}`));
}

export async function updateAdminWalletBinding(userId, payload) {
  return toEnvelope(
    await apiFetch(`/admin/wallet/bindings/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  );
}

export async function removeAdminWalletBinding(userId) {
  return toEnvelope(
    await apiFetch(`/admin/wallet/bindings/${userId}`, {
      method: 'DELETE'
    })
  );
}

export async function getAdminIncomeTransactions(params = {}) {
  return toEnvelope(await apiFetch(`/admin/wallet/income${withQuery(params)}`));
}

export async function getAdminUserFinancialOverview(userId) {
  return toEnvelope(await apiFetch(`/admin/wallet/users/${userId}/financial-overview`));
}
export async function getAdminAuctions(params = {}) {
  return toEnvelope(await apiFetch('/admin/auctions' + withQuery(params)));
}

export async function getAdminAuctionDetails(id) {
  return toEnvelope(await apiFetch('/admin/auctions/' + id));
}

export async function createAdminAuction(payload) {
  return toEnvelope(
    await apiFetch('/admin/auctions', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

export async function updateAdminAuction(id, payload) {
  return toEnvelope(
    await apiFetch('/admin/auctions/' + id, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  );
}

export async function runAdminAuctionAction(id, payload) {
  return toEnvelope(
    await apiFetch('/admin/auctions/' + id + '/actions', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

export async function getAdminLanding() {
  return toEnvelope(await apiFetch('/admin/landing'));
}

export async function updateAdminLandingSettings(payload) {
  return toEnvelope(
    await apiFetch('/admin/landing/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  );
}

export async function updateAdminLandingStats(payload) {
  return toEnvelope(
    await apiFetch('/admin/landing/stats', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  );
}

export async function createAdminLandingFeaturedItem(payload) {
  return toEnvelope(
    await apiFetch('/admin/landing/featured-items', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

export async function updateAdminLandingFeaturedItem(id, payload) {
  return toEnvelope(
    await apiFetch(`/admin/landing/featured-items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  );
}

export async function deleteAdminLandingFeaturedItem(id) {
  return toEnvelope(
    await apiFetch(`/admin/landing/featured-items/${id}`, {
      method: 'DELETE'
    })
  );
}

export async function createAdminLandingContentBlock(payload) {
  return toEnvelope(
    await apiFetch('/admin/landing/content-blocks', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

export async function updateAdminLandingContentBlock(id, payload) {
  return toEnvelope(
    await apiFetch(`/admin/landing/content-blocks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  );
}

export async function deleteAdminLandingContentBlock(id) {
  return toEnvelope(
    await apiFetch(`/admin/landing/content-blocks/${id}`, {
      method: 'DELETE'
    })
  );
}

export async function createAdminLandingTestimonial(payload) {
  return toEnvelope(
    await apiFetch('/admin/landing/testimonials', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

export async function updateAdminLandingTestimonial(id, payload) {
  return toEnvelope(
    await apiFetch(`/admin/landing/testimonials/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  );
}

export async function deleteAdminLandingTestimonial(id) {
  return toEnvelope(
    await apiFetch(`/admin/landing/testimonials/${id}`, {
      method: 'DELETE'
    })
  );
}

export async function createAdminLandingCountry(payload) {
  return toEnvelope(
    await apiFetch('/admin/landing/countries', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

export async function updateAdminLandingCountry(id, payload) {
  return toEnvelope(
    await apiFetch(`/admin/landing/countries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  );
}

export async function deleteAdminLandingCountry(id) {
  return toEnvelope(
    await apiFetch(`/admin/landing/countries/${id}`, {
      method: 'DELETE'
    })
  );
}

export async function getAdminSupportThreads(params = {}) {
  return toEnvelope(await apiFetch(`/admin/support/threads${withQuery(params)}`));
}

export async function getAdminSupportThread(threadId) {
  return toEnvelope(await apiFetch(`/admin/support/threads/${threadId}`));
}

export async function sendAdminSupportMessage(threadId, payload) {
  return toEnvelope(
    await apiFetch(`/admin/support/threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

export async function updateAdminSupportStatus(threadId, status) {
  return toEnvelope(
    await apiFetch(`/admin/support/threads/${threadId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
  );
}

export async function getAdminBtctStaking() {
  return toEnvelope(await apiFetch('/admin/wallet/staking'));
}

export async function runAdminBtctStakingPayouts(payload = {}) {
  return toEnvelope(
    await apiFetch('/admin/wallet/staking/payouts/run', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}
