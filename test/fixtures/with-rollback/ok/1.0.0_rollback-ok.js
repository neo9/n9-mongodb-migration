async function up(db, log) {
	await db.collection('test-rollback').insertOne({
		test: false,
	});
	throw new Error('failing-up-function');
}

async function down(db, log) {
	await db.collection('test-rollback').updateOne(
		{ test: false },
		{
			$set: {
				test: true,
			},
		},
	);
}

module.exports = { up, down };
