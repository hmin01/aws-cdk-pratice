import * as cdk from 'aws-cdk-lib';
import * as AwsCdkPractice from '../lib/aws-cdk-practice-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new AwsCdkPractice.AwsCdkPracticeStack(app, 'MyTestStack');
    // THEN
    const actual = app.synth().getStackArtifact(stack.artifactId).template;
    expect(actual.Resources ?? {}).toEqual({});
});
