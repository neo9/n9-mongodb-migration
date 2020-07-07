# n9-mongodb-migration

Project to run migration script on mongodb.

[![npm version](https://img.shields.io/npm/v/@neo9/n9-mongodb-migration.svg)](https://www.npmjs.com/package/@neo9/n9-mongodb-migration)
[![Travis](https://img.shields.io/travis/neo9/n9-mongodb-migration/master.svg)](https://travis-ci.org/neo9/n9-mongodb-migration)
[![Coverage](https://img.shields.io/codecov/c/github/neo9/n9-mongodb-migration/master.svg)](https://codecov.io/gh/neo9/n9-mongodb-migration)

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
More examples can be found in the [tests folder](https://github.com/neo9/n9-mongodb-migration/tree/master/test/fixtures).

