import { Construct } from 'constructs';
import { aws_s3 as s3, aws_lambda as lambda } from 'aws-cdk-lib';

export function createS3Bucket(scope: Construct, name: string): s3.Bucket {
  try {
    // Create sqs
    return new s3.Bucket(scope, name, {
      bucketName: name,
    });
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

export function grantPermissionForLambda(bucket: s3.Bucket, func: lambda.Function) {
  try {
    bucket.grantReadWrite(func);
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}