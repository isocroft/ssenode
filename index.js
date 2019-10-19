const EventEmitter = require('events').EventEmitter;

class Source extends EventEmitter {

    constructor (idGeneratorFunc) {
        super();
        
        guid.id = -1;
        this.idgenfn = idGeneratorFunc || function guid(){
            return ++guid.id;
        }
    }

    send (data, comment, event, retry) {
        payload = {
            id:this.idgenfn(),
            data: data
        };

        if(typeof comment === 'string'){
            payload.comment = comment
        }

        if(typeof event === 'string'){
            payload.event = event
        }

        if(typeof retry === 'number'){
            if(retry !== retry){ // filter out NaN
                payload.retry = retry
            }
        }

        this.emit('data', payload)
    }
}

class EventStream {

    static dispatch(callback){

        setTimeout(function poll() {

          var args = [].slice.call(arguments);

          var returnVal = callback.apply(null, args)
          
          var pending = Promise.all([Promise.resolve(false), returnVal ])
          
          pending.then(function(){

                setTimeout(poll, 0, args)
          });

        }, 0, [].slice.call(arguments, 1))

        return true;

    }

    static init(source, options) {

        var prepareTextData = function(data){
            
            if(!data || typeof data === 'function'){
                return `data: null`;
            }
            
            if(typeof data === 'object'){
                var formatedData = typeof data.toJSON === 'function' ? data.toJSON() : JSON.stringify(data, null, '\t').split(/\t{1,}/g)
                
                formatedData[formatedData.length - 1] += '\n\n';

                return typeof formatedData === 'string' ? `data: ${formatedData}\n\n` : formatedData.map(function(dataLine){
                    return `data: ${dataLine}`;
                }).join('');
            }else{
                if(typeof data !== 'string'){
                    return `data: ${String(data)}\n\n`;
                }else{
                    return `data: ${data}\n\n`;
                }
            }
        }

        return function (req, res, next){

            if(req.headers['accept'].indexOf('text/event-stream') > -1){
            
                req.socket.setTimeout(0);
                req.socket.setNoDelay(true);
                req.socket.setKeepAlive(true);
                res.statusCode = 200;

                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');

                if (req.httpVersion !== '2.0') {
                    res.setHeader('Connection', 'keep-alive');
                    res.setHeader('X-Accel-Buffering', 'no');
                }

                if (options.compress_output) {
                    ;// res.setHeader('Content-Encoding', 'gzip');
                }

                // browsers can disconnect at will despite the 'Connection: keep-alive'
                // so we trick the browser to expect more data by sending SSE comments
                res.write(`: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`);
            
                // Increase number of event listeners on init
                source.setMaxListeners(source.getMaxListeners() + 1);
            
                const dataListener = payload => {
                    
                    if(options.no_ids){
                        delete payload.id
                    }

                    if(options.pad_for_ie){ 
                        // 2 kB padding for old IE (8/9)
                        res.write(`: ${';'.repeat(2048)}`);
                    }

                    if(payload.comment) {
                        res.write(`: ${payload.comment}\n`);
                    }

                    if (payload.id) {
                        res.write(`id: ${payload.id}\n`);
                    } 
                    
                    if(payload.retry){
                        res.write(`retry: ${payload.retry}\n`)
                    }

                    if (payload.event) {
                        res.write(`event: ${payload.event}\n`);
                    }else {
                        if(options.prefer_event_name){
                            res.write(`event: ${options.prefered_event_name || 'broadcast'}`)
                        }
                    }

                    if (payload.data) {
                        res.write(prepareTextData(payload.data));
                    }
                };
        
                source.on('data', dataListener);
            
                // Remove listeners and reduce the number of max listeners on client disconnect
                req.on('close', () => {
                    source.removeListener('data', dataListener);
                    source.setMaxListeners(source.getMaxListeners() - 1);
                });
            }

            if(typeof next === 'function') {
                return next();
            }
        }
    }
}

module.exports = {
   Source: Source,
   EventStream: EventStream
}
