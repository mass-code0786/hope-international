const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateWithdrawalAmounts } = require('./walletService');

test('withdrawal fee distribution uses a 10/10/80 split', () => {
  assert.deepEqual(calculateWithdrawalAmounts(100), {
    withdrawalAmount: 100,
    adminFee: 10,
    auctionBonusCredit: 10,
    netPaidAmount: 80
  });
  assert.deepEqual(calculateWithdrawalAmounts(500), {
    withdrawalAmount: 500,
    adminFee: 50,
    auctionBonusCredit: 50,
    netPaidAmount: 400
  });
  assert.deepEqual(calculateWithdrawalAmounts(1000), {
    withdrawalAmount: 1000,
    adminFee: 100,
    auctionBonusCredit: 100,
    netPaidAmount: 800
  });
});

test('withdrawal fee distribution rounds once and preserves the gross amount', () => {
  const result = calculateWithdrawalAmounts(123.456);

  assert.deepEqual(result, {
    withdrawalAmount: 123.46,
    adminFee: 12.35,
    auctionBonusCredit: 12.35,
    netPaidAmount: 98.76
  });
  assert.equal(
    Number((result.adminFee + result.auctionBonusCredit + result.netPaidAmount).toFixed(2)),
    result.withdrawalAmount
  );
});
