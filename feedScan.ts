import * as fetch from 'node-fetch';
import * as mongoose from 'mongoose'
import * as HttpsProxyAgent from 'https-proxy-agent';
import * as mqtt from './mqtt-broker';

export class FeedScan {
    proxy = new HttpsProxyAgent("http://proxy:81");
    useProxy = false;

    tipbotModel: mongoose.Model<any>;
    tipbotModelStandarized: mongoose.Model<any>;
    feedURL: string;
    useFilter: boolean;

    constructor(tipbotModel: mongoose.Model<any>, feedURL: string, tipbotModelStandarized?: mongoose.Model<any>) {
        this.tipbotModel = tipbotModel;
        this.tipbotModelStandarized = tipbotModelStandarized;
        this.feedURL = feedURL;
    }

    async initFeed(isNewCollection:boolean, updateStandarized?: boolean, useMQTT?: boolean): Promise<void> {
    
        console.log("is new collection? " + isNewCollection);
        if(useMQTT)
            mqtt.init();
        
        //initialize feed on startup -> create new collection or add missing transactions
        await this.scanFeed(0, isNewCollection ? 1000 : 200, true, isNewCollection, false, updateStandarized);
    
        console.log("feed initialized");

        //if not new collection, scan whole feed 2 min after startup to get back in sync completely
        if(!isNewCollection && !this.useProxy)
            //setTimeout(() => this.scanFeed(0, 10000, true, false, true, updateStandarized), 120000);
    
        setInterval(() => this.scanFeed(0, 50, true, false, false, updateStandarized, useMQTT), 30000);

        //scan whole feed every 12h to get in sync in case some transactions were missed!
        if(!this.useProxy)
            setInterval(() => this.scanFeed(0, 10000, true, false, true, updateStandarized), 43200000);
    }

    async scanFeed(skip: number, limit: number, continueRequests: boolean, newCollection: boolean, continueUntilEnd?: boolean, updateStandarized?: boolean, useMQTT?: boolean): Promise<void> {

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
                        
                                if(updateStandarized && this.tipbotModelStandarized) {
                                    let standarizedTransaction = this.standarizeTransaction(JSON.stringify(transaction));
                                    await this.tipbotModelStandarized.updateOne({id: standarizedTransaction.id}, standarizedTransaction, {upsert: true});
                                }

                                //ok, so we are a normal "scan" and we have *new* entries
                                if(useMQTT && !newCollection && !continueUntilEnd && result['upserted']) {
                                    //publish a message with the user sending the tip and one message receiving the tip
                                    console.log("we have a new tranaction, publish is to MQTT: " + JSON.stringify(transaction));
                                    if(transaction.user) {
                                        let user_network = (transaction.network === 'app' || transaction.network === 'btn') ? transaction.user_network : transaction.network;
                                        console.log("publishing user: " + '/'+user_network+'/'+transaction.user+'/sending')
                                        mqtt.publishMesssage('/'+user_network+'/'+transaction.user+'/sending', JSON.stringify(transaction));
                                    }

                                    if(transaction.to) {
                                        let to_network = (transaction.network === 'app' || transaction.network === 'btn') ? transaction.to_network : transaction.network;
                                        console.log("publishing to: " + '/'+to_network+'/'+transaction.to+'/receiving')
                                        mqtt.publishMesssage('/'+to_network+'/'+transaction.to+'/receiving', JSON.stringify(transaction));
                                    }
                                }
                                
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
    
            return this.scanFeed(skip+=limit, limit, continueRequests, newCollection, continueUntilEnd, updateStandarized);
        }
    
        return Promise.resolve();
    }

    standarizeTransaction(transaction: any): any {
        let standarizedTransaction = JSON.parse(transaction);
        //both users are on same network
        if(standarizedTransaction.network === 'discord') {
            standarizedTransaction.user = transaction.user_id
            standarizedTransaction.user_id = transaction.user;
            standarizedTransaction.to = transaction.to_id
            standarizedTransaction.to_id = transaction.to;
        } else if(standarizedTransaction.user_network === 'discord') {
            standarizedTransaction.user = transaction.user_id
            standarizedTransaction.user_id = transaction.user;
        } else if(standarizedTransaction.to_network === 'discord') {
            standarizedTransaction.to = transaction.to_id
            standarizedTransaction.to_id = transaction.to;
        }

        return standarizedTransaction;
    }
}
