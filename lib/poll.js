'use strict';
const stats = require('./stats');
const Logr = require('logr');
const logrFlat = require('logr-flat');
const logrSlack = require('logr-slack');
const os = require('os');

let log;

const thresholdExceeded = {
  cpu_one_minute: false,
  cpu_five_minute: false,
  cpu_fifteen_minute: false,
  memory: false,
  inode: false,
  space: false
};

// message logging methods for reporting metric stats:
const logCPU = (options, cpuLoads, logr, thresholds) => {
  const oneMinLoad = cpuLoads[0];
  const fiveMinLoad = cpuLoads[1];
  const fifteenMinLoad = cpuLoads[2];
  if (options.verbose) {
    log(['cpu', 'averages'], {
      '1 minute': oneMinLoad.toFixed(3),
      '5 minute': fiveMinLoad.toFixed(3),
      '15 minute': fifteenMinLoad.toFixed(3)
    });
  }
  if (options['cpu-one-minute'] > 0 && oneMinLoad > options['cpu-one-minute']) {
    logr(['cpu', 'warning', 'threshold'], `Average 1-min CPU load of ${oneMinLoad.toFixed(3)}, exceeds threshold of ${options['cpu-one-minute']}`);
    thresholds.cpu_one_minute = true;
  }
  if (options['cpu-five-minute'] > 0 && fiveMinLoad > options['cpu-five-minute']) {
    logr(['cpu', 'warning', 'threshold'], `Average 5-min CPU load of ${fiveMinLoad.toFixed(3)}, exceeds threshold of ${options['cpu-five-minute']}`);
    thresholds.cpu_five_minute = true;
  }
  if (options['cpu-fifteen-minute'] > 0 && fifteenMinLoad > options['cpu-fifteen-minute']) {
    logr(['cpu', 'warning', 'threshold'], `Average 15-min CPU load of ${fifteenMinLoad.toFixed(3)}, exceeds threshold of ${options['cpu-fifteen-minute']}`);
    thresholds.cpu_fifteen_minute = true;
  }
  if (options['cpu-one-minute'] > 0 && oneMinLoad < options['cpu-one-minute'] && thresholds.cpu_one_minute) {
    logr(['cpu', 'restored', 'threshold'], `Average 1-min CPU load of ${oneMinLoad.toFixed(3)}, has dropped back to normal range`);
    thresholds.cpu_one_minute = false;
  }
  if (options['cpu-five-minute'] > 0 && fiveMinLoad < options['cpu-five-minute'] && thresholds.cpu_five_minute) {
    logr(['cpu', 'restored', 'threshold'], `Average 5-min CPU load of ${fiveMinLoad.toFixed(3)}, has dropped back to normal range`);
    thresholds.cpu_five_minute = false;
  }
  if (options['cpu-fifteen-minute'] > 0 && fifteenMinLoad < options['cpu-fifteen-minute'] && thresholds.cpu_fifteen_minute) {
    logr(['cpu', 'restored', 'threshold'], `Average 15-min CPU load of ${fifteenMinLoad.toFixed(3)}, has dropped back to normal range`);
    thresholds.cpu_fifteen_minute = false;
  }
};

// handle logging memory messages:
const logMemory = (options, memPercent, logr, thresholds) => {
  if (options.verbose) {
    logr(['memory', 'info'], `Using ${memPercent}% of memory`);
  }
  if (memPercent > options.memory) {
    logr(['memory', 'warning', 'threshold'], `Using ${memPercent}% of memory, exceeds threshold of ${options.memory}%`);
    thresholds.memory = true;
  }
  if (memPercent < options.memory && thresholds.memory) {
    logr(['memory', 'restored', 'threshold'], `Memory use of ${memPercent}% has dropped below threshold of ${options.memory}%`);
    thresholds.memory = false;
  }
};

const logDisk = (options, spacePercent, logr, thresholds) => {
  if (options.verbose) {
    logr(['disk', 'info'], `Using ${spacePercent}% of available disk space`);
  }
  if (spacePercent > options.space) {
    logr(['disk', 'warning', 'threshold'], `Using ${spacePercent}% of disk space, exceeds threshold of ${options.space}%`);
    thresholds.space = true;
  }
  if (spacePercent < options.space && thresholds.space) {
    logr(['disk', 'restored', 'threshold'], `Disk use of ${spacePercent}% has dropped below threshold of ${options.space}%`);
    thresholds.space = false;
  }
};


// event handlers for getting metric loads:
const onMemTimer = (options) => {
  stats.getMemory((err, memData) => {
    if (err) {
      log(err);
    }
    const freeMb = memData.free / 1048576;
    const totalMb = memData.total / 1048576;
    const memPercent = 100 - ((freeMb / totalMb).toFixed(2) * 100);
    logMemory(options, memPercent, log, thresholdExceeded);
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
    logDisk(options, spacePercent, log, thresholdExceeded);
  });
};

const onCPUTimer = (options) => {
  const allAvgs = stats.getCPU();
  logCPU(options, allAvgs, log, thresholdExceeded);
};

const onInodeTimer = (options) => {
  stats.getInodes(options.partition, (err, partitionName, inodeUseage) => {
    if (err) {
      log(['inodes', 'error'], err);
    }
    if (options.verbose) {
      log(['inodes', 'info'], `Using ${inodeUseage}% of inodes on partition ${partitionName}`);
    }
    if (options.inode > 0 && inodeUseage > options.inode) {
      log(['inodes', 'warning'], `Using ${inodeUseage.toFixed(3)} of filesystem inodes, exceeds threshold of ${options.inode}`);
      thresholdExceeded.inode = true;
    }
    if (inodeUseage < options.inode && thresholdExceeded.inode) {
      log(['inodes', 'restored', 'threshold'], `Inode use of ${inodeUseage}% has dropped below threshold of ${options.inode}%`);
      thresholdExceeded.inode = false;
    }
  });
};

module.exports.start = (options) => {
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
  const hostname = os.hostname();
  const logObj = Logr.createLogger({ reporters });
  log = (tags, message) => {
    if (typeof message === 'string' && options.name) {
      message = `${message} on ${options.name} [${hostname}]`;
    }
    logObj(tags, message);
  };
  log(['info'], {
    '1-minute CPU threshold': options['cpu-one-minute'],
    '5-minute CPU threshold': options['cpu-five-minute'],
    '15-minute CPU threshold': options['cpu-fifteen-minute'],
    memoryThreshold: options.memory,
    spaceThreshold: options.space,
    slackReportRate: options.slackReportRate,
    logInterval: options.interval,
    inodeThreshold: options.inode,
    verbose: options.verbose,
    name: options.name,
    hostname
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

// export logging methods for testing:
module.exports.logCPU = logCPU;
module.exports.logMemory = logMemory;
module.exports.logDisk = logDisk;
