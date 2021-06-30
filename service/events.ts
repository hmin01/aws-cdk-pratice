import { Construct } from 'constructs';
import { aws_lambda as lambda } from 'aws-cdk-lib';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

export function setScheduleForLogBackup(scope: Construct, lambda: lambda.Function, config: any, name: string) {
  try {
    // Create schedule
    const rule = new Rule(scope, name, {
      schedule: Schedule.cron(config),
    });
    // Add event target
    rule.addTarget(new LambdaFunction(lambda));
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}