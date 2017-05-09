'use strict';
const os = require('os');
const disk = require('diskspace');

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
