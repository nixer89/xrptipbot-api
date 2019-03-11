import * as fetch from 'node-fetch';
import * as mongoose from 'mongoose'
import * as HttpsProxyAgent from 'https-proxy-agent';

export class FeedScan {
    proxy = new HttpsProxyAgent("http://proxy:81");
    useProxy = false;

    tipbotModel: mongoose.Model<any>;
    feedURL: string;
    useFilter: boolean;

    constructor(tipbotModel: mongoose.Model<any>, feedURL: string) {
        this.tipbotModel = tipbotModel;
        this.feedURL = feedURL;
    }

    async initFeed(isNewCollection:boolean): Promise<void> {
    
        console.log("is new collection? " + isNewCollection);
        
        //initialize feed on startup -> create new collection or add missing transactions
        await this.scanFeed(0, isNewCollection ? 1000 : 200, true, isNewCollection);
    
        console.log("feed initialized");

        //if not new collection, scan whole feed 2 min after startup to get back in sync completely
        if(!isNewCollection)
            setTimeout(() => this.scanFeed(0, 10000, true, false, true), 120000);
    
        setInterval(() => this.scanFeed(0, 50, true, false), 30000);

        //scan whole feed every 12h to get in sync in case some transactions were missed!
        setInterval(() => this.scanFeed(0, 10000, true, false, true), 43200000);
    }

    async scanFeed(skip: number, limit: number, continueRequests: boolean, newCollection: boolean, continueUntilEnd?: boolean): Promise<void> {

        if(continueUntilEnd || continueRequests) {
            //ok we need to continue but set it to false as default
            continueRequests = false;
            try {
                console.log("scanning feed with: " + this.feedURL+'?skip='+skip+'&limit='+limit);
                let tipbotFeed = await fetch.default(this.feedURL+'?skip='+skip+'&limit='+limit, {agent: this.useProxy ? this.proxy : null});
    
                if(tipbotFeed.ok) {
                    let feedArray = await tipbotFeed.json();
    
                    //we have entries -> store them in db!
                    if(feedArray && feedArray.feed && feedArray.feed.length > 0) {
                        if(newCollection)
                            //we have an array so run at least one more time if we are in initialization phase
                            continueRequests = true;

                        let tipBotFeed:any[] = feedArray.feed;
                        //insert all step by step and ignore duplicates
                        try {
                            for(let transaction of tipBotFeed) {
                                //insert feed to db
                                transaction.momentAsDate = new Date(transaction.moment);
                                let result = await this.tipbotModel.updateOne({id: transaction.id}, transaction, {upsert: true});
                        
                                //continue request when at least one entry was updated or insered
                                if(!newCollection && (result['nModified'] == 1 || result['upserted']))
                                    continueRequests=true;
                            }
                        } catch(err) {
                            console.log("updateOne error: " + JSON.stringify(err));
                            //Something went wrong on init. Stop initialization
                            continueRequests = false;
                        }
                    } else {
                        //nothing to do anymore -> cancel execution
                        continueRequests = continueUntilEnd = false;
                    }
                } else {
                    //something is wrong -> cancel request
                    continueRequests = continueUntilEnd = false;
                }
            } catch (err) {
                //nothing to do here.
                console.log("an error occured while calling api or inserting data into db")
                console.log(JSON.stringify(err));
                continueRequests = continueUntilEnd = false;
            }
    
            return this.scanFeed(skip+=limit, limit, continueRequests, newCollection, continueUntilEnd);
        }
    
        return Promise.resolve();
    }
}
