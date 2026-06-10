const test = require('node:test');
const assert = require('node:assert/strict');
const { PACKAGE_CONFIG, PACKAGE_AMOUNTS, AUTOMATIC_REENTRY_COUNT } = require('./hopeMillionaireService');

test('Hope Millionaire packages use the required cycle distribution', () => {
  assert.deepEqual(PACKAGE_AMOUNTS, [3, 10, 25]);
  assert.equal(AUTOMATIC_REENTRY_COUNT, 2);

  const expected = {
    3: { collection: 9, reentryAmount: 6, memberIncome: 2, uplineTotal: 1, uplineIncome: 0.25, incomeCap: 9 },
    10: { collection: 30, reentryAmount: 20, memberIncome: 6, uplineTotal: 4, uplineIncome: 1, incomeCap: 30 },
    25: { collection: 75, reentryAmount: 50, memberIncome: 17, uplineTotal: 8, uplineIncome: 2, incomeCap: 75 }
  };

  for (const amount of PACKAGE_AMOUNTS) {
    const config = PACKAGE_CONFIG[amount];
    assert.equal(config.collection, expected[amount].collection);
    assert.equal(config.reentryAmount, expected[amount].reentryAmount);
    assert.equal(config.memberIncome, expected[amount].memberIncome);
    assert.equal(config.uplineTotal, expected[amount].uplineTotal);
    assert.equal(config.uplineIncome, expected[amount].uplineIncome);
    assert.equal(config.incomeCap, expected[amount].incomeCap);
    assert.equal(config.collection, amount * 3);
    assert.equal(config.reentryAmount, amount * 2);
    assert.equal(config.uplineIncome * 4, config.uplineTotal);
    assert.equal(config.reentryAmount + config.memberIncome + config.uplineTotal, config.collection);
  }
});
