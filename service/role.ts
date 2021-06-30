import { Construct } from 'constructs';
import { aws_iam as iam } from 'aws-cdk-lib';

import * as NameSet from '../model/nameset';

/* Create role to execute lambda */
export function createRoleForLambda(scope: Construct, name: string): iam.IRole {
  try {
    // // Set the iam role properties
    // const props = {
    //   assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    //   description: 'Role to execute lambda generated by privacyDAM',
    //   managedPolicies: [
    //     iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
    //     iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
    //     iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess')
    //   ],
    //   roleName: NameSet.ROLE_LAMBDA
    // };

    // // Create iam role and return created role
    // return new iam.Role(scope, NameSet.ROLE_LAMBDA, props);

    return new iam.Role(scope, name, {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role to execute lambda generated by privacyDAM',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaSQSQueueExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSQSFullAccess')
      ],
      roleName: name
    });
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

/* Create role for ec2 */
export function createRoleForEC2(scope: Construct, name: string): iam.IRole {
  try {
    // Set the iam role properties
    const props = {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'Role for ec2 generated by privacyDAM',
      roleName: name
    };

    // Create iam role and return created role
    return new iam.Role(scope, name, props);
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
        iam.ManagedPolicy.fromAwsManagedPolicyName('aws-service-role/APIGatewayServiceRolePolicy'),
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

/* Create role for ecs execution */
export function createRoleForECS(scope: Construct, name: string): iam.IRole {
  try {
    return new iam.Role(scope, name, {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Role for ecs generated by privacyDAM',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
      roleName: name
    });
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

/* Create role for ecs task */
export function createRoleForECSTask(scope: Construct, name: string): iam.IRole {
  try {
    return new iam.Role(scope, name, {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Role for ecs task generated by privacyDAM',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSQSFullAccess'),
      ],
      roleName: name,
    });
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}
