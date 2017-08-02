'use strict';
const stats = require('./stats');
const Logr = require('logr');
const logrFlat = require('logr-flat');
const logrSlack = require('logr-slack');

let log;

const thresholdExceeded = {
  cpu_one_minute: false,
  cpu_five_minutes: false,
  cpu_fifteen_minutes: false,
  memory: false,
  inode: false,
  space: false
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
    if (memPercent > options.memory) {
      log(['ops', 'memory', 'warning', 'threshold'], `Using ${memPercent}% of memory, exceeds threshold of ${options.memory}%`);
      thresholdExceeded.memory = true;
    }
    if (memPercent < options.memory && thresholdExceeded.memory) {
      log(['ops', 'memory', 'restored', 'threshold'], `Memory use of ${memPercent}% has dropped below threshold of ${options.memory}%`);
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
    if (spacePercent > options.space) {
      log(['ops', 'disk', 'warning', 'threshold'], `Using ${spacePercent}% of disk space, exceeds threshold of ${options.space}%`);
      thresholdExceeded.space = true;
    }
    if (spacePercent < options.space && thresholdExceeded.space) {
      log(['ops', 'disk', 'restored', 'threshold'], `Disk use of ${spacePercent}% has dropped below threshold of ${options.space}%`);
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
  if (options['cpu-one-minute'] > 0 && oneMinLoad > options['cpu-one-minute']) {
    log(['ops', 'cpu', 'warning', 'threshold'], `Average 1-min CPU load of ${oneMinLoad.toFixed(3)}, exceeds threshold of ${options['cpu-one-minute']}`);
    thresholdExceeded.cpu_one_minute = true;
  }
  if (options['cpu-five-minute'] > 0 && fiveMinLoad > options['cpu-five-minute']) {
    log(['ops', 'cpu', 'warning', 'threshold'], `Average 5-min CPU load of ${fiveMinLoad.toFixed(3)}, exceeds threshold of ${options['cpu-five-minute']}`);
    thresholdExceeded.cpu_five_minutes = true;
  }
  if (options['cpu-fifteen-minute'] > 0 && fifteenMinLoad > options['cpu-fifteen-minute']) {
    log(['ops', 'cpu', 'warning', 'threshold'], `Average 15-min CPU load of ${fifteenMinLoad.toFixed(3)}, exceeds threshold of ${options['cpu-fifteen-minute']}`);
    thresholdExceeded.cpu_fifteen_minutes = true;
  }
  if (options['cpu-one-minute'] > 0 && oneMinLoad < options['cpu-one-minute'] && thresholdExceeded.cpu_one_minute) {
    log(['ops', 'cpu', 'restored', 'threshold'], `Average 1-min CPU load of ${oneMinLoad.toFixed(3)}, has dropped back to normal range`);
    thresholdExceeded.cpu_one_minute = false;
  }
  if (options['cpu-fifteen-minutes'] > 0 && oneMinLoad < options['cpu-fifteen-minutes'] && thresholdExceeded.cpu_fifteen_minutes) {
    log(['ops', 'cpu', 'restored', 'threshold'], `Average 15-min CPU load of ${fifteenMinLoad.toFixed(3)}, has dropped back to normal range`);
    thresholdExceeded.cpu_fifteen_minutes = false;
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
    if (options.inode > 0 && inodeUseage > options.inode) {
      log(['ops', 'inodes', 'warning'], `Using ${inodeUseage.toFixed(3)} of filesystem inodes, exceeds threshold of ${options.inode}`);
      thresholdExceeded.inode = true;
    }
    if (inodeUseage < options.inode && thresholdExceeded.inode) {
      log(['ops', 'inodes', 'restored', 'threshold'], `Inode use of ${inodeUseage}% has dropped below threshold of ${options.inode}%`);
      thresholdExceeded.inode = false;
    }
  });
};

module.exports = (options) => {
  options.verbose = options.verbose !== false && options.verbose !== 'false';
  const reporters = {
    flat: {
      reporter: logrFlat,
      options: {
        timestamp: false,
        appColor: true,
        tagColors: {
          warning: 'bgYellow',
          restored: 'bgGreen'
        }
      }
    }
  };
  if (options.slackHook) {
    reporters.slack = {
      reporter: logrSlack,
      options: {
        slackHook: options.slackHook,
        filter: ['warning', 'restored'],
        username: 'Ops',
        hideTags: true,
        tagColors: {
          warning: 'warning',
          restored: 'good'
        },
        throttle: options.slackReportRate * 1000,
        throttleBasedOnTags: true,
      }
    };
  }
  const logObj = Logr.createLogger({ reporters });
  log = (tags, message) => {
    if (typeof message === 'string' && options.name) {
      message = `${message} on ${options.name}`;
    }
    logObj(tags, message);
  };
  log(['ops', 'info'], {
    '1-minute CPU threshold': options['cpu-one-minute'],
    '5-minute CPU threshold': options['cpu-five-minute'],
    '15-minute CPU threshold': options['cpu-fifteen-minute'],
    memoryThreshold: options.memory,
    spaceThreshold: options.space,
    slackReportRate: options.slackReportRate,
    logInterval: options.interval,
    inodeThreshold: options.inode,
    verbose: options.verbose,
    name: options.name
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
