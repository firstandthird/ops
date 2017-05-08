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
    if (spacePercent > options.space) {
      log(['ops', 'disc', 'warning', 'threshold'], `Using ${spacePercent}% of disc space, exceeds threshold of ${options.space}%`);
    }
  });
};

const onCPUTimer = (options) => {
  const oneMinLoad = stats.getCPU();
  if (oneMinLoad > options.cpu) {
    log(['ops', 'cpu', 'warning', 'threshold'], `Average 1-min CPU load of ${oneMinLoad}%, exceeds threshold of ${options.cpu}%`);
  }
};

module.exports = (options) => {
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
