const inquirer = require('inquirer');
const chalk = require('chalk');
const sequential = require('promise-sequential');
const configurationManager = require('./configuration-manager');

const maxResults = '25'; // max is 29

async function run(yesFlag) {
  const awsClient = await configurationManager.getConfiguredAwsClient(true);
  const client = new awsClient.Amplify();
  let token;
  do {
    token = await PaginatedRun(client, yesFlag, token);
  } while (token);
}

async function PaginatedRun(client, yesFlag, token) {
  const listAppsResult = await client.listApps({
    maxResults,
    nextToken: token,
  }).promise();

  const deleteTasks = [];
  listAppsResult.apps.forEach((app) => {
    deleteTasks.push(async () => {
      await executeDelete(client, app, yesFlag);
    });
  });
  await sequential(deleteTasks);

  return listAppsResult.nextToken;
}

async function executeDelete(client, app, confirmed) {
  if (!confirmed) {
    const deleteBucketConfirmation = {
      type: 'confirm',
      name: 'confirmeDelete',
      message: `Delete ${app.name}`,
      default: false,
    };
    const answer = await inquirer.prompt(deleteBucketConfirmation);
    confirmed = answer.confirmeDelete;
  }

  if (confirmed) {
    try {
      console.log(`Deleting ${app.name} / ${app.appId} ...`);
      await deleteAmplifyApp(client, app);
      console.log(`Amplify project ${app.name} / ${app.appId} is deleted.`);
    } catch (e) {
      console.log(chalk.red(`Failed to delete ${app.name}`));
      console.log(e);
    }
  }
}

async function deleteAmplifyApp(client, app) {
  await client.deleteApp({ appId: app.appId }).promise();
}

module.exports = {
  run,
};
