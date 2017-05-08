'use strict';
const poll = require('./lib/poll.js');
const os = require('os');
const argv = require('yargs')
.help('h')
.alias('h', 'help')
.option('interval', {
  alias: 'i',
  describe: 'polling interval expressed in seconds',
  default: 60
})
.option('cpu', {
  alias: 'c',
  describe: 'cpu threshold expressed as percent',
  default: 50
})
.option('memory', {
  alias: 'm',
  describe: 'memory threshold expressed as percent',
  default: 50
})
.option('space', {
  alias: 's',
  describe: 'disk space threshold expressed as percent',
  default: 50
})
.option('disk', {
  alias: 'd',
  describe: 'disk to monitor for space',
  default: os.platform() === 'win32' ? 'c' : '/'
})
.argv;

poll(argv);
