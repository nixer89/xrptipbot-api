import * as mongoose from 'mongoose'
import { CommandCursor } from 'mongodb';

let connection: mongoose.Connection;
let collectionName:string = "tipbotFeedCollectionWithDate";
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

tipBotSchema = tipBotSchema.index({momentAsDate: -1}, {unique: false});
tipBotSchema = tipBotSchema.index({user: 1, to:1 ,id:-1,}, {unique: true});
tipBotSchema = tipBotSchema.index({user_id: 1, to_id:1 ,id:-1,}, {unique: true});

export async function initDB(): Promise<boolean> {
    await mongoose.connect('mongodb://127.0.0.1:27017', { useCreateIndex: true});
    connection = mongoose.connection;

    connection.on('open', ()=>{console.log("Connection to MongoDB established")});
    connection.on('error', ()=>{console.log("Connection to MongoDB could NOT be established")});

    let newCollection = true;    

    let collections:CommandCursor = await mongoose.connection.db.listCollections({name: collectionName});
    newCollection = !(await collections.hasNext());

    return newCollection;
}

export async function getNewDbModel(): Promise<mongoose.Model<any>> {
    let connection:mongoose.Connection = await mongoose.createConnection('mongodb://127.0.0.1:27017', { useCreateIndex: true});
    connection.on('open', ()=>{console.log("Connection to MongoDB established")});
    connection.on('error', ()=>{console.log("Connection to MongoDB could NOT be established")});

    if(connection)
        return connection.model('xrpTipBotApiModel', tipBotSchema, collectionName);
    else
        return null;
}