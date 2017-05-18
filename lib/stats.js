'use strict';
const os = require('os');
const disk = require('diskspace');
const runshell = require('runshell');

module.exports.getMemory = () => {
  return {
    total: os.totalmem(),
    free: os.freemem()
  };
};

module.exports.getCPU = () => os.loadavg();

module.exports.getDisk = (options, callback) => {
  disk.check(options.disk, callback);
};

module.exports.getInodes = (callback) => {
  runshell('df', {
    args: '-i'
  }, (err, data) => {
    if (err) {
      return callback(err);
    }
    // gets the inode useage % for the top partition:
    const percentString = data.split('\n')[1].split(/[ ]+/)[4].replace('%', '');
    return callback(null, Number.parseInt(percentString, 10) * 0.01);
  });
};
