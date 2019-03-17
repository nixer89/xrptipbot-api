import * as mosca from 'mosca';

let server;

let pubsubsettings = {
    //using ascoltatore
    type: 'mongo',		
    url: 'mongodb://localhost:27017/mqtt',
    pubsubCollection: 'ascoltatori',
    mongo: {}
};

let moscaSettings = {
    port: 1883,			//mosca (mqtt) port
    backend: pubsubsettings	//pubsubsettings is the object we created above 
  
};

// fired when the mqtt server is ready
function setup() {
    console.log('Mosca server is up and running')
}

export function init() {
    server = new mosca.Server(moscaSettings);	//here we start mosca
    server.on('ready', setup);	//on init it fires up setup()
}

export function publishMesssage(topic: string, payload: any) {
    console.log("publishing message")
    server.publish({topic: topic, payload: payload, qos:0, retain: false})
    console.log("publised message")
}