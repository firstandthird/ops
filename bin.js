#! /usr/bin/env node
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
.option('inode', {
  alias: 'in',
  describe: 'inode useage threshold expressed as fractional number',
  default: 0.75
})
.option('partition', {
  alias: 'p',
  describe: 'the mount point to count inodes for',
  default: '/'
})
.option('cpu-one-minute', {
  describe: 'threshold to show warnings for cpu loads higher than the 1-minute average (set to 0 to turn off 1-minute warnings)',
  default: 0.75
})
.option('cpu-five-minute', {
  describe: 'threshold to show warnings for cpu loads higher than the 5-minute average (set to 0 to turn off 5-minute warnings)',
  default: 0
})
.option('cpu-fifteen-minute', {
  describe: 'threshold to show warnings for cpu loads higher than the 15e-minute average (set to 0 to turn off 15-minute warnings)',
  default: 0
})
.option('memory', {
  alias: 'm',
  describe: 'memory threshold expressed as percent',
  default: 75
})
.option('space', {
  alias: 's',
  describe: 'disk space threshold expressed as percent',
  default: 90
})
.option('disk', {
  alias: 'd',
  describe: 'disk to monitor for space',
  default: os.platform() === 'win32' ? 'c' : '/'
})
.option('verbose', {
  alias: 'v',
  describe: 'verbose logging',
  default: false
})
.env('OPS')
.argv;

poll(argv);
