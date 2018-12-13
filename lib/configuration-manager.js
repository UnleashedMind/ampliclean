const aws = require('aws-sdk');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const pathManager = require('./path-manager');
const awsRegions = require('./aws-regions');
const constants = require('./constants');
const systemConfigManager = require('./system-config-manager');
const obfuscateUtil = require('./utility-obfuscate');

function getConfiguredAwsClient(promptRegion) {
  if (promptRegion) {
    return aws;
  }
  return aws;
}

async function configure() {
  const configLevels = [constants.General, constants.Tag];

  let configInfo = readConfigInfo() || {};
  if (configInfo.configLevel !== constants.General) {
    configInfo.configLevel = constants.Tag;
  }

  const configLevelPrompt = {
    type: 'input',
    name: 'configLevel',
    message: 'Config Level',
    choices: configLevels,
    default: configInfo.configLevel,
  };

  const answers = await inquirer.prompt(configLevelPrompt);
  if (answers.configLevel === constants.General) {
    configInfo = { configLevel: constants.General };
    writeConfigInfo(configInfo);
    writeConfig(undefined);
  } else {
    configInfo.configLevel = constants.Tag;
    const config = await configureSpecs(configInfo);
    writeConfigInfo(configInfo);
    writeConfig(config);
  }
}

async function configureSpecs(configInfo) {
  let config;

  let availableProfiles = [];
  const systemConfig = systemConfigManager.getFullConfig();
  if (systemConfig) {
    availableProfiles = Object.keys(systemConfig);
  }

  const useProfileConfirmation = {
    type: 'confirm',
    name: 'useProfile',
    message: 'Do you want to use an AWS profile?',
    default: configInfo.useProfile,
  };

  const profileName = {
    type: 'list',
    name: 'profileName',
    message: 'Please choose the profile you want to use',
    choices: availableProfiles,
    default: configInfo.profileName,
  };

  let answers;

  if (availableProfiles && availableProfiles.length > 0) {
    answers = await inquirer.prompt(useProfileConfirmation);
    configInfo.useProfile = answers.useProfile;
    if (answers.useProfile) {
      answers = await inquirer.prompt(profileName);
      configInfo.profileName = answers.profileName;
    }
  } else {
    configInfo.useProfile = false;
  }

  if (!configInfo.useProfile) {
    config = readConfig();
    const configurationSettings = [
      {
        type: 'input',
        name: 'accessKeyId',
        message: 'accessKeyId: ',
        default: config.accessKeyId
          ? obfuscateUtil.obfuscate(config.accessKeyId)
          : constants.DefaultAWSAccessKeyId,
        transformer: obfuscateUtil.transform,
      },
      {
        type: 'input',
        name: 'secretAccessKey',
        message: 'secretAccessKey: ',
        default: config.secretAccessKey
          ? obfuscateUtil.obfuscate(config.secretAccessKey)
          : constants.DefaultAWSSecretAccessKey,
        transformer: obfuscateUtil.transform,
      },
      {
        type: 'list',
        name: 'region',
        message: 'region: ',
        choices: awsRegions.regions,
        default: config.region
          ? config.region : constants.DefaultAWSRegion,
      },
    ];

    answers = await inquirer.prompt(configurationSettings);
    if (!obfuscateUtil.isObfuscated(answers.accessKeyId)) {
      config.accessKeyId = answers.accessKeyId;
    }
    if (!obfuscateUtil.isObfuscated(answers.secretAccessKey)) {
      config.secretAccessKey = answers.secretAccessKey;
    }
    config.region = answers.region;
  }

  return config;
}

function readConfigInfo() {
  let configInfo;
  const configInfoFilePath = pathManager.getConfigInfoFilePath();
  if (fs.existsSync(configInfoFilePath)) {
    configInfo = require(configInfoFilePath);
  }
  return configInfo;
}

function writeConfigInfo(configInfo) {
  const configInfoFilePath = pathManager.getConfigInfoFilePath();
  if (configInfo) {
    const jsonString = JSON.stringify(configInfo, null, 4);
    fs.writeFileSync(configInfoFilePath, jsonString, 'utf8');
  } else {
    fs.removeSync(configInfoFilePath);
  }
}

function readConfig() {
  let config;
  const configFilePath = pathManager.getConfigFilePath();
  if (fs.existsSync(configFilePath)) {
    config = require(configFilePath);
  }
  return config;
}

function writeConfig(config) {
  const configFilePath = pathManager.getConfigFilePath();
  if (config) {
    const jsonString = JSON.stringify(config, null, 4);
    fs.writeFileSync(configFilePath, jsonString, 'utf8');
  } else {
    fs.removeSync(configFilePath);
  }
}

module.exports = {
  getConfiguredAwsClient,
  configure,
};
