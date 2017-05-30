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

const needsWarning = {
  memory: true,
  cpu_one: true,
  cpu_five: true,
  cpu_fifteen: true,
  inodes: true,
  space: true
};

const needsNormal = {
  memory: false,
  cpu_one: false,
  cpu_five: false,
  cpu_fifteen: false,
  inodes: false,
  space: false
};

const needsReport = (reportType, warningType, currentValue, thresholdValue) => {
  if (warningType === 'warning') {
    if (currentValue > thresholdValue) {
      if (needsWarning[reportType]) {
        needsWarning[reportType] = false;
        needsNormal[reportType] = true;
        return true;
      }
    }
    return false;
  }
  if (warningType === 'normal') {
    if (currentValue < thresholdValue) {
      if (needsNormal[reportType]) {
        needsNormal[reportType] = false;
        needsWarning[reportType] = true;
        return true;
      }
    }
    return false;
  }
};

const onMemTimer = (options) => {
  stats.getMemory((err, memData) => {
    if (err) {
      log(err);
    }
    const freeMb = memData.free / 1048576;
    const totalMb = memData.total / 1048576;
    const memPercent = 100 - ((freeMb / totalMb).toFixed(2) * 100);
    if (options.verbose) {
      log(['ops', 'memory', 'info'], `Using ${memPercent}% of memory`);
    }
    if (needsReport('memory', 'warning', memPercent, options.memory)) {
      log(['ops', 'memory', 'warning', 'threshold'], `Using ${memPercent}% of memory, exceeds threshold of ${options.memory}%`);
    }
    if (needsReport('memory', 'normal', memPercent, options.memory)) {
      log(['ops', 'memory', 'normal'], `Memory usage of ${memPercent}% has dropped below the redline of ${options.memory}% and is now normal`);
    }
  });
};

const onDiskTimer = (options) => {
  stats.getDisk(options, (err, result) => {
    if (err) {
      log(err);
    }
    const freeMb = result.free / 1048576;
    const totalMb = result.total / 1048576;
    const spacePercent = 100 - ((freeMb / totalMb).toFixed(2) * 100);
    if (options.verbose) {
      log(['ops', 'disk', 'info'], `Using ${spacePercent}% of available disk space`);
    }
    if (needsReport('space', 'warning', spacePercent, options.space)) {
      log(['ops', 'disk', 'warning', 'threshold'], `Using ${spacePercent}% of disk space, exceeds threshold of ${options.space}%`);
    }
    if (needsReport('space', 'normal', spacePercent, options.space)) {
      log(['ops', 'disk', 'normal'], `Memory usage of ${spacePercent}% has dropped below the redline of ${options.space}% and is now normal`);
    }
  });
};

const onCPUTimer = (options) => {
  const allAvgs = stats.getCPU();
  const oneMinLoad = allAvgs[0];
  const fiveMinLoad = allAvgs[1];
  const fifteenMinLoad = allAvgs[2];

  if (options.verbose) {
    log(['ops', 'cpu', 'averages'], {
      '1 minute': oneMinLoad.toFixed(3),
      '5 minute': fiveMinLoad.toFixed(3),
      '15 minute': fifteenMinLoad.toFixed(3)
    });
  }
  // one minute cpu warnings:
  if (options['cpu-one-minute'] && needsReport('cpu_one', 'warning', oneMinLoad, options['cpu-one-minute'])) {
    log(['ops', 'cpu', 'warning', 'threshold'], `Average 1-min CPU load of ${oneMinLoad.toFixed(3)}, exceeds threshold of ${options['cpu-one-minute']}`);
  }
  if (needsReport('cpu_one', 'normal', oneMinLoad, options['cpu-one-minute'])) {
    log(['ops', 'cpu', 'normal', 'threshold'], `Average 1-min CPU load of ${oneMinLoad.toFixed(3)} has dropped below threshold of ${options['cpu-one-minute']}`);
  }
  // five minute cpu warnings:
  if (options['cpu-five-minute'] && needsReport('cpu_five', 'warning', fiveMinLoad, options['cpu-five-minute'])) {
    log(['ops', 'cpu', 'warning', 'threshold'], `Average 5-min CPU load of ${fiveMinLoad.toFixed(3)}, exceeds threshold of ${options['cpu-five-minute']}`);
  }
  if (needsReport('cpu_five', 'normal', fiveMinLoad, options['cpu-five-minute'])) {
    log(['ops', 'cpu', 'normal', 'threshold'], `Average 5-min CPU load of ${fiveMinLoad.toFixed(3)} has dropped below threshold of ${options['cpu-five-minute']}`);
  }
  // fifteen minute cpu warnings:
  if (options['cpu-fifteen-minute'] && needsReport('cpu_fifteen', 'warning', fifteenMinLoad, options['cpu-fifteen-minute'])) {
    log(['ops', 'cpu', 'warning', 'threshold'], `Average 15-min CPU load of ${fifteenMinLoad.toFixed(3)}, exceeds threshold of ${options['cpu-fifteen-minute']}`);
  }
  if (needsReport('cpu_fifteen', 'normal', fifteenMinLoad, options['cpu-fifteen-minute'])) {
    log(['ops', 'cpu', 'normal', 'threshold'], `Average 15-min CPU load of ${fifteenMinLoad.toFixed(3)} has dropped below threshold of ${options['cpu-fifteen-minute']}`);
  }
};

const onInodeTimer = (options) => {
  stats.getInodes(options.partition, (err, partitionName, inodeUseage) => {
    if (err) {
      log(['ops', 'inodes', 'error'], err);
    }
    if (options.verbose) {
      log(['ops', 'inodes', 'info'], `Using ${inodeUseage}% of inodes on partition ${partitionName}`);
    }
    if (needsReport('inodes', 'warning', inodeUseage, options.inode)) {
      log(['ops', 'inodes', 'warning'], `Using ${inodeUseage.toFixed(3)} of filesystem inodes, exceeds threshold of ${options.inode}`);
    }
    if (needsReport('inodes', 'normal', inodeUseage, options.inode)) {
      log(['ops', 'inodes', 'normal'], `Inode usage of ${inodeUseage}% has dropped below the redline of ${options.inode}% and is now normal`);
    }
  });
};

module.exports = (options) => {
  options.verbose = options.verbose !== false && options.verbose !== 'false';
  log(['ops', 'info'], {
    '1-minute CPU threshold': options['cpu-one-minute'],
    '5-minute CPU threshold': options['cpu-five-minute'],
    '15-minute CPU threshold': options['cpu-fifteen-minute'],
    memoryThreshold: options.memory,
    spaceThreshold: options.space,
    reportInterval: options.interval,
    inodeThreshold: options.inode,
    verbose: options.verbose
  });
  const runTimer = () => {
    setTimeout(() => {
      onMemTimer(options);
      onCPUTimer(options);
      onDiskTimer(options);
      onInodeTimer(options);
      runTimer();
    }, options.interval * 1000);
  };
  runTimer();
};
