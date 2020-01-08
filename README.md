# ampliclean
Command line tool to clean aws resources. <br/>
This command line tool is intended to be only used to clean up resources in aws accounts that are only for dev and test purposes. <br/>
Do NOT use it on production aws account. <br/>
Use at your own risk. 

## Install the CLI
This tool is not published to the npm. 
Clone the repo and run `npm link` to use it. 

## Commands Summary

The current set of commands supported by the ampliclean CLI are

| Command              | Description |
| --- | --- |
| ampliclean amplify | removes all amplify service projects|
| ampliclean cognito | removes all cognito user pools and identity pools|
| ampliclean cloudformation | removes all cloudformation stacks|
| ampliclean dynamodb | removes all dynamodb tables|
| ampliclean lambda | removes all lambda functions|
| ampliclean pinpoint | removes all pinpoint projects|
| ampliclean s3 | removes all s3 buckets|
| ampliclean configure | configures the cli |
| ampliclean help [cmd] | displays help [for cmd] |
