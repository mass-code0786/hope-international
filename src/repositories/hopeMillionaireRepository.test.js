const test = require('node:test');
const assert = require('node:assert/strict');
const hopeMillionaireRepository = require('./hopeMillionaireRepository');

test('Hope Millionaire selects the first open parent from the package global FIFO queue', async () => {
  let capturedSql = '';
  let capturedValues = [];
  const expectedParent = { id: 'parent-entry', filled_slots: 1 };
  const client = {
    async query(sql, values) {
      capturedSql = sql;
      capturedValues = values;
      return { rows: [expectedParent] };
    }
  };

  const parent = await hopeMillionaireRepository.findOpenParent(client, 10, 'new-entry');

  assert.equal(parent, expectedParent);
  assert.deepEqual(capturedValues, [10, 'new-entry']);
  assert.match(capturedSql, /WHERE e\.package_amount = \$1/);
  assert.match(capturedSql, /e\.status = 'open'/);
  assert.match(capturedSql, /e\.filled_slots < 3/);
  assert.match(capturedSql, /ORDER BY e\.queue_position ASC/);
  assert.doesNotMatch(capturedSql, /sponsor/i);
  assert.doesNotMatch(capturedSql, /package_states/i);
  assert.doesNotMatch(capturedSql, /users referral/i);
});
