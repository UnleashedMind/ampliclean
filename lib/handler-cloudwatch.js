const inquirer = require('inquirer');
const chalk = require('chalk');
const sequential = require('promise-sequential');
const configurationManager = require('./configuration-manager');

const maxResults = '25'; // max is 29

async function run(yesFlag) {
  const awsClient = await configurationManager.getConfiguredAwsClient(true);
  const client = new awsClient.CloudWatchLogs();
  let token;
  do {
    token = await PaginatedRun(client, yesFlag, token);
  } while (token);
}

async function PaginatedRun(client, yesFlag, token) {
  const listLogGroupsResult = await client.describeLogGroups({
    limit: maxResults,
    nextToken: token,
  }).promise();

  const deleteTasks = [];
  listLogGroupsResult.logGroups.forEach((logGroup) => {
    deleteTasks.push(async () => {
      await executeDelete(client, logGroup, yesFlag);
    });
  });
  await sequential(deleteTasks);

  return listLogGroupsResult.nextToken;
}

async function executeDelete(client, logGroup, confirmed) {
  if (!confirmed) {
    const deleteLogGroupConfirmation = {
      type: 'confirm',
      name: 'confirmeDelete',
      message: `Delete ${logGroup.logGroupName}`,
      default: false,
    };
    const answer = await inquirer.prompt(deleteLogGroupConfirmation);
    confirmed = answer.confirmeDelete;
  }

  if (confirmed) {
    try {
      console.log(`Deleting ${logGroup.logGroupName} ...`);
      await deleteLogGroup(client, logGroup);
      console.log(`Log Group ${logGroup.logGroupName} is deleted.`);
    } catch (e) {
      console.log(chalk.red(`Failed to delete ${logGroup.logGroupName}`));
      console.log(e);
    }
  }
}

async function deleteLogGroup(client, logGroup) {
  await client.deleteLogGroup({ logGroupName: logGroup.logGroupName }).promise();
}


module.exports = {
  run,
};
