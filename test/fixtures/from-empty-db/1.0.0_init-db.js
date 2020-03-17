async function up(db, log) {
	const appInfos = await db
		.collection('_appInfos')
		.find()
		.toArray();

	log.info('App infos historic : ' + JSON.stringify(appInfos));

	await db.collection('test-init-db').insertOne({
		test: true,
	});
}

async function down(db, log) {}

module.exports = { up, down };
