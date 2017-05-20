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

module.exports.getInodes = (partition, callback) => {
  runshell('df', {
    args: '-i'
  }, (err, data) => {
    if (err) {
      return callback(err);
    }
    // gets the inode useage % for the top partition:
    const rows = data.split('\n');
    for (let i = 0; i < rows.length; i++) {
      const columns = rows[i].split(/[ ]+/);
      if (columns[0].startsWith(partition)) {
        return callback(null, columns[0], Number.parseInt(columns[4].replace('%', ''), 10) * 0.01);
      }
    }
    return callback(new Error(`a partition beginning with "${partition}" was not found`));
  });
};
