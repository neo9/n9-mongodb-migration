async function up(db, log) {
	log.info(`Start migration script of 1s`);
	await new Promise((resolve) => setTimeout(resolve, 1000));
	log.info(`End migration script of 1s`);
}

async function down(db, log) {}

module.exports = { up, down };
