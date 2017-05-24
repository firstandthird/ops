'use strict';
const tap = require('tap');
const stats = require('../lib/stats.js');

// on some machines the 'free' command returns:
// total        used        free      shared  buff/cache   available
tap.test('can parse new-style "free" output', (t) => {
  const output = stats.parseMemory(`              total        used        free      shared  buff/cache   available
Mem:        2046568      433160       76788       23028     1536620     1530216
Swap:             0           0           0        `);
  t.equal(typeof output, 'object');
  t.equal(output.free, 1613408);
  t.end();
});

// on other machines the 'free' command returns:
// total       used       free     shared    buffers     cached
tap.test('can parse alternate "free" output', (t) => {
  const output = stats.parseMemory(`             total       used       free     shared    buffers     cached
Mem:       4046848    2571404    1475444       3860     260292     804960
-/+ buffers/cache:    1506152    2540696
Swap:            0          0          0              `);
  t.equal(typeof output, 'object');
  t.equal(output.free, 2540696);
  t.end();
});
