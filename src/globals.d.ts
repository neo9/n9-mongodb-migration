import { N9Log } from '@neo9/n9-node-log';
import type { Db, MongoClient } from 'mongodb';

/* eslint-disable no-var,vars-on-top */
export declare global {
	var log: N9Log;
	var db: Db;
	var dbClient: MongoClient;
}
