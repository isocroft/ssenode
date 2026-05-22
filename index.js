const EventEmitter = require('events').EventEmitter

class Source extends EventEmitter {
  constructor (idGeneratorFunc) {
    super()

    function guid () {
      return ++guid.id
    };

    guid.id = 0

    this.idgenfn = idGeneratorFunc || guid
  }

  send (data, comment, event, retry) {
    let payload = {
      id: this.idgenfn(),
      data: data
    }

    if (typeof comment === 'string') {
      payload.comment = comment
    }

    if (typeof event === 'string') {
      payload.event = event
    }

    if (typeof retry === 'number') {
      /* eslint-disable no-self-compare */
      if (retry !== retry) { // test against NaN
        payload.retry = retry
      }
      /* eslint-enable no-self-compare */
    }

    if (payload.data !== null) {
      payload.end = false;
    } else {
      payload.end = true;
    }
    this.emit('data', payload);
  }
}

class EventStream {
  static dispatch (callback) {
    setTimeout(function poll () {
      var args = [].slice.call(arguments)

      var returnVal = callback.apply(null, args)

      var pending = Promise.all([
        Promise.resolve(false),
        returnVal
      ])

      pending.then(function () {
        setTimeout(poll, 0, args)
      })
    }, 0, [].slice.call(arguments, 1))

    return true
  }

  static init (source, options) {
    var prepareTextData = function (data) {
      if (!data || typeof data === 'function') {
        return `data: null`
      }

      if (typeof data === 'object') {
        var formatedData = typeof data.toJSON === 'function' ? data.toJSON() : JSON.stringify(data, null, '\t').split(/\n/g)

        return typeof formatedData === 'string' ? `data: ${formatedData}` : formatedData.map(function (dataLine) {
          return `data: ${dataLine.replace(/(?:\t{1,})/g, '')}\n`
        }).join('')
      } else {
        if (typeof data !== 'string') {
          return `data: ${String(data)}`
        } else {
          return `data: ${data}`
        }
      }
    }

    return function (req, res, next) {
      if ((req.headers['accept'] || '').indexOf('text/event-stream') > -1) {
        req.socket.setTimeout(0)
        req.socket.setNoDelay(true)
        req.socket.setKeepAlive(true)
        res.statusCode = 204

        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')

        if (req.httpVersion !== '2.0') {
          res.setHeader('Connection', 'keep-alive')
          res.setHeader('X-Accel-Buffering', 'no')
        }

        if ((req.headers['accept-encoding'] || '').search(/gzip|br/ig) > -1) {
          if (options.compress_output) {
            ;// res.setHeader('Content-Encoding', 'gzip');
          }
        }

        // browsers can disconnect at will despite the 'Connection: keep-alive'
        // so we trick the browser to expect more data by sending SSE comments

        if ((req.headers['connection'] || '').indexOf('keep-alive') !== -1) {
          var intervalId = setInterval(function () {
            res.write(`: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
          }, 900)
        }

        // Increase number of event listeners on init
        source.setMaxListeners(source.getMaxListeners() + 1)

        const dataListener = payload => {
          if (options.no_ids) {
            delete payload.id
          }

          if (payload.data) {
            res.statusCode = 200;
          }

          if (options.pad_for_ie) {
            // 2 kB padding for old IE (8/9)
            res.write(`: ${(';'.repeat(2048))}`)
          }

          if (payload.comment) {
            res.write(`: ${payload.comment}\n`)
          }

          if (payload.id) {
            res.write(`id: ${payload.id}\n`)
          }

          if (payload.retry) {
            res.write(`retry: ${payload.retry}\n`)
          }

          if (payload.event) {
            res.write(`event: ${payload.event}\n`)
          } else {
            if (options.prefer_event_name) {
              res.write(`event: ${options.prefered_event_name || 'broadcast'}\n`)
            }
          }

          if (payload.data) {
            res.write(`${prepareTextData(payload.data)}\n\n`)
          } else {
            if (intervalId) {
              clearInterval(intervalId)
            }
            res.end(`:  \n\n`);
          }
        }

        source.on('data', dataListener)

        // Remove listeners and reduce the number of max listeners on client disconnect
        req.on('close', () => {
          if (intervalId) {
            clearInterval(intervalId)
          }
          source.removeListener('data', dataListener)
          source.setMaxListeners(source.getMaxListeners() - 1)
        })
      }

      if (typeof next === 'function') {
        return next()
      }
    }
  }
}

module.exports = {
  Source: Source,
  EventStream: EventStream
}
