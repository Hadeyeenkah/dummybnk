const mongoose = require('mongoose');

// MongoDB transactions require a replica set (Atlas provides one, while many
// local installations do not).  Use a real transaction whenever available,
// but keep the development server usable on a standalone local MongoDB.
const transactionUnsupported = (error) => (
  error?.code === 20
  || /transaction numbers are only allowed on a replica set member or mongos/i.test(error?.message || '')
  || /does not support transactions/i.test(error?.message || '')
);

/**
 * Run database work in a MongoDB transaction when the deployment supports
 * transactions. `work` receives a session, or null for the standalone-Mongo
 * compatibility path. Financial operations still use idempotency keys in the
 * compatibility path so a browser retry cannot create a second transfer.
 */
const withDatabaseTransaction = async (work) => {
  let session;

  try {
    session = await mongoose.startSession();
  } catch (_) {
    return work(null);
  }

  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    if (transactionUnsupported(error)) {
      return work(null);
    }
    throw error;
  } finally {
    await session.endSession().catch(() => {});
  }
};

module.exports = { withDatabaseTransaction };
