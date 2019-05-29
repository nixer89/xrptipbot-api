import * as mongoose from 'mongoose'
import { CommandCursor } from 'mongodb';

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

tipBotSchema = tipBotSchema.index({momentAsDate: -1}, {unique: false});
tipBotSchema = tipBotSchema.index({id: -1}, {unique: true});
tipBotSchema = tipBotSchema.index({user: 1, to:1 ,id:-1,}, {unique: true});
tipBotSchema = tipBotSchema.index({user_id: 1, to_id:1 ,id:-1,}, {unique: true});

tipBotSchemaILP = tipBotSchemaILP.index({momentAsDate: -1}, {unique: false});
tipBotSchemaILP = tipBotSchemaILP.index({id: -1}, {unique: true});
tipBotSchemaILP = tipBotSchemaILP.index({user: 1, id:-1,}, {unique: true});
tipBotSchemaILP = tipBotSchemaILP.index({user_id: 1, id:-1,}, {unique: true});

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
    await mongoose.connect('mongodb://127.0.0.1:27017/'+collectionName, { useCreateIndex: true, useNewUrlParser: true});
    connection = mongoose.connection;

    connection.on('open', ()=>{console.log("Connection to MongoDB established")});
    connection.on('error', ()=>{console.log("Connection to MongoDB could NOT be established")});

    let newCollection = true;    

    let collections:CommandCursor = await mongoose.connection.db.listCollections({name: collectionName});
    newCollection = !(await collections.hasNext());

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
    let connection:mongoose.Connection = await mongoose.createConnection('mongodb://127.0.0.1:27017/'+collectionName, { useCreateIndex: true, useNewUrlParser: true});
    connection.on('open', ()=>{console.log("Connection to MongoDB established")});
    connection.on('error', ()=>{console.log("Connection to MongoDB could NOT be established")});

    if(connection)
        return connection.model('xrpTipBotApiModel', schema, collectionName);
    else
        return null;
}