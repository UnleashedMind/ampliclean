const inquirer = require('inquirer');
const chalk = require('chalk');
const sequential = require('promise-sequential');
const configurationManager = require('./configuration-manager');

async function run(yesFlag) {
  const awsClient = await configurationManager.getConfiguredAwsClient(true);
  const client = new awsClient.S3();

  const response = await client.listBuckets().promise();
  const deleteTasks = [];

  response.Buckets.forEach((bucket) => {
    deleteTasks.push(async () => {
      await executeDelete(client, bucket, yesFlag);
    });
  });
  await sequential(deleteTasks);
}

async function executeDelete(client, bucket, confirmed) {
  if (!confirmed) {
    const deleteBucketConfirmation = {
      type: 'confirm',
      name: 'confirmeDelete',
      message: `Delete ${bucket.Name}`,
      default: false,
    };
    const answer = await inquirer.prompt(deleteBucketConfirmation);
    confirmed = answer.confirmeDelete;
  }

  if (confirmed) {
    try {
      console.log(`Deleting ${bucket.Name}...`);
      await deleteBucket(client, bucket);
      console.log(`Bucket ${bucket.Name} is deleted.`);
    } catch (e) {
      console.log(chalk.red(`Failed to delete ${bucket.Name}`));
      console.log(e);
    }
  }
}

async function deleteBucket(client, bucket) {
  const response = await client.listObjects({ Bucket: bucket.Name }).promise();
  const deleteObjectTasks = [];
  response.Contents.forEach((object) => {
    deleteObjectTasks.push(async () => {
      await deleteObject(client, bucket, object);
    });
  });
  await sequential(deleteObjectTasks);
  await client.deleteBucket({ Bucket: bucket.Name }).promise();
}

async function deleteObject(client, bucket, object) {
  await client.deleteObject({
    Bucket: bucket.Name,
    Key: object.Key,
  }).promise();
}

module.exports = {
  run,
};
