'use strict';
const stats = require('./stats');
const Logr = require('logr');
const logrFlat = require('logr-flat');

const thresholdExceeded = {
  memory: false,
  cpu_one: false,
  cpu_five: false,
  cpu_fifteen: false,
  inodes: false,
  space: false
};

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
    if (memPercent > options.memory) {
      if (!thresholdExceeded.memory) {
        log(['ops', 'memory', 'warning', 'threshold'], `Using ${memPercent}% of memory, exceeds threshold of ${options.memory}%`);
        thresholdExceeded.memory = true;
      }
    }
    if (thresholdExceeded.memory && memPercent < options.memory) {
      log(['ops', 'memory', 'normal'], `Memory usage of ${memPercent}% has dropped below the redline of ${options.memory}% and is now normal`);
      thresholdExceeded.memory = false;
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
    if (!thresholdExceeded.space && spacePercent > options.space) {
      log(['ops', 'disk', 'warning', 'threshold'], `Using ${spacePercent}% of disk space, exceeds threshold of ${options.space}%`);
      thresholdExceeded.space = true;
    }
    if (thresholdExceeded.space && spacePercent < options.space) {
      log(['ops', 'disk', 'normal'], `Memory usage of ${spacePercent}% has dropped below the redline of ${options.space}% and is now normal`);
      thresholdExceeded.space = false;
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
  if (options['cpu-one-minute'] > 0 && oneMinLoad > options['cpu-one-minute'] && !thresholdExceeded.cpu_one) {
    log(['ops', 'cpu', 'warning', 'threshold'], `Average 1-min CPU load of ${oneMinLoad.toFixed(3)}, exceeds threshold of ${options['cpu-one-minute']}`);
    thresholdExceeded.cpu_one = true;
  } else if (thresholdExceeded.cpu_one) {
    log(['ops', 'cpu', 'normal'], `Average 1-min CPU load of ${oneMinLoad.toFixed(3)} has dropped below the threshold of ${options['cpu-one-minute']}`);
    thresholdExceeded.cpu_one = false;
  }
  if (options['cpu-five-minute'] > 0 && fiveMinLoad > options['cpu-five-minute'] && !thresholdExceeded.cpu_five) {
    log(['ops', 'cpu', 'warning', 'threshold'], `Average 5-min CPU load of ${fiveMinLoad.toFixed(3)}, exceeds threshold of ${options['cpu-five-minute']}`);
    thresholdExceeded.cpu_five = true;
  } else if (thresholdExceeded.cpu_five) {
    log(['ops', 'cpu', 'normal'], `Average 5-min CPU load of ${fiveMinLoad.toFixed(3)} has dropped below the threshold of ${options['cpu-five-minute']}`);
    thresholdExceeded.cpu_five = false;
  }
  if (options['cpu-fifteen-minute'] > 0 && fifteenMinLoad > options['cpu-fifteen-minute'] && !thresholdExceeded.cpu_fifteen) {
    log(['ops', 'cpu', 'warning', 'threshold'], `Average 15-min CPU load of ${fifteenMinLoad.toFixed(3)}, exceeds threshold of ${options['cpu-fifteen-minute']}`);
    thresholdExceeded.cpu_fifteen = true;
  } else if (thresholdExceeded.cpu_fifteen) {
    log(['ops', 'cpu', 'normal'], `Average 15-min CPU load of ${fifteenMinLoad.toFixed(3)} has dropped below the threshold of ${options['cpu-fifteen-minute']}`);
    thresholdExceeded.cpu_fifteen = false;
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
    if (!thresholdExceeded.inode && options.inode > 0 && inodeUseage > options.inode) {
      log(['ops', 'inodes', 'warning'], `Using ${inodeUseage.toFixed(3)} of filesystem inodes, exceeds threshold of ${options.inode}`);
      thresholdExceeded.inode = true;
    }
    if (thresholdExceeded.inode && inodeUseage < options.inode) {
      log(['ops', 'inodes', 'normal'], `Inode usage of ${inodeUseage}% has dropped below the redline of ${options.inode}% and is now normal`);
      thresholdExceeded.inode = false;
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
