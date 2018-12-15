const inquirer = require('inquirer');
const chalk = require('chalk');
const sequential = require('promise-sequential');
const configurationManager = require('./configuration-manager');
const iamRolesHandler = require('./handler-iam-roles');

async function run(yesFlag) {
  const awsClient = await configurationManager.getConfiguredAwsClient(true);
  const client = new awsClient.CloudFormation();
  let token;
  do {
    token = await PaginatedRun(client, yesFlag, token);
  } while (token);
}

async function PaginatedRun(client, yesFlag, token) {
  const stackStatusFilter = [
    'CREATE_FAILED',
    'CREATE_COMPLETE',
    'ROLLBACK_FAILED',
    'ROLLBACK_COMPLETE',
    'DELETE_FAILED',
    'UPDATE_COMPLETE',
    'UPDATE_ROLLBACK_FAILED',
    'UPDATE_ROLLBACK_COMPLETE',
  ];
  const response = await client.listStacks({
    StackStatusFilter: stackStatusFilter,
    NextToken: token,
  }).promise();

  const deleteTasks = [];
  console.log(`about to delete ${response.StackSummaries.length} stacks`);
  response.StackSummaries.forEach((stack) => {
    deleteTasks.push(async () => {
      await executeDelete(client, stack, yesFlag);
    });
  });
  await sequential(deleteTasks);

  return response.NextToken;
}

async function executeDelete(client, stack, confirmed) {
  if (!confirmed) {
    const deleteStackConfirmation = {
      type: 'confirm',
      name: 'confirmeDelete',
      message: `Delete ${stack.StackName}`,
      default: false,
    };
    const answer = await inquirer.prompt(deleteStackConfirmation);
    confirmed = answer.confirmeDelete;
  }

  if (confirmed) {
    try {
      console.log();
      console.log(`Deleting stack ${stack.StackName}...`);
      await deleteRoles(client, stack);
      await deleteStack(client, stack);
      console.log(chalk.green(`Delete request sent for  ${stack.StackName}`));
    } catch (e) {
      console.log(chalk.red(`Failed to request the delete of ${stack.StackName}`));
      console.log(e);
    }
  }
}

async function deleteRoles(client, stack) {
  const description = await client.describeStacks({ StackName: stack.StackName }).promise();
  const { Outputs } = description.Stacks[0];
  if (Outputs && Outputs.length > 0) {
    const authRole = {};
    const unauthRole = {};
    Outputs.forEach((output) => {
      if (output.OutputKey === 'AuthRoleName') {
        authRole.Name = output.OutputValue;
      }
      if (output.OutputKey === 'AuthRoleArn') {
        authRole.Arn = output.OutputValue;
      }
      if (output.OutputKey === 'UnauthRoleName') {
        unauthRole.Name = output.OutputValue;
      }
      if (output.OutputKey === 'UnauthRoleArn') {
        unauthRole.Arn = output.OutputValue;
      }
    });
    if (authRole.Name) {
      try {
        await iamRolesHandler.deleteRole(authRole);
      } catch (e) {
        console.log(e);
      }
    }
    if (unauthRole.Name) {
      try {
        await iamRolesHandler.deleteRole(unauthRole);
      } catch (e) {
        console.log(e);
      }
    }
  }
}

async function deleteStack(client, stack) {
  await client.deleteStack({ StackName: stack.StackName }).promise();
}

module.exports = {
  run,
};
