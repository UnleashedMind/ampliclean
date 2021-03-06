const os = require('os');
const path = require('path');
const constants = require('./constants');

function getDotDirPath() {
  return path.join(os.homedir(), constants.DotDirName);
}
function getConfigFilePath() {
  return path.join(getDotDirPath(), constants.ConfigFileName);
}

function getConfigInfoFilePath() {
  return path.join(getDotDirPath(), constants.ConfigInfoFileName);
}

module.exports = {
  getDotDirPath,
  getConfigFilePath,
  getConfigInfoFilePath,
};
