
const path = require('path');
const serverless = require('serverless-http');
const app = require(path.join(__dirname, '..', 'src', 'app'));

module.exports = serverless(app);
