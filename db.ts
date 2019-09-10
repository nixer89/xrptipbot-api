import { MongoClient, Collection } from 'mongodb';
import consoleStamp = require("console-stamp");

consoleStamp(console, { pattern: 'yyyy-mm-dd HH:MM:ss' });

let tipCollectionName:string = "FeedCollection";
let tipCollectionNameStandarized:string = "FeedCollectionStandarized";
let ilpCollectionName:string = "ILPFeedCollection";
let ilpCollectionNameStandarized:string = "ILPFeedCollectionStandarized";

let dbIp = process.env.DB_IP || "127.0.0.1"

export async function getNewDbModelTips(): Promise<Collection<any>> {
    return ensureIndexes(await getNewDbModel(tipCollectionName));
}

export async function getNewDbModelTipsStandarized(): Promise<Collection<any>> {
    return ensureIndexes( await getNewDbModel(tipCollectionNameStandarized));
}

export async function getNewDbModelILP(): Promise<Collection<any>> {
    return ensureIndexes(await getNewDbModel(ilpCollectionName));
}

export async function getNewDbModelILPStandarized(): Promise<Collection<any>> {
    return ensureIndexes(await getNewDbModel(ilpCollectionNameStandarized));
}

async function getNewDbModel(collectionName: string): Promise<Collection<any>> {
    console.log("[DB]: connecting to mongo db with collection: " + collectionName +" and an schema");
    let connection:MongoClient = await MongoClient.connect('mongodb://'+dbIp+':27017', { useNewUrlParser: true, useUnifiedTopology: true });
    connection.on('open', ()=>{console.log("[DB]: Connection to MongoDB established")});
    connection.on('error', ()=>{console.log("[DB]: Connection to MongoDB could NOT be established")});

    if(connection)
        return connection.db(collectionName).collection(collectionName);
    else
        return null;
}

async function ensureIndexes(collection: Collection): Promise<Collection> {
    try {
        await collection.createIndex({id: -1}, {unique: true});
        await collection.createIndex({momentAsDate: -1});
        await collection.createIndex({xrp: 1});
        await collection.createIndex({user_id: 1});
        await collection.createIndex({to_id: 1});
        await collection.createIndex({type: 1, network: 1},);
        await collection.createIndex({user: "text", to: "text"});
    } catch(err) {
        console.log(JSON.stringify(err));
    }

    return collection;
}