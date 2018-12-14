const configurationManager = require('./configuration-manager');

async function run() {
  const awsClient = await configurationManager.getConfiguredAwsClient(true);
  const client = new awsClient.Pinpoint();
  console.log('done');
}

module.exports = {
  run,
};
