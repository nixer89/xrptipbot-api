import * as fetch from 'node-fetch';
import * as mongoose from 'mongoose'
import * as HttpsProxyAgent from 'https-proxy-agent';
import { CommandCursor } from 'mongodb';

let proxy = new HttpsProxyAgent("http://proxy:81");
let useProxy = false;

let connection: mongoose.Connection;
let collectionName:string = "tipbotFeedCollectionWithDate";
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
    momentAsDate: Date
});

tipBotSchema = tipBotSchema.index({momentAsDate: -1}, {unique: false});
tipBotSchema = tipBotSchema.index({user: 1, to:1 ,id:-1,}, {unique: true});
tipBotSchema = tipBotSchema.index({user_id: 1, to_id:1 ,id:-1,}, {unique: true});

export async function initFeed() {
    await mongoose.connect('mongodb://127.0.0.1:27017', { useCreateIndex: true});
    connection = mongoose.connection;

    connection.on('open', ()=>{console.log("Connection to MongoDB established")});
    connection.on('error', ()=>{console.log("Connection to MongoDB could NOT be established")});

    let newCollection = true;    

    let collections:CommandCursor = await mongoose.connection.db.listCollections({name: collectionName});
    newCollection = !(await collections.hasNext());
    
    tipbotModel = mongoose.model('xrpTipBotApiModel', tipBotSchema, collectionName);

    console.log("is new collection? " + newCollection);
    
    //initialize feed on startup -> create new collection or add missing transactions
    await scanFeed(0, newCollection ? 10000: 200, true, newCollection);

    console.log("feed initialized");

    setInterval(() => scanFeed(0, 100, true, false), 30000);
}

async function scanFeed(skip: number, limit: number, continueRequests: boolean, newCollection: boolean): Promise<void> {

    if(continueRequests) {
        console.log("scanning feed with: " + 'https://www.xrptipbot.com/json/feed?skip='+skip+'&limit='+limit);
        try {
            let tipbotFeed = await fetch.default('https://www.xrptipbot.com/json/feed?skip='+skip+'&limit='+limit, {agent: useProxy ? proxy : null});

            if(tipbotFeed.ok) {
                let feedArray = await tipbotFeed.json();

                //we have entries -> store them in db!
                if(feedArray && feedArray.feed && feedArray.feed.length > 0) {
                    if(newCollection) {
                        let tipBotFeed:any[] = feedArray.feed;
                        tipBotFeed.forEach(transaction => transaction.momentAsDate = new Date(transaction.moment));
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
                        for(let transaction of feedArray.feed) {
                            //insert feed to db
                            transaction.momentAsDate = new Date(transaction.moment);
                            let result = await tipbotModel.updateOne(transaction, transaction, {upsert: true});
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
        } catch (err) {
            //nothing to do here.
            console.log("an error occured while calling api or inserting data into db")
            console.log(JSON.stringify(err));
            continueRequests = false;
        }

        return scanFeed(skip+=limit, limit, continueRequests,newCollection);
    }

    return Promise.resolve();
}

export async function getFeed(filter:any): Promise<any[]> {
    let emptyResult:any[] = [];
    if(tipbotModel) {
        try {
            let filterWithOperatorAnd:any[] = [];
            let limit:number;
            if(filter.limit) {
                limit = parseInt(filter.limit);
                delete filter.limit;
            }

            let from_date:Date;
            if(filter.from_date) {
                from_date = new Date(filter.from_date)
                filterWithOperatorAnd.push({momentAsDate: {$gte: from_date}});
                delete filter.from_date;
            }

            let to_date:Date;
            if(filter.to_date) {
                to_date = new Date(filter.to_date)
                filterWithOperatorAnd.push({momentAsDate: {$lte: to_date}});
                delete filter.to_date;
            }

            let result_fields:string;
            if(filter.result_fields) {
                result_fields = filter.result_fields;
                delete filter.result_fields;
            }

            let finalFilter:any;
            if(filterWithOperatorAnd.length>0) {
                filterWithOperatorAnd.push(filter)
                finalFilter = {$and: filterWithOperatorAnd}
            } else
                finalFilter = filter;

            console.log("Calling db with finalFilter: " + JSON.stringify(finalFilter) + " and limit: " +limit);
            let mongoResult:any[] = await tipbotModel.find(finalFilter, result_fields).sort({momentAsDate:-1}).limit(limit).exec();

            if(mongoResult) return mongoResult
            else emptyResult;
        } catch(err) {
            console.log(err);
            return emptyResult;
        }
    } else
        return emptyResult;
}