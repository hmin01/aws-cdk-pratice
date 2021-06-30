import { Construct } from 'constructs';
import { aws_sqs as sqs, Duration } from 'aws-cdk-lib';

export function createQueue(scope: Construct, name: string): sqs.Queue {
  try {
    // Create sqs
    return new sqs.Queue(scope, name, {
      contentBasedDeduplication: true,
      fifo: true,
      queueName: name,
      retentionPeriod: Duration.days(1),
      visibilityTimeout: Duration.minutes(1)
    });
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}