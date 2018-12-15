const inquirer = require('inquirer');
const chalk = require('chalk');
const sequential = require('promise-sequential');
const configurationManager = require('./configuration-manager');

const pageSize = '20'; // max is 29

async function run(yesFlag) {
  const awsClient = await configurationManager.getConfiguredAwsClient(true);
  const client = new awsClient.Pinpoint();
  let token;
  do {
    token = await PaginatedRun(client, yesFlag);
  } while (token);
}

async function PaginatedRun(client, yesFlag, token) {
  const response = await client.getApps({
    PageSize: pageSize,
    Token: token,
  }).promise();

  const deleteTasks = [];
  response.ApplicationsResponse.Item.forEach((pinpointApp) => {
    deleteTasks.push(async () => {
      await executeDelete(client, pinpointApp, yesFlag);
    });
  });
  await sequential(deleteTasks);

  return response.ApplicationsResponse.NextToken;
}

async function executeDelete(client, pinpointApp, confirmed) {
  if (!confirmed) {
    const deleteBucketConfirmation = {
      type: 'confirm',
      name: 'confirmeDelete',
      message: `Delete ${pinpointApp.Name}`,
      default: false,
    };
    const answer = await inquirer.prompt(deleteBucketConfirmation);
    confirmed = answer.confirmeDelete;
  }

  if (confirmed) {
    try {
      console.log(`Deleting ${pinpointApp.Name}...`);
      await deletePinpointApp(client, pinpointApp);
      console.log(`Pinpoint project ${pinpointApp.Name} is deleted.`);
    } catch (e) {
      console.log(chalk.red(`Failed to delete ${pinpointApp.Name}`));
      console.log(e);
    }
  }
}

async function deletePinpointApp(client, pinpointApp) {
  await client.deleteApp({ ApplicationId: pinpointApp.Id }).promise();
}

module.exports = {
  run,
};
