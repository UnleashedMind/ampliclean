const inquirer = require('inquirer');
const chalk = require('chalk');
const sequential = require('promise-sequential');
const configurationManager = require('./configuration-manager');

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
        "CREATE_FAILED", 
        "CREATE_COMPLETE", 
        "ROLLBACK_FAILED", 
        "ROLLBACK_COMPLETE", 
        "DELETE_FAILED", 
        "UPDATE_COMPLETE",
        "UPDATE_ROLLBACK_FAILED",
        "UPDATE_ROLLBACK_COMPLETE"
    ]; 
    const response = await client.listStacks({
        StackStatusFilter: stackStatusFilter,
        NextToken: token,
    }).promise();

    const deleteTasks = [];
    console.log(`about to delete ${response.StackSummaries.length} stacks`)
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
        await deleteStack(client, stack);
        console.log(`Delete requested for stack ${stack.StackName}.`);
        } catch (e) {
        console.log(chalk.red(`Failed to request the delete of ${stack.StackName}`));
        console.log(e);
        }
    }
}

async function deleteStack(client, stack) {
  await client.deleteStack({ StackName: stack.StackName }).promise();
}

module.exports = {
  run,
};
