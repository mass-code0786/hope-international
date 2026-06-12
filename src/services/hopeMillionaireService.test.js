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

test('a 1x3 FIFO queue produces breadth-first, left-to-right placement', () => {
  const entries = 'ABCDEFGHIJ'.split('');
  const placements = [];
  const openParents = [{ id: entries[0], filledSlots: 0 }];

  for (const entryId of entries.slice(1)) {
    const parent = openParents[0];
    parent.filledSlots += 1;
    placements.push({
      entryId,
      parentEntryId: parent.id,
      slotPosition: parent.filledSlots
    });
    openParents.push({ id: entryId, filledSlots: 0 });
    if (parent.filledSlots === 3) openParents.shift();
  }

  assert.deepEqual(placements, [
    { entryId: 'B', parentEntryId: 'A', slotPosition: 1 },
    { entryId: 'C', parentEntryId: 'A', slotPosition: 2 },
    { entryId: 'D', parentEntryId: 'A', slotPosition: 3 },
    { entryId: 'E', parentEntryId: 'B', slotPosition: 1 },
    { entryId: 'F', parentEntryId: 'B', slotPosition: 2 },
    { entryId: 'G', parentEntryId: 'B', slotPosition: 3 },
    { entryId: 'H', parentEntryId: 'C', slotPosition: 1 },
    { entryId: 'I', parentEntryId: 'C', slotPosition: 2 },
    { entryId: 'J', parentEntryId: 'C', slotPosition: 3 }
  ]);
});
