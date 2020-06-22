# n9-mongodb-migration

Project to run migration script on mongodb.

## simple usage :

```typescript
import { N9MongodbMigration } from '@neo9/n9-mongodb-migration';

const mongodbPatchApplier = new N9MongodbMigration({
	migrationScriptsFolderPath: './scripts',
	mongodbURI: process.env.MONGODB_URI,
});

await mongodbPatchApplier.apply();
```

## Scripts names :

`x.y.z_dscription-of-the-upgrade.js`

## Script example :

```js
async function up(db, log) {
	await db.collection('test').insertOne({
		test: true,
	});
}

async function down(db, log) {
	await db.collection('test').deleteOne({
		test: true,
	});
}

module.exports = { up, down };
```
