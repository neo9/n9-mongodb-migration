async function up(db, log) {
	await db.collection('test').deleteMany({});
	await db.collection('test').insertOne({
		test: '2-1',
	});
}

async function down(db, log) {}

module.exports = { up, down };
