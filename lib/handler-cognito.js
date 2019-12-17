const inquirer = require('inquirer');
const chalk = require('chalk');
const sequential = require('promise-sequential');
const configurationManager = require('./configuration-manager');

const maxResults = '25'; // max is 29

async function run(yesFlag) {
  const awsClient = await configurationManager.getConfiguredAwsClient(true);
  await runUserPools(yesFlag, awsClient);
  await runIdPools(yesFlag, awsClient);
}


/////////////////////////User Pools/////////////////
async function runUserPools(yesFlag, awsClient) {
    const client = new awsClient.CognitoIdentityServiceProvider();
    let token;
    do {
      token = await PaginatedRunUserPools(client, yesFlag, token);
    } while (token);
  }
  
  async function PaginatedRunUserPools(client, yesFlag, token) {
    const listUserPoolsResult = await client.listUserPools({
      MaxResults: maxResults,
      NextToken: token,
    }).promise();
  
    const deleteTasks = [];
    listUserPoolsResult.UserPools.forEach((userPool) => {
      deleteTasks.push(async () => {
        await executeDeleteUserPool(client, userPool, yesFlag);
      });
    });
    await sequential(deleteTasks);
  
    return listUserPoolsResult.nextToken;
  }
  
  async function executeDeleteUserPool(client, userPool, confirmed) {
    if (!confirmed) {
      const deleteUserPoolConfirmation = {
        type: 'confirm',
        name: 'confirmeDelete',
        message: `Delete ${userPool.Id} / ${userPool.Name}`,
        default: false,
      };
      const answer = await inquirer.prompt(deleteUserPoolConfirmation);
      confirmed = answer.confirmeDelete;
    }
  
    if (confirmed) {
      try {
        console.log(`Deleting User Pool: ${userPool.Name} / ${userPool.Id} ...`);
        await client.deleteUserPool({
            UserPoolId: userPool.Id,
        }).promise();
        console.log(`Cognito User Pool ${userPool.Name} / ${userPool.Id} is deleted.`);
      } catch (e) {
        console.log(chalk.red(`Failed to delete ${userPool.Name} / ${userPool.Id}`));
        console.log(e);
      }
    }
  }

/////////////////////////Identity Pools/////////////////
async function runIdPools(yesFlag, awsClient) {
  const client = new awsClient.CognitoIdentity();
  let token;
  do {
    token = await PaginatedRunIdPools(client, yesFlag, token);
  } while (token);
}

async function PaginatedRunIdPools(client, yesFlag, token) {
  const listIdPoolsResult = await client.listIdentityPools({
    MaxResults: maxResults,
    NextToken: token,
  }).promise();

  const deleteTasks = [];
  listIdPoolsResult.IdentityPools.forEach((idPool) => {
    deleteTasks.push(async () => {
      await executeDeleteIdPool(client, idPool, yesFlag);
    });
  });
  await sequential(deleteTasks);

  return listIdPoolsResult.nextToken;
}

async function executeDeleteIdPool(client, idPool, confirmed) {
  if (!confirmed) {
    const deleteIdPoolConfirmation = {
      type: 'confirm',
      name: 'confirmeDelete',
      message: `Delete ${idPool.IdentityPoolName} / ${idPool.IdentityPoolId}`,
      default: false,
    };
    const answer = await inquirer.prompt(deleteIdPoolConfirmation);
    confirmed = answer.confirmeDelete;
  }

  if (confirmed) {
    try {
      console.log(`Deleting Identity Pool ${idPool.IdentityPoolName} / ${idPool.IdentityPoolId} ...`);
      await client.deleteIdentityPool({
        IdentityPoolId: idPool.IdentityPoolId,
      }).promise();
      console.log(`Cognito Identity Pool ${idPool.IdentityPoolName} / ${idPool.IdentityPoolId} is deleted.`);
    } catch (e) {
      console.log(chalk.red(`Failed to delete ${idPool.IdentityPoolName} / ${idPool.IdentityPoolId}`));
      console.log(e);
    }
  }
}

module.exports = {
  run,
};
