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
.option('cpu', {
  alias: 'c',
  describe: 'cpu/IO load avg expressed as fractional number',
  default: 0.75
})
.option('cpu_one_minute', {
  describe: 'show warnings for cpu loads higher than the one-minute average',
  default: true
})
.option('cpu_five_minute', {
  describe: 'show warnings for cpu loads higher than the five-minute average',
  default: false
})
.option('cpu_fifteen_minute', {
  describe: 'show warnings for cpu loads higher than the fifteen-minute average',
  default: false
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
