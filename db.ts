import * as mongoose from 'mongoose'
import { CommandCursor } from 'mongodb';
import consoleStamp = require("console-stamp");

consoleStamp(console, { pattern: 'yyyy-mm-dd HH:MM:ss' });

let connection: mongoose.Connection;
let tipCollectionName:string = "FeedCollection";
let ilpCollectionName:string = "ILPFeedCollection";
let tipCollectionNameStandarized:string = "FeedCollectionStandarized";
var Schema = mongoose.Schema;

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

var tipBotSchemaILP:mongoose.Schema = new Schema({
    id: {type: String, required: true},
    moment: String,
    type: String,
    network: String,
    user: String,
    user_network: String,
    user_id: String,
    amount: Number,
    momentAsDate: Date
});

tipBotSchema = tipBotSchema.index({id: -1}, {unique: true});
tipBotSchema = tipBotSchema.index({momentAsDate: -1}, {unique: false});
tipBotSchema = tipBotSchema.index({xrp: 1}, {unique: false});

tipBotSchemaILP = tipBotSchemaILP.index({id: -1}, {unique: true});
tipBotSchemaILP = tipBotSchemaILP.index({momentAsDate: -1}, {unique: false});
tipBotSchemaILP = tipBotSchemaILP.index({xrp: 1}, {unique: false});


export function initTipDB(): Promise<boolean> {
    return initDB(tipCollectionName);
}

export function initILPDB(): Promise<boolean> {
    return initDB(ilpCollectionName);
}

export function initTipDBStandarized(): Promise<boolean> {
    return initDB(tipCollectionNameStandarized);
}

async function initDB(collectionName: string): Promise<boolean> {
    console.log("[DB]: connecting to mongo db with collection: " + collectionName);
    await mongoose.connect('mongodb://127.0.0.1:27017/'+collectionName, { useCreateIndex: true, useNewUrlParser: true});
    connection = mongoose.connection;

    connection.on('open', ()=>{console.log("[DB]: Connection to MongoDB established")});
    connection.on('error', ()=>{console.log("[DB]: Connection to MongoDB could NOT be established")});

    let newCollection = true;    

    let collections:CommandCursor = await mongoose.connection.db.listCollections({name: collectionName});
    newCollection = !(await collections.hasNext());
    
    await mongoose.disconnect();

    return newCollection;
}

export function getNewDbModelTips(): Promise<mongoose.Model<any>> {
    return getNewDbModel(tipCollectionName, tipBotSchema);
}

export function getNewDbModelILP(): Promise<mongoose.Model<any>> {
    return getNewDbModel(ilpCollectionName, tipBotSchemaILP);
}

export function getNewDbModelTipsStandarized(): Promise<mongoose.Model<any>> {
    return getNewDbModel(tipCollectionNameStandarized, tipBotSchema);
}

async function getNewDbModel(collectionName: string, schema: mongoose.Schema): Promise<mongoose.Model<any>> {
    console.log("[DB]: connecting to mongo db with collection: " + collectionName +" and an schema");
    let connection:mongoose.Connection = await mongoose.createConnection('mongodb://127.0.0.1:27017/'+collectionName, { useCreateIndex: true, useNewUrlParser: true});
    connection.on('open', ()=>{console.log("[DB]: Connection to MongoDB established")});
    connection.on('error', ()=>{console.log("[DB]: Connection to MongoDB could NOT be established")});

    if(connection)
        return connection.model('xrpTipBotApiModel', schema, collectionName);
    else
        return null;
}