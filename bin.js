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
  default: 0.5
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
