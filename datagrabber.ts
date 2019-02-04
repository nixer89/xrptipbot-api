import * as fetch from 'node-fetch';
import * as mongoose from 'mongoose'
import * as HttpsProxyAgent from 'https-proxy-agent';
import { CommandCursor } from 'mongodb';

let proxy = new HttpsProxyAgent("");

let connection: mongoose.Connection;
let collectionName:string = "tipbotFeedCollection";
var Schema = mongoose.Schema;
var tipbotModel: mongoose.Model<any>;

var tipBotSchema:mongoose.Schema = new Schema({
    id: {type: String, required: true},
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

tipBotSchema = tipBotSchema.index({id:1, moment: 1, user_id:1}, {unique: true});

let useProxy = false;

export async function initFeed() {
    await mongoose.connect('mongodb://127.0.0.1:27017', { useCreateIndex: true});
    connection = mongoose.connection;

    connection.on('open', ()=>{console.log("Connection to MongoDB established")});
    connection.on('error', ()=>{console.log("Connection to MongoDB could NOT be established")});

    let newCollection = true;    

    let collections:CommandCursor = await mongoose.connection.db.listCollections({name: collectionName});
    newCollection = !(await collections.hasNext());
    
    tipbotModel = mongoose.model('testTestModel', tipBotSchema, collectionName);

    console.log("is new collection? " + newCollection);
    
    //initialize feed on startup -> create new collection or add missing transactions
    await scanFeed(0,newCollection ? 10000: 200,true, newCollection);

    console.log("feed initialized");

    setInterval(() => scanFeed(0,100,true,false), 60000);
}

async function scanFeed(skip: number, limit: number, continueRequests: boolean, newCollection: boolean): Promise<void> {

    if(continueRequests) {
        console.log("scanning feed with: " + 'https://www.xrptipbot.com/json/feed?skip='+skip+'&limit='+limit);
        console.time("apiRequestTime");
        let tipbotFeed = await fetch.default('https://www.xrptipbot.com/json/feed?skip='+skip+'&limit='+limit, {agent: useProxy ? proxy : null});
        console.timeEnd("apiRequestTime");
        if(tipbotFeed.ok) {
            console.time("jsonTime");
            let feedArray = await tipbotFeed.json();
            console.timeEnd("jsonTime");

            console.log("got API response");
            //we have entries -> store them in db!
            if(feedArray && feedArray.feed && feedArray.feed.length > 0) {
                if(newCollection) {
                    console.log("this is a new collection, so insert feed");
                    //insert all at once and ignore duplicates
                    try {
                        await tipbotModel.insertMany(feedArray.feed);
                    } catch(err) {
                        console.log("insertMany error: " + JSON.stringify(err));
                        //Seems like a new transaction took place in the tip bot and api returns the same element again.
                        //Mongo throws error to avoid having duplicate keys -> so call the api again with skipping one more item!
                        return scanFeed(skip+=1, limit, continueRequests, newCollection);
                    }
                } else {
                    console.log("insert step by step")
                    //we are no new collection so we shouldn`t have too much entries
                    //update step by step and use upsert to insert new entries. If old entry was updated, then stop execution!
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

        return scanFeed(skip+=limit, limit, continueRequests,newCollection);
    }

    return Promise.resolve();
}

export async function getFeed(filter:any): Promise<any[]> {
    let emptyResult:any[] = [];
    if(tipbotModel) {
        try {
            let limit:number;
            if(filter.limit) {
                limit = parseInt(filter.limit);
                delete filter.limit;
            }

            let from_date:Date;
            if(filter.from_date) {
                from_date = new Date(filter.from_date)
                delete filter.from_date;
            }

            let to_date:Date;
            if(filter.to_date) {
                to_date = new Date(filter.to_date)
                delete filter.to_date;
            }

            console.log("Calling db with filters: " + JSON.stringify(filter) + " and limit: " +limit);
            console.time("Database");
            let mongoResult:any[] = await tipbotModel.find(filter).exec();
            console.timeEnd("Database");
            if(mongoResult) {
                mongoResult = mongoResult.sort((a,b) => {
                    let dateA = new Date(a.moment);
                    let dateB = new Date(b.moment);
    
                    if(dateA>dateB) return -1
                    else if(dateA<dateB) return 1
                    else return 0;
                });

                if(from_date) mongoResult = mongoResult.filter(tip => tip.moment && new Date(tip.moment) >= from_date);
                if(to_date) mongoResult = mongoResult.filter(tip => tip.moment && new Date(tip.moment) <= to_date);
                if(limit) mongoResult = mongoResult.slice(0,limit);

                return mongoResult
            }
            else emptyResult;
        } catch(err) {
            console.log(err);
            return emptyResult;
        }
    } else
        return emptyResult;
}