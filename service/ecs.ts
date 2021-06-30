import { Construct } from 'constructs';
import { aws_ec2 as ec2, aws_ecs as ecs, aws_ecr as ecr, aws_iam as iam } from 'aws-cdk-lib';
import { aws_elasticloadbalancingv2 as elbv2 } from 'aws-cdk-lib';

import { Names } from '../model/nameset';

// Create an ECS cluster
export function createCluster(scope: Construct, vpc: ec2.IVpc): ecs.Cluster {
  const cluster = new ecs.Cluster(scope, Names.ECS.CLUSTER, {
    clusterName: Names.ECS.CLUSTER,
    vpc: vpc
  });
  // Set cluster options
  // Return
  return cluster;
}

export function getContainerImageFromECR(scope: Construct, repositoryArn: string, imageVersion: string, name: string): ecs.ContainerImage {
  try {
    // Get AWS ECR repository using repository arn
    const repository = ecr.Repository.fromRepositoryArn(scope, name, repositoryArn);
    // Get AWS ECS container image
    return ecs.ContainerImage.fromEcrRepository(repository, imageVersion);
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

// Create an Amazon ECS task definition
export function createFargateTaskDefinition(scope: Construct, config: any, image: ecs.ContainerImage, executionRole: iam.IRole|undefined, taskRole: iam.IRole|undefined, name: string): ecs.FargateTaskDefinition {
  // Create a task definition
  const taskDefinition = new ecs.FargateTaskDefinition(scope, name, {
    cpu: config.cpu,
    executionRole: executionRole,
    family: name,
    memoryLimitMiB: config.memory,
    taskRole: taskRole,
  });

  // Set container
  taskDefinition.addContainer(Names.ECS.CONTAINER, {
    containerName: Names.ECS.CONTAINER,
    image: image,
    environment: config.environment,
    logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'ecs' }),
    portMappings: config.portMappings,
  });
  // Return
  return taskDefinition;
}

// Create an Amazon ECS service
export function createEcsService(scope: Construct, cluster: ecs.Cluster, subnets: ec2.ISubnet[], securityGroups: ec2.ISecurityGroup[], taskDefinition: ecs.FargateTaskDefinition, name: string) {
  try {
    const service = new ecs.FargateService(scope, name, {
      assignPublicIp: false,
      circuitBreaker: { rollback: true },
      cluster: cluster,
      desiredCount: 1,
      maxHealthyPercent: 200,
      minHealthyPercent: 100,
      serviceName: name,
      securityGroups: securityGroups,
      taskDefinition: taskDefinition,
      vpcSubnets: { subnets },
    });

    // Return
    return service;
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

export function setListener(nlb: elbv2.NetworkLoadBalancer, service: ecs.FargateService, listenerName: string, targetGroupName: string, port: number) {
  try {
    // Create listener
    const listener = nlb.addListener(listenerName, { port: port });
    // Add target
    const listenerTargetName = listenerName + '-targets';
    listener.addTargets(listenerTargetName, {
      port: 4000,
      targetGroupName: targetGroupName,
      targets: [service]
    });
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

export function setEnvironmentVarious(key: string, value: string) {
  try {
    
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}