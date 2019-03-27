import * as fetch from 'node-fetch';
import * as mongoose from 'mongoose'
import * as HttpsProxyAgent from 'https-proxy-agent';
import * as mqtt from './mqtt-broker';

export class FeedScan {
    proxy = new HttpsProxyAgent("http://proxy:81");
    useProxy = true;

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
        await this.scanFeed(0, isNewCollection ? 1000 : 200, true, isNewCollection, false, updateStandarized, !isNewCollection && useMQTT);
    
        console.log("feed initialized");

        //if not new collection, scan whole feed 2 min after startup to get back in sync completely
        if(!isNewCollection)
            setTimeout(() => this.scanFeed(0, 10000, true, false, true, updateStandarized), 120000);
    
        setInterval(() => this.scanFeed(0, 50, true, false, false, updateStandarized, useMQTT), 30000);

        //scan whole feed every 12h to get in sync in case some transactions were missed!
        setInterval(() => this.scanFeed(0, 10000, true, false, true, updateStandarized), 43200000);
    }

    async scanFeed(skip: number, limit: number, continueRequests: boolean, newCollection: boolean, continueUntilEnd?: boolean, updateStandarized?: boolean, useMQTT?: boolean, oneAndOnlyRepeat?: boolean): Promise<void> {

        if(continueRequests || continueUntilEnd) {
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

                        let tipBotFeed:any[] = feedArray.feed.reverse();
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
                                    this.publishTransactionOnMQTT(transaction);
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
                //repeat only one time if we have an json error -> may not occure a second time!
                if(!oneAndOnlyRepeat && err && err.message && err.message.startsWith("invalid json response body")) {
                    oneAndOnlyRepeat = true;
                    return this.scanFeed(skip, limit, continueRequests, newCollection, continueUntilEnd, updateStandarized, useMQTT, oneAndOnlyRepeat);
                }
                continueRequests = continueUntilEnd = false;
            }
    
            return this.scanFeed(skip+=limit, limit, continueRequests, newCollection, continueUntilEnd, updateStandarized, useMQTT);
        }
    
        return Promise.resolve();
    }

    publishTransactionOnMQTT(transaction: any) {
        //publish a message with the user sending the tip and one message receiving the tip
        if(transaction.type==='deposit' || transaction.type==='withdraw') {
            console.log("publishing: " + transaction.type+'/'+transaction.network+'/'+transaction.user)
            mqtt.publishMesssage(transaction.type+'/'+transaction.network+'/'+transaction.user, JSON.stringify(transaction));
            mqtt.publishMesssage(transaction.type+'/'+transaction.network+'/*', JSON.stringify(transaction));
            mqtt.publishMesssage(transaction.type+'/*', JSON.stringify(transaction));
        } else {
            if(transaction.user) {
                let user_network = (transaction.network === 'app' || transaction.network === 'btn') ? transaction.user_network : transaction.network;
                console.log("publishing: " + transaction.type+'/sent/'+user_network+'/'+transaction.user)
                mqtt.publishMesssage(transaction.type+'/sent/'+user_network+'/'+transaction.user, JSON.stringify(transaction));
                mqtt.publishMesssage(transaction.type+'/sent/'+user_network+'/*', JSON.stringify(transaction));
                mqtt.publishMesssage(transaction.type+'/sent/*', JSON.stringify(transaction));
            }

            if(transaction.to) {
                let to_network = (transaction.network === 'app' || transaction.network === 'btn') ? transaction.to_network : transaction.network;
                console.log("publishing: " + transaction.type+'/received/'+to_network+'/'+transaction.to)
                mqtt.publishMesssage(transaction.type+'/received/'+to_network+'/'+transaction.to, JSON.stringify(transaction));
                mqtt.publishMesssage(transaction.type+'/received/'+to_network+'/*', JSON.stringify(transaction));
                mqtt.publishMesssage(transaction.type+'/received/*', JSON.stringify(transaction));
            }
        }
    }

    standarizeTransaction(transaction: any): any {
        let originalTransaction = JSON.parse(transaction);
        let standarizedTransaction = JSON.parse(transaction);
        //check discord
        //both users are on same network
        if(standarizedTransaction.network === 'discord') {
            standarizedTransaction.user = originalTransaction.user_id
            standarizedTransaction.user_id = originalTransaction.user;
            standarizedTransaction.to = originalTransaction.to_id
            standarizedTransaction.to_id = originalTransaction.to;
        } else {
            //check if one or both users are on discord -> transaction may happened via app/button
            if(standarizedTransaction.user_network === 'discord') {
                standarizedTransaction.user = originalTransaction.user_id
                standarizedTransaction.user_id = originalTransaction.user;
            }
            
            if(standarizedTransaction.to_network === 'discord') {
                standarizedTransaction.to = originalTransaction.to_id
                standarizedTransaction.to_id = originalTransaction.to;
            }
        }

        //check reddit
        if(standarizedTransaction.network === 'reddit') {
            standarizedTransaction.user_id = originalTransaction.user;
            standarizedTransaction.to_id = originalTransaction.to;
        } else {
            //check if one or both users are on discord -> transaction may happened via app/button
            if(standarizedTransaction.user_network === 'reddit') {
                standarizedTransaction.user_id = originalTransaction.user;
            }
            
            if(standarizedTransaction.to_network === 'reddit') {
                standarizedTransaction.to_id = originalTransaction.to;
            }
        }

        //handle null values for user_id for all networks -> paperaccount?
        if(standarizedTransaction.user && !standarizedTransaction.user_id)
            standarizedTransaction.user_id = standarizedTransaction.user;
        
        if(standarizedTransaction.user_id && !standarizedTransaction.user)
            standarizedTransaction.user = standarizedTransaction.user_id;

        if(standarizedTransaction.to && !standarizedTransaction.to_id)
            standarizedTransaction.to_id = standarizedTransaction.to;
        
        if(standarizedTransaction.to_id && !standarizedTransaction.to)
            standarizedTransaction.to = standarizedTransaction.to_id;


        //set user_network and to_network when transaction happened on same network
        if(standarizedTransaction.network != 'btn'
            && standarizedTransaction.network != 'app'
                && standarizedTransaction.network != 'internal') {

                    if(!standarizedTransaction.user_network)
                        standarizedTransaction.user_network = standarizedTransaction.network;

                    if(standarizedTransaction.type != 'deposit' && standarizedTransaction.type != 'withdraw') {
                        //set also to_network when not deposit or withdraw
                        if(!standarizedTransaction.to_network)
                            standarizedTransaction.to_network = standarizedTransaction.network;
                    }
                }

        return standarizedTransaction;
    }
}
