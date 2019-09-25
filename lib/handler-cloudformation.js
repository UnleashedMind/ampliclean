const inquirer = require('inquirer');
const chalk = require('chalk');
const sequential = require('promise-sequential');
const configurationManager = require('./configuration-manager');
const iamHandler = require('./handler-iam');

let awsClient;

async function run(yesFlag) {
  awsClient = await configurationManager.getConfiguredAwsClient(true);
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
    if (authRole.Name || unauthRole.Name) {
      const iamClient = await iamHandler.getIamClient(awsClient);
      let attatchedPolicies = [];
      if (authRole.Name) {
        try {
          attatchedPolicies = attatchedPolicies.concat(
            await iamHandler.deleteRole(authRole, iamClient),
          );
        } catch (e) {
          console.log(e);
        }
      }
      if (unauthRole.Name) {
        try {
          attatchedPolicies = attatchedPolicies.concat(
            await iamHandler.deleteRole(unauthRole, iamClient),
          );
        } catch (e) {
          console.log(e);
        }
      }
      if (attatchedPolicies.length > 0) {
        try {
          await deletePolicies(attatchedPolicies, iamClient);
        } catch (e) {
          console.log(e);
        }
      }
    }
  }
}

async function deletePolicies(policies, iamClient) {
  const deleteTasks = [];
  const policyArnSet = new Set();
  policies.forEach((policy) => {
    if (!policyArnSet.has(policy.PolicyArn)) {
      policyArnSet.add(policy.PolicyArn);
      deleteTasks.push(async () => {
        await iamHandler.deletePolicy(policy, iamClient);
      });
    }
  });
  await sequential(deleteTasks);
}

async function deleteStack(client, stack) {
  await client.deleteStack({ StackName: stack.StackName }).promise();
}

module.exports = {
  run,
};
