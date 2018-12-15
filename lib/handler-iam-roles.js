const inquirer = require('inquirer');
const sequential = require('promise-sequential');
const configurationManager = require('./configuration-manager');

async function deleteRole(role) {
  const deleteConfirmation = {
    type: 'confirm',
    name: 'confirmeDelete',
    message: `Delete IAM role ${role.Name}`,
    default: true,
  };
  const answer = await inquirer.prompt(deleteConfirmation);
  if (answer.confirmeDelete) {
    const awsClient = await configurationManager.getConfiguredAwsClient();
    const client = new awsClient.IAM();
    await detachPolicies(client, role);
    await executeDeleteRole(client, role);
  }
}

async function executeDeleteRole(client, role) {
  await client.deleteRole({ RoleName: role.Name }).promise();
  console.log(`IAM role deleted: ${role.Name}`);
}

async function detachPolicies(client, role) {
  const response = await client.listAttachedRolePolicies({ RoleName: role.Name }).promise();
  if (response.AttachedPolicies && response.AttachedPolicies.length > 0) {
    const detachPoliciesTasks = [];
    const deletePoliciesTasks = [];
    response.AttachedPolicies.forEach((policy) => {
      detachPoliciesTasks.push(async () => {
        await client.detachRolePolicy({
          RoleName: role.Name,
          PolicyArn: policy.PolicyArn,
        }).promise();
      });
      deletePoliciesTasks.push(async () => {
        await deletePolicy(client, policy); 
      }); 
    });
    await sequential(detachPoliciesTasks);
    await sequential(deletePoliciesTasks);
  }
}

async function deletePolicy(client, policy) {
  const deleteConfirmation = {
    type: 'confirm',
    name: 'confirmeDelete',
    message: `Delete IAM policy ${policy.PolicyName}`,
    default: true,
  };
  const answer = await inquirer.prompt(deleteConfirmation);
  if (answer.confirmeDelete) {
    await client.deletePolicy({
      PolicyArn: policy.PolicyArn,
    }).promise();
  }
}

module.exports = {
  deleteRole
};
