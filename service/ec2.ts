import { readFileSync } from 'fs';
import { join } from 'path';

import { Construct } from 'constructs';
import { aws_ec2 as ec2, aws_elasticloadbalancingv2 as elbv2, aws_iam as iam } from 'aws-cdk-lib';

export const EC2 = {
  getMachineImage: function(imageName: string, owner: string) {
    try {
      return ec2.MachineImage.lookup({
        name: imageName,
        owners: [owner]
      });
    } catch (err) {
      console.error(err);
      process.exit(0);
    }
  },
  createInstance: function(scope: Construct, vpc: ec2.IVpc, subnets: ec2.ISubnet[], role: iam.IRole, ami: ec2.IMachineImage, securityGroup: ec2.ISecurityGroup, instanceKey: string, name: string) {
    try {
      return new ec2.Instance(scope, name, {
        instanceName: name,
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
        machineImage: ami,
        role: role,
        securityGroup: securityGroup,
        userData: loadUserData(),
        vpc: vpc,
        vpcSubnets: { subnets }
      });
    } catch (err) {
      console.error(err);
      process.exit(0);
    }
  },
  setSecurityGroup: function(instance: ec2.Instance, securityGroup: ec2.ISecurityGroup) {
    instance.addSecurityGroup(securityGroup);
  }
};

function loadUserData(): ec2.UserData {
  // Load user data (basic option)
  const cloudInitOption = readFileSync(join(__dirname, '../config/userdata-cloud-init.txt'));
  // Load user data
  const data = readFileSync(join(__dirname, '../config/userdata.txt'));

  // Combine user data
  const userData = Buffer.concat([cloudInitOption, data]);
  // Create user data
  return ec2.UserData.custom(userData.toString());
}

export const SecurityGroup = {
  management: function(scope: Construct, vpc: ec2.IVpc, name: string): ec2.ISecurityGroup {
    // Create security group
    const securityGroup = createSecurityGroup(scope, vpc, name);
    // Set specific port to allow inbound tracffic
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH access from internet [using privacyDAM]');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3306), 'Allow Mysql(port 3306) access from internet [using privacyDAM]');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(4000), 'Allow TCP(port 4000) access from internet [using privacyDAM]');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(4001), 'Allow TCP(port 4001) access from internet [using privacyDAM]');
    // Return
    return securityGroup;
  },
  processApi: function(scope: Construct, vpc: ec2.IVpc, name: string): ec2.ISecurityGroup {
    // Create security group
    const securityGroup = createSecurityGroup(scope, vpc, name);
    // Set specific port to allow inbound tracffic
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(4000), 'Allow TCP(port 4000) access from outside [Using privacyDAM]');
    // Return
    return securityGroup;
  },
  privateGroup: function(scope: Construct, vpc: ec2.IVpc, name: string): ec2.ISecurityGroup {
    // Create security group
    const securityGroup = createSecurityGroup(scope, vpc, name);
    // Set specific port to allow inbound tracffic
    securityGroup.addIngressRule(securityGroup, ec2.Port.allTcp(), 'For communication in private [using privacyDAM]');
    // Return
    return securityGroup;
  }
};

function createSecurityGroup(scope: Construct, vpc: ec2.IVpc, name: string) {
  return new ec2.SecurityGroup(scope, name, {
    allowAllOutbound: true,
    securityGroupName: name,
    vpc: vpc
  });
}

export const ElasticLoadBalancer = {
  createNLB: function(scope: Construct, vpc: ec2.IVpc, subnets: ec2.ISubnet[], name: string): elbv2.NetworkLoadBalancer {
    try {
      // Create a network load balancer
      return new elbv2.NetworkLoadBalancer(scope, name, { 
        loadBalancerName: name,
        internetFacing: true,
        vpc: vpc,
        vpcSubnets: { subnets }
      });
    } catch (err) {
      console.error(err);
      process.exit(0);
    }
  },
  createTargetGroup: function(scope: Construct, vpc: ec2.IVpc, name: string): elbv2.NetworkTargetGroup {
    try {
      return new elbv2.NetworkTargetGroup(scope, name, {
        port: 4000,
        protocol: elbv2.Protocol.TCP,
        targetGroupName: name,
        targetType: elbv2.TargetType.IP,
        vpc: vpc
      });
    } catch (err) {
      console.error(err);
      process.exit(0);
    }
  },
  setListener: function (nlb: elbv2.NetworkLoadBalancer, targetGroup: elbv2.NetworkTargetGroup, name: string) {
    try {
      // Create listener
      const listener = nlb.addListener(name, {
        port: 4000,
        protocol: elbv2.Protocol.TCP
      });
      // Set target group
      const listenerTargetName = name + '-targets';
      listener.addTargetGroups(listenerTargetName, targetGroup);
    } catch (err) {
      console.error(err);
      process.exit(0);
    }
  }
};