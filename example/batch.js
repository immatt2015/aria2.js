;(function () {
  'use strict'

  var Aria2

  // Node.js, browserify, ...
  if (typeof module !== 'undefined' && module.exports) {
    Aria2 = require('..')
  // browsers
  } else {
    Aria2 = window.Aria2
  }

  // those are default options
  var options = {'host': 'localhost', 'port': 6800, 'secure': false, jsonp: false}
  var aria2 = new Aria2(options)
  //
  // aria2.onmessage = function (m) {
  //   console.log('aria2 IN:', m)
  // }
  //
  // aria2.onsend = function (m) {
  //   console.log('aria2 OUT:', m)
  // }

  aria2.open(function (err) {
    if (err) return console.error(err)

    aria2.batch([
      ['getVersion', null, function (err, res) {
        console.log(err || res)
      }],
      ['getVersion', null, function (err, res) {
        console.log(err || res)
      }]
    ], function () {
      aria2.close()
    })
  })
}())
