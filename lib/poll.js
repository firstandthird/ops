'use strict';
const stats = require('./stats');
const Logr = require('logr');
const logrFlat = require('logr-flat');
const log = Logr.createLogger({
  type: 'flat',
  reporters: {
    flat: {
      reporter: logrFlat,
      options: {
        timestamp: false,
        appColor: true
      }
    }
  }
});

const onMemTimer = (options) => {
  const memData = stats.getMemory();
  const freeMb = memData.free / 1048576;
  const totalMb = memData.total / 1048576;
  const memPercent = 100 - ((freeMb / totalMb).toFixed(2) * 100);
  if (options.verbose) {
    log(['ops', 'memory', 'info'], `Using ${memPercent}% of memory`);
  }
  if (memPercent > options.memory) {
    log(['ops', 'memory', 'warning', 'threshold'], `Using ${memPercent}% of memory, exceeds threshold of ${options.memory}%`);
  }
};

const onDiscTimer = (options) => {
  stats.getDisk(options, (err, result) => {
    if (err) {
      log(err);
    }
    const freeMb = result.free / 1048576;
    const totalMb = result.total / 1048576;
    const spacePercent = 100 - ((freeMb / totalMb).toFixed(2) * 100);
    if (options.verbose) {
      log(['ops', 'disk', 'info'], `Using ${spacePercent}% of available disc space`);
    }
    if (spacePercent > options.space) {
      log(['ops', 'disk', 'warning', 'threshold'], `Using ${spacePercent}% of disk space, exceeds threshold of ${options.space}%`);
    }
  });
};

const onCPUTimer = (options) => {
  const allAvgs = stats.getCPU();
  const oneMinLoad = allAvgs[0];
  if (options.verbose) {
    log(['ops', 'cpu', 'averages'], {
      '1 minute': oneMinLoad.toFixed(3),
      '5 minute': allAvgs[1].toFixed(3),
      '15 minute': allAvgs[2].toFixed(3)
    });
  }
  if (oneMinLoad > options.cpu) {
    log(['ops', 'cpu', 'warning', 'threshold'], `Average 1-min CPU load of ${oneMinLoad.toFixed(3)}, exceeds threshold of ${options.cpu}`);
  }
};

module.exports = (options) => {
  options.verbose = options.verbose !== false && options.verbose !== 'false';
  log(['ops', 'info'], {
    'cpu threshold': options.cpu,
    'memory threshold': options.memory,
    'space threshold': options.space,
    'report interval': options.interval
  });
  const runTimer = () => {
    setTimeout(() => {
      onMemTimer(options);
      onCPUTimer(options);
      onDiscTimer(options);
      runTimer();
    }, options.interval * 1000);
  };
  runTimer();
};
