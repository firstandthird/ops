'use strict';
const os = require('os');
const disk = require('diskspace');
const runshell = require('runshell');

module.exports.getMemory = (callback) => {
  runshell('free', {}, (err, data) => {
    if (err) {
      return callback(err);
    }
    const lines = data.toString().split(/\n/g);
    const line = lines[1].split(/\s+/);
    const total = parseInt(line[1], 10);
    const baseFree = parseInt(line[3], 10);
    const buffers = parseInt(line[5], 10);
    const cached = parseInt(line[6], 10);
    const free = baseFree + buffers + cached;
    callback(null, {
      free, total
    });
  });
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
      if (columns[5] === partition) {
        return callback(null, columns[0], Number.parseInt(columns[4].replace('%', ''), 10) * 0.01);
      }
    }
    return callback(new Error(`a partition beginning with "${partition}" was not found`));
  });
};
