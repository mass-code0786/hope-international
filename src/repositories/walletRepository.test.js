const test = require('node:test');
const assert = require('node:assert/strict');
const walletRepository = require('./walletRepository');

test('income history includes Hope Millionaire wallet credits and metadata', async () => {
  let capturedSql = '';
  let capturedValues = [];
  const client = {
    async query(sql, values) {
      capturedSql = sql;
      capturedValues = values;
      return { rows: [] };
    }
  };

  await walletRepository.listIncomeTransactions(client, 'user-id', 120);

  assert.ok(capturedValues[1].includes('hope_millionaire_member_income'));
  assert.ok(capturedValues[1].includes('hope_millionaire_upline_income'));
  assert.match(capturedSql, /LEFT JOIN hope_millionaire_transactions hmt ON hmt\.wallet_transaction_id = wt\.id/);
  assert.match(capturedSql, /hmt\.package_amount/);
  assert.match(capturedSql, /hmt\.upline_level/);
  assert.match(capturedSql, /millionaire_source\.username/);
  assert.match(capturedSql, /THEN 'approved'/);
});
