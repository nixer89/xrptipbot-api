import * as fetch from 'node-fetch';
import * as mongoose from 'mongoose'
import * as HttpsProxyAgent from 'https-proxy-agent';

let proxy = new HttpsProxyAgent("http://proxy.wincor-nixdorf.com:81");

let max = 200;
let connection: mongoose.Connection;
let collectionName:string = "testtestCollection123345";
var Schema = mongoose.Schema;
var tipbotModel;

var tipBotSchema = new Schema({
    id: { type: [String], index: true },
    moment: String,
    type: String,
    xrp: Number,
    network: String,
    user: String,
    to: String,
    user_network: String,
    to_network: String,
    user_id: String,
    to_id: String,
    context: String,
});

let useProxy = false;

export async function initFeed() {
    await mongoose.connect('mongodb://127.0.0.1:27017', { autoIndex: false });
    connection = mongoose.connection;

    connection.on('open', ()=>{console.log("Connection to MongoDB established")});
    connection.on('error', ()=>{console.log("Connection to MongoDB could NOT be established")});

    let newCollection = false;    

    let collections = await mongoose.connection.db.listCollections({name: collectionName});
    if(await !collections.hasNext())
        newCollection = true;

    tipbotModel = mongoose.model('testTestModel', tipBotSchema, collectionName);
    
    await scanFeed(0,newCollection ? 10000: 200,true, newCollection);

    setInterval(() => scanFeed(0,200,true,false), 300000);
}

async function scanFeed(skip: number, limit: number, continueRequests: boolean, newCollection: boolean): Promise<void> {

    console.log("scanning feed with skip: " + skip + " and limit: " + limit);
    if(continueRequests && skip < max) {
        console.time("apiRequestTime");
        console.log("scanning API");
        let tipbotFeed = await fetch.default('https://www.xrptipbot.com/json/feed?skip='+skip+'&limit='+limit, {agent: useProxy ? proxy : null});
        console.timeEnd("apiRequestTime");
        if(tipbotFeed.ok) {
            console.time("jsonTime");
            let feedArray = await tipbotFeed.json();
            console.timeEnd("jsonTime");

            console.log("got API response");
            //we have entries -> store them in db!
            if(feedArray && feedArray.feed) {
                if(newCollection) {
                    console.log("this is a new collection, so insert feed");
                    //insert all at once and ignore duplicates
                    let result = await tipbotModel.updateMany({}, feedArray.feed, {upsert: true});
                    console.log("updateManyResult: " + JSON.stringify(result));
                } else {
                    console.log("insert step by step")
                    //insert step by step and stop insert if duplicate found!
                    for(let tip of feedArray.feed) {
                        //insert feed to db
                        let result = await tipbotModel.updateOne(tip, tip, {upsert: true});
                        console.log("updateResult: " + JSON.stringify(result));
                
                        if(!result['upserted']) {
                            continueRequests = false;
                            break;
                        }
                    }
                }
            } else {
                //nothing to do anymore -> cancel execution
                continueRequests = false;
            }

        } else {
            //something is wrong -> cancel request
            continueRequests = false
        }

        await scanFeed(skip+=limit, limit, continueRequests,newCollection);
    }
}