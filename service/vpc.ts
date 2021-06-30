import { Construct } from 'constructs';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';

import { Names } from '../model/nameset';

export function getDefaultVPC(scope: Construct, name: string): ec2.IVpc {
  try {
    return ec2.Vpc.fromLookup(scope, name, {
      vpcId: 'vpc-9eb904f5'
    });
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

export function getSubnetById(vpc: ec2.IVpc, id: string): ec2.ISubnet|undefined {
  try {
    // Find a subnet in public subnets
    for (const subnet of vpc.publicSubnets) {
      if (subnet.subnetId == id) {
        return subnet;
      }
    }
    // Find a subnet in public subnets
    for (const subnet of vpc.privateSubnets) {
      if (subnet.subnetId == id) {
        return subnet;
      }
    }
    // Find a subnet in public subnets
    for (const subnet of vpc.isolatedSubnets) {
      if (subnet.subnetId == id) {
        return subnet;
      }
    }
    return undefined;
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

export function createEndpoints(vpc: ec2.IVpc, subnets: ec2.ISubnet[], securityGroups: ec2.ISecurityGroup[]) {
  try {
    // Create endpoint for AWS ECR (api)
    vpc.addInterfaceEndpoint(Names.VPC.ENDPOINT.ECR_API, {
      privateDnsEnabled: true,
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      securityGroups: securityGroups,
      subnets: { subnets }
    });

    // Create endpoint for AWS ECR (dkr)
    vpc.addInterfaceEndpoint(Names.VPC.ENDPOINT.ECR_DKR, {
      privateDnsEnabled: true,
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      securityGroups: securityGroups,
      subnets: { subnets }
    });

    // Create endpoint for AWS CloudWatch
    vpc.addInterfaceEndpoint(Names.VPC.ENDPOINT.LOGS, {
      privateDnsEnabled: true,
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      securityGroups: securityGroups,
      subnets: { subnets }
    });

    // Create endpoint for AWS SQS
    vpc.addInterfaceEndpoint(Names.VPC.ENDPOINT.SQS, {
      privateDnsEnabled: true,
      service: ec2.InterfaceVpcEndpointAwsService.SQS,
      securityGroups: securityGroups,
      subnets: { subnets }
    });

    // Create endpoint for AWS CloudWatch
    vpc.addGatewayEndpoint(Names.VPC.ENDPOINT.S3, {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [{ subnets: subnets }]
    });
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}