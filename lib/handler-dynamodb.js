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
  if(response.TableNames && response.TableNames.length>0){
    const activeTablesCheckTasks = []; 
    const deleteTasks = [];

    response.TableNames.forEach((tableName) => {
      activeTablesCheckTasks.push(async () => {
        const describeTableResponse = await client.describeTable({ TableName: tableName }).promise();
        if(describeTableResponse.Table.TableStatus !== "Deleting"){
          deleteTasks.push(async () => {
            await executeDelete(client, tableName, yesFlag);
          }); 
        }
      });
    });
    await sequential(activeTablesCheckTasks);
    console.log(deleteTasks.length); 

    if(deleteTasks.length > 0){
      await sequential(deleteTasks);
      hasMoreTableToDelete = true; 
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
