# ssenode
A library for setting up server-sent events in Node.js. This library was inspired by work done by [
Dino Paskvan](https://www.github.com/dpskvn) on [express-sse](https://www.github.com/dpskvn/express-sse)

## Install

`npm install ssenode --save`

## Usage

```js

const { Source, EventStream } = require('ssenode');

const express = require('express');
const cuid = require('cuid');


const source = new Source(cuid);
const app = express();

app.listen(3001, () => {
  console.log('Server ready!');
});

app.use(
  EventStream.init(source, { no_ids:false, pad_for_ie:false })
);

app.get('/notifications', function(){

    EventStream.dispatch(function(arr){

          source.send({
               ids: arr,
               timestamp: Date.now()
          }, '!this is a comment!')

    }, [ 1, 2 ]);
    
});

```

## License
MIT
