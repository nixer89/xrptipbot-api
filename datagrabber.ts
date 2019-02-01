import * as fetch from 'node-fetch';
import * as mongoose from 'mongoose'
import * as HttpsProxyAgent from 'https-proxy-agent';

import * as util from './utils';

let proxy = new HttpsProxyAgent("http://proxy.wincor-nixdorf.com:81");

let max = 200;
let db: mongoose.Connection;

export async function initFeed() {
    await mongoose.connect('mongodb://127.0.0.1:27017');
    db = mongoose.connection;

    db.on('open', ()=>{console.log("Connection to MongoDB established")});
    db.on('error', ()=>{console.log("Connection to MongoDB could NOT be established")});
    let transactions:[] = [];

    let tips = await readInFeed(transactions, null, 0, 200, true);

    let tipbotFeed = db.collection("tipbotFeedTest");
    //console.log("collection: " + JSON.stringify(tipbotFeed));

    if(!tipbotFeed) {
        //createCollection
        await db.createCollection("tipbotFeedTest",null,(err, collection) =>{console.log("CreateCollection err? " + JSON.stringify(err))});
        tipbotFeed = db.collection("tipbotFeedTest");
    } 

    for(let tip of tips) {
        let result = await tipbotFeed.update(tip, tip, {upsert: true});
        console.log("updateResult: " + JSON.stringify(result));

        if(!result['upserted']) break;
    }
}

async function readInFeed(receivedTips: any[], checkUntilDate: Date, skip: number, limit: number, continueRequests: boolean): Promise<any[]> {

    if(continueRequests && skip < max) {
        console.time("apiRequestTime");
        let tipbotFeed = await fetch.default('https://www.xrptipbot.com/json/feed?skip='+skip+'&limit='+limit, {agent: proxy});
        console.timeEnd("apiRequestTime");
        if(tipbotFeed.ok) {
            console.time("jsonTime");
            let feedArray = await tipbotFeed.json();
            console.timeEnd("jsonTime");
            
            let lastFeedTipDate = new Date(feedArray.feed[feedArray.feed.length-1].moment);
            
            if(feedArray)
                receivedTips = receivedTips.concat(feedArray.feed);

            if(checkUntilDate)
                continueRequests = lastFeedTipDate > checkUntilDate;

        } else {
            continueRequests = false
        }

        receivedTips = await readInFeed(receivedTips, checkUntilDate , skip+=limit, limit, continueRequests);
    }

    console.log(receivedTips.length);
    return receivedTips;
}