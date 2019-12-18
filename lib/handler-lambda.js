const inquirer = require('inquirer');
const chalk = require('chalk');
const sequential = require('promise-sequential');
const configurationManager = require('./configuration-manager');

const maxResults = '25'; // max is 29

async function run(yesFlag) {
  const awsClient = await configurationManager.getConfiguredAwsClient(true);
  const client = new awsClient.Lambda();
  let token;
  do {
    token = await PaginatedRun(client, yesFlag, token);
  } while (token);
}

async function PaginatedRun(client, yesFlag, token) {
  const listFunctionsResult = await client.listFunctions({
    MaxItems: maxResults,
    Marker: token,
  }).promise();

  const deleteTasks = [];
  listFunctionsResult.Functions.forEach((func) => {
    deleteTasks.push(async () => {
      await executeDelete(client, func, yesFlag);
    });
  });
  await sequential(deleteTasks);

  return listFunctionsResult.NextMarker;
}

async function executeDelete(client, func, confirmed) {
  if (!confirmed) {
    const deleteFunctionConfirmation = {
      type: 'confirm',
      name: 'confirmeDelete',
      message: `Delete ${func.FunctionName}`,
      default: false,
    };
    const answer = await inquirer.prompt(deleteFunctionConfirmation);
    confirmed = answer.confirmeDelete;
  }

  if (confirmed) {
    try {
      console.log(`Deleting ${func.FunctionName} ...`);
      await deleteLambdaFunction(client, func);
      console.log(`Lambda Function ${func.FunctionName} is deleted.`);
    } catch (e) {
      console.log(chalk.red(`Failed to delete ${func.FunctionName}`));
      console.log(e);
    }
  }
}

async function deleteLambdaFunction(client, func) {
  await client.deleteFunction({ FunctionName: func.FunctionName }).promise();
}


module.exports = {
  run,
};
