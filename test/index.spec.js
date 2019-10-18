'use strict';

require('chai').should();

const express = require('express');
const EventSource = require('eventsource');

const { Source, EventStream } = require('../index');

describe('ssenode Nodejs package', () => {
  let app;
  let server;
  let source;
  let options;

  beforeEach(function (done) {
    app = express();
    server = app.listen(3010, done);
    source = new Source()
    options = {
      pad_for_ie: false,
      compress_output: false,
      prefered_event_name: 'broadcast',
      prefer_event_name: false
    };
  });

  afterEach(function (done) {
    server.close(done);
    source = null
  });

  it('should send events', done => {
    const middlewareFn = EventStream.init(source, options);
    
    app.use(middlwareFn);
    app.get('/stream', function(req, res){
        source.send('test message', '!This is a test!');
    });

    const es = new EventSource('http://localhost:3010/stream');
    es.onmessage = e => {
      JSON.parse(e.data).should.equal('test message');
      es.close();
      done();
    };
  });

  it('should allow sending custom events via options', done => {
    options.prefer_event_name = true
    const middlewareFn = EventStream.init(source, options);
    
    app.use(middlewareFn);
    app.get('/stream', function(req, res){
        source.send('test message', '!This is a test!');
        source.send('test message', '!This is a test!', 'update');
    });

    const es = new EventSource('http://localhost:3010/stream');
    es.addEventListener('broadcast', event => {
      JSON.parse(event.data).should.equal('test message');
      es.close();
      done();
    });
  });

  it('should allow sending user-defined custom events', done => {
    const middlewareFn = EventStream.init(source, options);
    
    app.use(middlewareFn);
    app.get('/stream', function(req, res){
        source.send('test message', '!This is a test!', 'update');
    });

    const es = new EventSource('http://localhost:3010/stream');
    es.addEventListener('update', e => {
      JSON.parse(e.data).should.equal('test message');
      e.lastEventId.should.equal('0');
      es.close();
      done();
    };
  });
 });
