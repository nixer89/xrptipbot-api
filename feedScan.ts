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
            //ok we need to continue but set it to false as default
            continueRequests = false;
            try {
                console.log("scanning feed with: " + this.feedURL+'?skip='+skip+'&limit='+limit);
                let tipbotFeed = await fetch.default(this.feedURL+'?skip='+skip+'&limit='+limit, {agent: this.useProxy ? this.proxy : null});
    
                if(tipbotFeed.ok) {
                    let feedArray = await tipbotFeed.json();
    
                    //we have entries -> store them in db!
                    if(feedArray && feedArray.feed && feedArray.feed.length > 0) {
                        continueRequests = true;
                        if(newCollection) {
                            let tipBotFeed:any[] = feedArray.feed;
                            //insert all step by step and ignore duplicates
                            try {
                                for(let transaction of tipBotFeed) {
                                    //insert feed to db
                                    transaction.momentAsDate = new Date(transaction.moment);
                                    await this.tipbotModel.updateOne(transaction, transaction, {upsert: true});
                                }
                            } catch(err) {
                                console.log("updateOne error: " + JSON.stringify(err));
                                //Something went wrong on init. Stop initialization
                                return this.scanFeed(skip, limit, false, newCollection);
                            }
                        } else {
                            console.log("insert step by step")
                            //we are no new collection so we shouldn`t have too much entries
                            //update step by step and use upsert to insert new entries. If old entry was updated, then stop execution!
                            for(let transaction of feedArray.feed) {
                                //insert feed to db
                                transaction.momentAsDate = new Date(transaction.moment);
                                let result = await this.tipbotModel.updateOne(this.useFilter ? {id: transaction.id} : transaction, transaction, {upsert: true});
                                //console.log("updateResult " + this.tipbotModel.collection.name + ": " + JSON.stringify(result));
                        

                                if((!this.useFilter && !result['upserted'])
                                    || (this.useFilter && (result['nModified'] == 0) && !result['upserted'])) {
                                        //do not break here, just try to do more
                                        //break;
                                } else {
                                    //ok, we have at least one entry - check the feed a second time to avoid missing any transactions
                                    continueRequests = true;
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
