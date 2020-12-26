# server-events-nodejs
A library for setting up server-sent events in Node.js. This library was inspired by work done by [
Dino Paskvan](https://www.github.com/dpskvn) on [express-sse](https://www.github.com/dpskvn/express-sse)

## Install

>npm

`npm install server-events-nodejs --save`

>yarn

`yarn add server-events-nodejs`

## Usage

```js

const { Source, EventStream } = require('server-events-nodejs');

const express = require('express');
const cuid = require('cuid');
const port = "8080";

const source = new Source(cuid);
const app = express();

app.listen(port, () => {
  console.log('Server ready!');
});

app.use(
  EventStream.init(source, { 
    no_ids: false, // if you need id: key/value (from the cuid lib) as part of the text-stream response - set to 'true'
    pad_for_ie: false, // if the HTTP request is from an IE 8/9 browser - set to 'true'
    prefered_event_name: 'update', // if you need event: key/value (here set to 'update')  as part of the text-stream resposne - set here to whatever you like
    prefer_event_name: true // enforce the prefered event name to be used in the text-stream response
  })
);

app.get('/notifications', function(req){
          console.log('headers: ', req.headers);
          source.send({
               ids: [ '123', '456' ],
               timestamp: Date.now()
          }, '!this is a comment!')
    
});

```

>Then, you need to setup the front-end accordingly

```js

const evtSource = new EventSource('http://localhost:8080/notifications');

evtSource.addEventListener('update', function(e) {
   console.log("message: " + e.data);
});

/* - logs to console -

  message: {
    "ids": [
      "123",
      "456"
    ],
    "timestamp": 1608970168797
  }
  
*/
```

## License
MIT

