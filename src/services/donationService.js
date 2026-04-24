const { withTransaction } = require('../db/pool');
const { ApiError } = require('../utils/ApiError');
const { normalizePagination, buildListPagination } = require('../utils/pagination');
const donationRepository = require('../repositories/donationRepository');
const walletService = require('./walletService');

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

async function mapDonation(row) {
  if (!row) return null;
  return {
    ...row,
    amount: toMoney(row.amount)
  };
}

async function createDonation(userId, payload) {
  const amount = toMoney(payload.amount);
  if (!(amount > 0)) {
    throw new ApiError(400, 'Donation amount must be greater than zero');
  }

  return withTransaction(async (client) => {
    const donation = await donationRepository.createDonation(client, {
      userId,
      amount,
      purpose: payload.purpose,
      note: payload.note || null,
      status: 'completed'
    });

    try {
      await walletService.debit(client, userId, amount, 'donation', donation.id, {
        donationId: donation.id,
        purpose: payload.purpose,
        note: payload.note || null
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 400 && String(error.message || '').toLowerCase().includes('insufficient wallet balance')) {
        throw new ApiError(400, 'Insufficient wallet balance.');
      }
      throw error;
    }

    const hydrated = await donationRepository.getDonationById(client, donation.id);
    return mapDonation(hydrated);
  });
}

async function listUserDonations(userId, paginationInput = {}) {
  const pagination = normalizePagination({ ...paginationInput, limit: paginationInput.limit || 20, maxLimit: 50 });
  const result = await donationRepository.listUserDonations(null, userId, pagination);

  return {
    items: await Promise.all(result.items.map(mapDonation)),
    pagination: buildListPagination({
      page: pagination.page,
      limit: pagination.limit,
      total: result.total
    })
  };
}

module.exports = {
  createDonation,
  listUserDonations,
  mapDonation
};
