const inquirer = require('inquirer');
const sequential = require('promise-sequential');
const configurationManager = require('./configuration-manager');

async function getIamClient(awsClient){
  awsClient = awsClient || await configurationManager.getConfiguredAwsClient();
  return new awsClient.IAM();
}

async function deleteRole(role, client) {
  let attatchedPolicies; 
  const deleteConfirmation = {
    type: 'confirm',
    name: 'confirmeDelete',
    message: `Delete IAM role ${role.Name}`,
    default: true,
  };
  // const answer = await inquirer.prompt(deleteConfirmation);
  if (true){//answer.confirmeDelete) {
    client = client || getIamClient(); 
    attatchedPolicies = await detachPolicies(role, client);
    await executeDeleteRole(role, client);
  }
  return attatchedPolicies; 
}


async function executeDeleteRole(role, client) {
  await client.deleteRole({ RoleName: role.Name }).promise();
  console.log(`IAM role deleted: ${role.Name}`);
}

async function detachPolicies(role, client) {
  const response = await client.listAttachedRolePolicies({ RoleName: role.Name }).promise();
  if (response.AttachedPolicies && response.AttachedPolicies.length > 0) {
    const detachPoliciesTasks = [];
    response.AttachedPolicies.forEach((policy) => {
      detachPoliciesTasks.push(async () => {
        await client.detachRolePolicy({
          RoleName: role.Name,
          PolicyArn: policy.PolicyArn,
        }).promise();
      });
    });
    await sequential(detachPoliciesTasks);
  }
  return response.AttachedPolicies;
}

async function deletePolicy(policy, client) {
  const deleteConfirmation = {
    type: 'confirm',
    name: 'confirmeDelete',
    message: `Delete IAM policy ${policy.PolicyName}`,
    default: true,
  };
  // const answer = await inquirer.prompt(deleteConfirmation);
  if (true){//answer.confirmeDelete) {
    client = client || getIamClient(); 
    await client.deletePolicy({
      PolicyArn: policy.PolicyArn,
    }).promise();
  }
}

module.exports = {
  getIamClient,
  deleteRole,
  deletePolicy
};
