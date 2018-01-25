;(function (global) {
  'use strict'

  let WebSocket
  let fetch

  const isNode = typeof module !== 'undefined' && module.exports

  if (isNode) {
    WebSocket = require('ws')
    fetch = require('node-fetch')
  } else {
    WebSocket = global.WebSocket
    fetch = global.fetch
  }

  class Aria2 {
    constructor (options) {
      this.callbacks = Object.create(null)
      this.lastId = 0

      Object.assign(this, Aria2.options, options)
    }

    http (m) {
      const content = {
        method: m.method,
        id: m.id
      }

      if (Array.isArray(m.params) && m.params.length > 0) {
        content.params = m.params
      }

      const url = 'http' + (this.secure ? 's' : '') + '://' + this.host + ':' + this.port + this.path
      return new Promise((resolve, reject) => {
        this.callbacks[m.id] = [resolve, reject]
        fetch(url, {
          method: 'POST',
          body: JSON.stringify(content),
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        })
        .then(function (res) {
          return res.json()
        })
        .then(function (msg) {
          this._onmessage(msg)
        })
        .catch(reject)
      })
    }

    send (method, ...params) {
      const params = Array.prototype.slice.call(arguments, 1)
      return this.exec(method, ...params)
    }

    exec (method, parameters) {
      if (typeof method !== 'string') {
        throw new TypeError(method + ' is not a string')
      }

      if (method.indexOf('system.') !== 0 && method.indexOf('aria2.') !== 0) {
        method = 'aria2.' + method
      }

      const m = {
        method,
        'json-rpc': '2.0',
        'id': this.lastId++
      }

      const params = this.secret ? ['token:' + this.secret] : []
      if (Array.isArray(parameters)) {
        params = params.concat(parameters)
      }

      if (params.length > 0) m.params = params

      this.onsend(m)

      return new Promise((resolve, reject) => {
        // send via websocket
        if (this.socket && this.socket.readyState === 1) {
          this.socket.send(JSON.stringify(m))
        // send via http
        } else {
          this.http(m).catch(reject)
        }

        this.callbacks[m.id] = [resolve, reject]
      })
    }

    _onmessage (m) {
      this.onmessage(m)

      if (m.id !== undefined) {
        const callback = this.callbacks[m.id]
        if (callback) {
          if (m.error) {
            callback[1](m.error)
          } else {
            callback[0](m.result)
          }
          delete this.callbacks[m.id]
        }
      } else if (m.method) {
        var n = m.method.split('aria2.')[1]
        if (n.indexOf('on') === 0 && typeof this[n] === 'function' && Aria2.notifications.indexOf(n) > -1) {
          this[n].apply(this, m.params)
        }
      }
    }

    open () {
      const url = 'ws' + (this.secure ? 's' : '') + '://' + this.host + ':' + this.port + this.path
      const socket = this.socket = new WebSocket(url)

      socket.onclose = () => {
        this.onclose()
      }
      socket.onmessage = (event) => {
        this._onmessage(JSON.parse(event.data))
      }

      return new Promise((resolve, reject) => {
        socket.onopen = function () {
          resolve()
          this.onopen()
        }
        socket.onerror = function (err) {
          reject(err)
        }
      })
    }

    close () {
      var socket = this.socket
      return new Promise(function (resolve, reject) {
        if (!socket) {
          resolve()
        } else {
          socket.addEventListener('close', function () {
            resolve()
          })
          socket.close()
        }
      })
    }
  }

  // https://aria2.github.io/manual/en/html/aria2c.html#methods
  Aria2.methods = [
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.addUri
    'addUri',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.addTorrent
    'addTorrent',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.addMetalink
    'addMetalink',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.remove
    'remove',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.forceRemove
    'forceRemove',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.pause
    'pause',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.pauseAll
    'pauseAll',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.forcePause
    'forcePause',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.forcePauseAll
    'forcePauseAll',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.unpause
    'unpause',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.unpauseAll
    'unpauseAll',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.tellStatus
    'tellStatus',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.getUris
    'getUris',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.getFiles
    'getFiles',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.getPeers
    'getPeers',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.getServers
    'getServers',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.tellActive
    'tellActive',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.tellWaiting
    'tellWaiting',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.tellStopped
    'tellStopped',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.changePosition
    'changePosition',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.changeUri
    'changeUri',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.getOption
    'getOption',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.changeOption
    'changeOption',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.getGlobalOption
    'getGlobalOption',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.changeGlobalOption
    'changeGlobalOption',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.getGlobalStat
    'getGlobalStat',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.purgeDownloadResult
    'purgeDownloadResult',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.removeDownloadResult
    'removeDownloadResult',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.getVersion
    'getVersion',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.getSessionInfo
    'getSessionInfo',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.shutdown
    'shutdown',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.forceShutdown
    'forceShutdown',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.saveSession
    'saveSession',
    // https://aria2.github.io/manual/en/html/aria2c.html#system.multicall
    'system.multicall',
    // https://aria2.github.io/manual/en/html/aria2c.html#system.listMethods
    'system.listMethods',
    // https://aria2.github.io/manual/en/html/aria2c.html#system.listNotifications
    'system.listNotifications'
  ]

  // https://aria2.github.io/manual/en/html/aria2c.html#notifications
  Aria2.notifications = [
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.onDownloadStart
    'onDownloadStart',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.onDownloadPause
    'onDownloadPause',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.onDownloadStop
    'onDownloadStop',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.onDownloadComplete
    'onDownloadComplete',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.onDownloadError
    'onDownloadError',
    // https://aria2.github.io/manual/en/html/aria2c.html#aria2.onBtDownloadComplete
    'onBtDownloadComplete'
  ]

  Aria2.events = [
    'onopen',
    'onclose',
    'onsend',
    'onmessage'
  ]

  Aria2.options = {
    'secure': false,
    'host': 'localhost',
    'port': 6800,
    'secret': '',
    'path': '/jsonrpc'
  }

  Aria2.methods.forEach(function (method) {
    const sufix = method.indexOf('.') > -1 ? method.split('.')[1] : method
    Aria2.prototype[sufix] = function (/* [param] [,param] [,...] */) {
      return this.send.apply(this, [method].concat(Array.prototype.slice.call(arguments)))
    }
  })

  Aria2.notifications.forEach(function (notification) {
    Aria2.prototype[notification] = function () {}
  })

  Aria2.events.forEach(function (event) {
    Aria2.prototype[event] = function () {}
  })

  if (isNode) {
    module.exports = Aria2
  } else {
    global.Aria2 = Aria2
  }
}(this))
