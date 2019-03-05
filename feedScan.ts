import * as fetch from 'node-fetch';
import * as mongoose from 'mongoose'
import * as HttpsProxyAgent from 'https-proxy-agent';

export class FeedScan {
    proxy = new HttpsProxyAgent("http://proxy:81");
    useProxy = false;

    tipbotModel: mongoose.Model<any>;
    feedURL: string;
    useFilter: boolean;

    constructor(tipbotModel: mongoose.Model<any>, feedURL: string, useFilter: boolean) {
        this.tipbotModel = tipbotModel;
        this.feedURL = feedURL;
        this.useFilter = useFilter;
    }

    async initFeed(isNewCollection:boolean): Promise<void> {
    
        console.log("is new collection? " + isNewCollection);
        
        //initialize feed on startup -> create new collection or add missing transactions
        await this.scanFeed(0, isNewCollection ? 1000 : 200, true, isNewCollection);
    
        console.log("feed initialized");
    
        setInterval(() => this.scanFeed(0, 100, true, false), 30000);
    }

    async scanFeed(skip: number, limit: number, continueRequests: boolean, newCollection: boolean): Promise<void> {

        if(continueRequests) {
            console.log("scanning feed with: " + this.feedURL+'?skip='+skip+'&limit='+limit);
            try {
                let tipbotFeed = await fetch.default(this.feedURL+'?skip='+skip+'&limit='+limit, {agent: this.useProxy ? this.proxy : null});
    
                if(tipbotFeed.ok) {
                    let feedArray = await tipbotFeed.json();
    
                    //we have entries -> store them in db!
                    if(feedArray && feedArray.feed && feedArray.feed.length > 0) {
                        if(newCollection) {
                            let tipBotFeed:any[] = feedArray.feed;
                            tipBotFeed.forEach(transaction => transaction.momentAsDate = new Date(transaction.moment));
                            //insert all at once and ignore duplicates
                            try {
                                await this.tipbotModel.insertMany(feedArray.feed);
                            } catch(err) {
                                //console.log("insertMany error: " + JSON.stringify(err));
                                //Seems like a new transaction took place in the tip bot and api returns the same element again.
                                //Mongo throws error to avoid having duplicate keys -> so call the api again with skipping one more item!
                                return this.scanFeed(skip+=1, limit, continueRequests, newCollection);
                            }
                        } else {
                            //console.log("insert step by step")
                            //we are no new collection so we shouldn`t have too much entries
                            //update step by step and use upsert to insert new entries. If old entry was updated, then stop execution!
                            for(let transaction of feedArray.feed) {
                                //insert feed to db
                                transaction.momentAsDate = new Date(transaction.moment);
                                let result = await this.tipbotModel.updateOne(this.useFilter ? {id: transaction.id} : transaction, transaction, {upsert: true});
                                //console.log("updateResult " + this.tipbotModel.collection.name + ": " + JSON.stringify(result));
                        

                                if((!this.useFilter && !result['upserted'])
                                    || (this.useFilter && (result['nModified'] == 0) && !result['upserted'])) {
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
    
            return this.scanFeed(skip+=limit, limit, continueRequests,newCollection);
        }
    
        return Promise.resolve();
    }
}
