const fs = require('fs-extra');
const path = require('path');
const configurationManager = require('./configuration-manager');

// const userPoolURL = "https://us-west-2.console.aws.amazon.com/cognito/users/?region=us-west-2#/pool/us-west-2_8sZjEpAw1/users?_k=aikedz";
const uerPoolId = 'us-west-2_P4IyTvvNn';
const appClientId = '74l3voe4t5e6u823p7qckscimg';
// const AuthFlowType = "USER_SRP_AUTH"|"REFRESH_TOKEN_AUTH"|"REFRESH_TOKEN"|"CUSTOM_AUTH"|"ADMIN_NO_SRP_AUTH"|"USER_PASSWORD_AUTH"|"ADMIN_USER_PASSWORD_AUTH"|string;

async function run() {
  const awsClient = await configurationManager.getConfiguredAwsClient(false);
  await runUserPools(awsClient);
}


// ///////////////////////User Pools/////////////////
async function runUserPools(awsClient) {
  const client = new awsClient.CognitoIdentityServiceProvider();
  try {
    const response = await client.adminInitiateAuth({
        UserPoolId: uerPoolId,
        ClientId: appClientId,
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        AuthParameters: {
            USERNAME: 'user1',
            PASSWORD: 'user1Password',
        },
    }).promise();
    console.log('response', response);
    const signInFilePath = path.join(__dirname, 'loginresponse.json');
    fs.writeFileSync(signInFilePath, JSON.stringify(response, null, 4));
  } catch (e) {
      console.log('err', e);
  }
}


// export interface AdminInitiateAuthRequest {
//     /**
//      * The ID of the Amazon Cognito user pool.
//      */
//     UserPoolId: UserPoolIdType;
//     /**
//      * The app client ID.
//      */
//     ClientId: ClientIdType;
//     /**
//      * The authentication flow for this call to execute. The API action will depend on this value. For example:    REFRESH_TOKEN_AUTH will take in a valid refresh token and return new tokens.    USER_SRP_AUTH will take in USERNAME and SRP_A and return the SRP variables to be used for next challenge execution.    USER_PASSWORD_AUTH will take in USERNAME and PASSWORD and return the next challenge or tokens.   Valid values include:    USER_SRP_AUTH: Authentication flow for the Secure Remote Password (SRP) protocol.    REFRESH_TOKEN_AUTH/REFRESH_TOKEN: Authentication flow for refreshing the access token and ID token by supplying a valid refresh token.    CUSTOM_AUTH: Custom authentication flow.    ADMIN_NO_SRP_AUTH: Non-SRP authentication flow; you can pass in the USERNAME and PASSWORD directly if the flow is enabled for calling the app client.    USER_PASSWORD_AUTH: Non-SRP authentication flow; USERNAME and PASSWORD are passed directly. If a user migration Lambda trigger is set, this flow will invoke the user migration Lambda if the USERNAME is not found in the user pool.     ADMIN_USER_PASSWORD_AUTH: Admin-based user password authentication. This replaces the ADMIN_NO_SRP_AUTH authentication flow. In this flow, Cognito receives the password in the request instead of using the SRP process to verify passwords.  
//      */
//     AuthFlow: AuthFlowType;
//     /**
//      * The authentication parameters. These are inputs corresponding to the AuthFlow that you are invoking. The required values depend on the value of AuthFlow:   For USER_SRP_AUTH: USERNAME (required), SRP_A (required), SECRET_HASH (required if the app client is configured with a client secret), DEVICE_KEY    For REFRESH_TOKEN_AUTH/REFRESH_TOKEN: REFRESH_TOKEN (required), SECRET_HASH (required if the app client is configured with a client secret), DEVICE_KEY    For ADMIN_NO_SRP_AUTH: USERNAME (required), SECRET_HASH (if app client is configured with client secret), PASSWORD (required), DEVICE_KEY    For CUSTOM_AUTH: USERNAME (required), SECRET_HASH (if app client is configured with client secret), DEVICE_KEY   
//      */
//     AuthParameters?: AuthParametersType;
//     /**
//      * A map of custom key-value pairs that you can provide as input for certain custom workflows that this action triggers. You create custom workflows by assigning AWS Lambda functions to user pool triggers. When you use the AdminInitiateAuth API action, Amazon Cognito invokes the AWS Lambda functions that are specified for various triggers. The ClientMetadata value is passed as input to the functions for only the following triggers:   Pre signup   Pre authentication   User migration   When Amazon Cognito invokes the functions for these triggers, it passes a JSON payload, which the function receives as input. This payload contains a validationData attribute, which provides the data that you assigned to the ClientMetadata parameter in your AdminInitiateAuth request. In your function code in AWS Lambda, you can process the validationData value to enhance your workflow for your specific needs. When you use the AdminInitiateAuth API action, Amazon Cognito also invokes the functions for the following triggers, but it does not provide the ClientMetadata value as input:   Post authentication   Custom message   Pre token generation   Create auth challenge   Define auth challenge   Verify auth challenge   For more information, see Customizing User Pool Workflows with Lambda Triggers in the Amazon Cognito Developer Guide.  Take the following limitations into consideration when you use the ClientMetadata parameter:   Amazon Cognito does not store the ClientMetadata value. This data is available only to AWS Lambda triggers that are assigned to a user pool to support custom workflows. If your user pool configuration does not include triggers, the ClientMetadata parameter serves no purpose.   Amazon Cognito does not validate the ClientMetadata value.   Amazon Cognito does not encrypt the the ClientMetadata value, so don't use it to provide sensitive information.   
//      */
//     ClientMetadata?: ClientMetadataType;
//     /**
//      * The analytics metadata for collecting Amazon Pinpoint metrics for AdminInitiateAuth calls.
//      */
//     AnalyticsMetadata?: AnalyticsMetadataType;
//     /**
//      * Contextual data such as the user's device fingerprint, IP address, or location used for evaluating the risk of an unexpected event by Amazon Cognito advanced security.
//      */
//     ContextData?: ContextDataType;
//   }

async function setupUser(cognitoClient, userPoolId, username, password, groupName) {
    await cognitoClient
      .adminCreateUser({
        UserPoolId: userPoolId,
        Username: username,
        MessageAction: 'SUPPRESS',
      })
      .promise();

    await cognitoClient
      .adminSetUserPassword({
        UserPoolId: userPoolId,
        Username: username,
        Password: password,
        Permanent: true,
      })
      .promise();

    if (groupName) {
      await cognitoClient
        .adminAddUserToGroup({
          UserPoolId: userPoolId,
          Username: username,
          GroupName: groupName,
        })
        .promise();
    }
}

module.exports = {
  run,
};
