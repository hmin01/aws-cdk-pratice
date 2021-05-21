import { Construct } from 'constructs';
import { aws_iam as iam } from 'aws-cdk-lib';

import * as NameSet from '../model/nameset';

/* Create role to execute lambda */
export function createLambdaRole(scope: Construct): iam.IRole {
  try {
    // Set the iam role properties
    const props = {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role to execute lambda generated by privacyDAM',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
      ],
      path: '/',
      roleName: NameSet.ROLE_LAMBDA
    };

    // Create iam role and return created role
    return new iam.Role(scope, NameSet.ROLE_LAMBDA, props);
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

/* Create role for ec2 */
export function createEC2InstanceRole(scope: Construct): iam.IRole {
  try {
    // Set the iam role properties
    const props = {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      roleName: NameSet.ROLE_EC2
    };

    // Create iam role and return created role
    return new iam.Role(scope, NameSet.ROLE_EC2, props);
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

/* Create role for apigateway */
export function createApiGatewayRole(scope: Construct): iam.IRole {
  try {
    // Set the iam role properties
    const props = {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      description: 'Role for apigateway generated by privacyDAM',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonAPIGatewayPushToCloudWatchLogs')
      ],
      roleName: NameSet.ROLE_APIGATEWAY
    };

    // Create iam role and return created role
    return new iam.Role(scope, NameSet.ROLE_APIGATEWAY, props);
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}
