import { readFileSync } from 'fs';
import { join } from 'path';

import { Construct } from 'constructs';
import { aws_lambda as lambda, aws_iam as iam, Duration } from 'aws-cdk-lib';

export function createLambdaFunction(scope: Construct, config:any, role: iam.IRole, name: string): lambda.Function {
  try {
    return new lambda.Function(scope, name, {
      allowPublicSubnet: true,
      code: lambda.Code.fromAsset(join(__dirname, '../code/archiving.zip')),
      environment: config.environment,
      functionName: name,
      handler: 'main',
      memorySize: config.memory,
      role: role,
      runtime: lambda.Runtime.GO_1_X,
      timeout: Duration.seconds(config.timeout)
    });
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}