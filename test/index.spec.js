'use strict'

var chai = require('chai')
var expect = chai.expect
// var should = chai.should()

const express = require('express')
const EventSource = require('eventsource')

const { Source, EventStream } = require('../index')

describe('ssenode Nodejs package', () => {
  let app
  let server
  let source
  let options

  beforeEach(function (done) {
    app = express()
    server = app.listen(3010, done)
    source = new Source()
    options = {
      pad_for_ie: false,
      no_ids: true,
      compress_output: false,
      prefered_event_name: 'broadcast',
      prefer_event_name: false
    }
  })

  afterEach(function (done) {
    server.close(done)
    source = null
    options = null
  })

  it('should send events', done => {
    const middlewareFn = EventStream.init(source, options)

    app.use(middlewareFn)
    app.get('/stream', function (req, res) {
      // EventStream.dispatch(function(arr){
      source.send('test message', '!This is a test!')
      // }, [ 1 ]);
    })

    const es = new EventSource('http://localhost:3010/stream')
    es.onmessage = event => {
      /* eslint-disable no-unused-expressions */
      expect(event.data).to.be.equal('test message')
      /* eslint-enable no-unused-expressions */
      es.close()
      done()
    }
  })

  it('should allow sending custom events via options', done => {
    // options.no_ids = false
    options.prefer_event_name = true
    const middlewareFn = EventStream.init(source, options)

    app.use(middlewareFn)
    app.get('/stream', function (req, res) {
      source.send('test message', '!This is a test!')
      // source.send('test message', '!This is a test!', 'update')
    })

    const es = new EventSource('http://localhost:3010/stream')
    es.addEventListener('broadcast', event => {
      expect(event.data).to.be.equal('test message')
      es.close()
      done()
    })
  })

  it('should allow sending user-defined custom events', done => {
    options.no_ids = false
    const middlewareFn = EventStream.init(source, options)

    app.use(middlewareFn)
    app.get('/stream', function (req, res) {
      source.send({ msg: 'test message' }, '!This is a test!', 'update')
    })

    const es = new EventSource('http://localhost:3010/stream')
    es.addEventListener('update', event => {
      var data = JSON.parse(event.data)
      expect(data.msg).to.be.equal('test message')
      expect(event.lastEventId).to.be.equal('1')
      es.close()
      done()
    })
  })
})
