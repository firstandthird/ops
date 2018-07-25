'use strict';
const tap = require('tap');
const stats = require('../lib/stats.js');
const poll = require('../lib/poll.js');
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

tap.test('logs when cpu stats are exceeded / restored', (t) => {
  const thresholds = {
    cpu_one_minute: false,
    cpu_five_minute: false,
    cpu_fifteen_minute: false,
  };
  const options = {
    'cpu-one-minute': 0.4,
    'cpu-five-minute': 0.4,
    'cpu-fifteen-minute': 0.4,
  };
  let results = [];
  let logr = (tags, msg) => {
    results.push(msg);
  };
  poll.logCPU(options, [0.5, 0.5, 0.5], logr, thresholds);
  t.notEqual(results[0].indexOf('exceeds'), -1, 'logs one minute cpu average exceeds');
  t.notEqual(results[1].indexOf('exceeds'), -1, 'logs five minute cpu average exceeds');
  t.notEqual(results[2].indexOf('exceeds'), -1, 'logs fifteen minute cpu average exceeds');
  t.equal(thresholds.cpu_one_minute, true, 'tracks that one minute cpu threshold exceeded');
  t.equal(thresholds.cpu_five_minute, true, 'tracks that five minute cpu threshold exceeded');
  t.equal(thresholds.cpu_fifteen_minute, true, 'tracks that fifteen minute cpu threshold exceeded');
  results = [];
  logr = (tags, msg) => {
    results.push(msg);
  };
  poll.logCPU(options, [0.3, 0.3, 0.3], logr, thresholds);
  t.notEqual(results[0].indexOf('dropped'), -1, 'logs one minute cpu average restored');
  t.notEqual(results[1].indexOf('dropped'), -1, 'logs five minute cpu average restored');
  t.notEqual(results[2].indexOf('dropped'), -1, 'logs fifteen minute cpu average restored');
  t.equal(thresholds.cpu_one_minute, false, 'tracks that one minute cpu threshold restored');
  t.equal(thresholds.cpu_five_minute, false, 'tracks that five minute cpu threshold restored');
  t.equal(thresholds.cpu_fifteen_minute, false, 'tracks that fifteen minute cpu threshold restored');
  t.end();
});

tap.test('exports polling methods', (t) => {
  const ops = require('../index.js');
  t.equal(typeof ops.stats.parseMemory, 'function');
  t.equal(typeof ops.stats.getMemory, 'function');
  t.equal(typeof ops.stats.getCPU, 'function');
  t.equal(typeof ops.stats.getDisk, 'function');
  t.equal(typeof ops.stats.getInodes, 'function');
  t.equal(typeof ops.poll.logCPU, 'function');
  t.equal(typeof ops.poll.logMemory, 'function');
  t.equal(typeof ops.poll.logDisk, 'function');
  t.equal(typeof ops.poll.start, 'function');
  t.equal(typeof ops.poll.onMemTimer, 'function');
  t.equal(typeof ops.poll.onDiskTimer, 'function');
  t.equal(typeof ops.poll.onCPUTimer, 'function');
  t.equal(typeof ops.poll.onInodeTimer, 'function');
  t.end();
});
