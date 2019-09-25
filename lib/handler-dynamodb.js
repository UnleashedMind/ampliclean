const inquirer = require('inquirer');
const chalk = require('chalk');
const sequential = require('promise-sequential');
const configurationManager = require('./configuration-manager');

async function run(yesFlag) {
  const awsClient = await configurationManager.getConfiguredAwsClient(true);
  const client = new awsClient.DynamoDB();
  let hasMore = true;
  do {
    hasMore = await PaginatedRun(client, yesFlag);
  } while (hasMore);
}
async function PaginatedRun(client, yesFlag) {
  let hasMoreTableToDelete = false;
  const response = await client.listTables().promise();
  if (response.TableNames && response.TableNames.length > 0) {
    const tablesToDelete = [];
    const tableCheckTasks = [];
    response.TableNames.forEach((tableName) => {
      tableCheckTasks.push(async () => {
        console.log(tableName);
        const describeTableResponse = await client.describeTable({
          TableName: tableName,
        }).promise();
        if (describeTableResponse.Table.TableStatus !== 'Deleting') {
          tablesToDelete.push(tableName);
        }
      });
    });

    await sequential(tableCheckTasks);

    if (tablesToDelete.length > 0) {
      hasMoreTableToDelete = true;
      const deleteTasks = [];
      tablesToDelete.forEach((tableName) => {
        deleteTasks.push(async () => {
          console.log(tableName);
          await executeDelete(client, tableName, yesFlag);
        });
      });
      await sequential(deleteTasks);
    }
  }
  return hasMoreTableToDelete;
}

async function executeDelete(client, tableName, confirmed) {
  if (!confirmed) {
    const deleteTableConfirmation = {
      type: 'confirm',
      name: 'confirmeDelete',
      message: `Delete ${tableName}`,
      default: false,
    };
    const answer = await inquirer.prompt(deleteTableConfirmation);
    confirmed = answer.confirmeDelete;
  }

  if (confirmed) {
    try {
      console.log(`Deleting ${tableName}...`);
      await deleteDynamoDBTable(client, tableName);
      console.log(`DynamoDB Table ${tableName} is deleted.`);
    } catch (e) {
      console.log(chalk.red(`Failed to delete ${tableName}`));
      console.log(e);
    }
  }
}

async function deleteDynamoDBTable(client, tableName) {
  await client.deleteTable({ TableName: tableName }).promise();
}

module.exports = {
  run,
};
