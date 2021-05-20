import { Construct } from 'constructs';
import { Stack, StackProps, Duration, CfnOutput, Token } from 'aws-cdk-lib';
import { aws_iam as iam, aws_ec2 as ec2, aws_lambda as lambda, aws_apigateway as apigateway } from 'aws-cdk-lib';

import * as NameSet from '../model/nameset';
import * as AwsRole from '../util/role';

import * as fs from 'fs';
import * as path from 'path';

export class AwsCdkPracticeStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create ec2 instance
    const instance = createEC2Instance(this);
    // // Create eip and associate with instance
    // const eip = createElasticIpAddress(this, instance);
    
    // Load a lambda config data
    const file = fs.readFileSync(path.join(__dirname, '../config/lambda-setting.json'));
    const config = JSON.parse(file.toString());
    // Set lambda environment (OPA host and management server using internal database)
    config.environment.DSN = `privacyDAM_admin:qlalfqjsgh@tcp(${Token.asString(instance.instancePublicIp)}:3306)/privacyDAM`;
    config.environment.OPA = `http://${Token.asString(instance.instancePublicIp)}/authentication/user`;
    // Create Role for lambda function
    const fn = createLambdaFunction(this, config);

    // Create apigateway
    createApiGateway(this, fn);
  }
}

function createLambdaFunction(scope: Construct, config:any): lambda.Function {
  try {
    // Create lambda role
    const role = AwsRole.createLambdaRole(scope);

    // Set the lambda properties
    const props = {
      code: lambda.Code.fromAsset(path.join(__dirname, '../code/main.zip')),
      description: 'Process API generated by privacyDAM',
      environment: config.environment,
      functionName: NameSet.NAME_LAMBDA,
      handler: 'main',
      memorySize: config.memory,
      role: role,
      runtime: lambda.Runtime.GO_1_X,
      timeout: Duration.seconds(config.timeout)
    }

    // Create lambda
    const fn = new lambda.Function(scope, NameSet.NAME_LAMBDA, props);
    console.log('[Notice] Create an aws lambda function');
    return fn;
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

function createApiGateway(scope: Construct, fn: lambda.Function) {
  // Set the api gateway properties
  const props = {
    description: 'REST API router to process request_api generated by privacyDAM',
    deployOptions: {
      loggingLevel: apigateway.MethodLoggingLevel.INFO
    },
    restApiName: NameSet.NAME_APIGATEWAY
  };
  // Create api gateway
  const api = new apigateway.RestApi(scope, NameSet.NAME_APIGATEWAY, props);

  // Defining APIs
  const mainRouter = api.root.addResource('process');
  const processRouter = mainRouter.addResource('{name}');

  // Create integration and set method
  const integration = new apigateway.LambdaIntegration(fn)
  processRouter.addMethod('GET', integration);
}

function createEC2Instance(scope: Construct): ec2.Instance {
  try {
    // Get the default VPC. This is the network where your instance will be provisioned
    // All activated region in AWS have a default VPC.
    const defaultVpc = ec2.Vpc.fromLookup(scope, 'VPC', { isDefault: true });
    // Get the subnet
    const subnet = defaultVpc.publicSubnets[0];

    // Create a role for the instance
    const role = AwsRole.createEC2InstanceRole(scope);

    // Create a security group for the instance
    const securityGroup = createEC2SecurityGroup(scope, defaultVpc);

    // Set the AMI properties
    const amiProps = {
      name: 'privacyDAM-managementServer-v1.1',
      owners: ['395824177941'],
    };
    // Set the ec2 instance properties
    const instanceProps = {
      vpc: defaultVpc,
      role: role,
      securityGroup: securityGroup,
      instanceName: NameSet.NAME_EC2,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.lookup(amiProps),
      keyName: 'tov_hmin',
      userData: loadUserData(),
      vpcSubnets: {
        subnets: [subnet]
      }
    };
    // Finally elts provision our ec2 instance
    const instance = new ec2.Instance(scope, NameSet.NAME_EC2, instanceProps);
    
    // Set security group for connect related database
    const securityGroupForPrivacyDAM = createEC2SecurityGroupToConnection(scope, defaultVpc);
    instance.addSecurityGroup(securityGroupForPrivacyDAM);
    // Create security group for external database to allow access from privacyDAM
    createEC2SecurityGroupToAllow(scope, defaultVpc, securityGroupForPrivacyDAM);

    console.log('[Notice] Create an aws ec2 instance');
    return instance;
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

function createEC2SecurityGroupToConnection(scope: Construct, vpc: ec2.IVpc): ec2.SecurityGroup {
  // Set the security group properties
  const props = {
    vpc: vpc,
    allowAllOutbound: true,
    securityGroupName: NameSet.NAME_EC2_SECURITY_GROUP_TO_CONN
  };

  try {
    // Create basic security group
    const securityGroup = new ec2.SecurityGroup(scope, NameSet.NAME_EC2_SECURITY_GROUP_TO_CONN, props);
    // Return
    return securityGroup;
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

function createEC2SecurityGroupToAllow(scope: Construct, vpc: ec2.IVpc, incomingSecurityGroup: ec2.SecurityGroup): ec2.SecurityGroup {
  // Set the security group properties
  const props = {
    vpc: vpc,
    allowAllOutbound: true,
    securityGroupName: NameSet.NAME_EC2_SECURITY_GROUP_TO_ALLOW
  };

  try {
    // Create basic security group
    const securityGroup = new ec2.SecurityGroup(scope, NameSet.NAME_EC2_SECURITY_GROUP_TO_ALLOW, props);
    // Set spectific port to allow inbound traffic
    securityGroup.addIngressRule(incomingSecurityGroup, ec2.Port.tcp(3306), 'Allow Mysql(port) access from PrivacyDAM');
    // Return
    return securityGroup;
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

function createEC2SecurityGroup(scope: Construct, vpc: ec2.IVpc): ec2.SecurityGroup {
  // Set the security group properties
  const props = {
    vpc: vpc,
    allowAllOutbound: true,
    securityGroupName: NameSet.NAME_EC2_SECURITY_GROUP_BASIC
  };

  try {
    // Create basic security group
    const securityGroup = new ec2.SecurityGroup(scope, NameSet.NAME_EC2_SECURITY_GROUP_BASIC, props);
    // Set spectific port to allow inbound traffic
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH access from internet [using privacyDAM]');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3306), 'Allow Mysql(port 3306) access from internet [using privacyDAM]');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(4000), 'Allow TCP(port 4000) access from internet [using privacyDAM]');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(4001), 'Allow TCP(port 4001) access from internet [using privacyDAM]');
    // Return
    return securityGroup;
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

function createElasticIpAddress(scope: Construct, instance: ec2.Instance): ec2.CfnEIP {
  try {
    // Set the elastic ip properties
    const eipProps = {
      tags: [{key: 'Name', value: NameSet.NAME_EC2_EIP}]
    };
    // Create elastic ip address
    const eip = new ec2.CfnEIP(scope, NameSet.NAME_EC2_EIP, eipProps);

    // Set the association properties
    const associationProps = {
      associationId: NameSet.NAME_EC2_EIP_AS,
      eip: eip.ref,
      instanceId: instance.instanceId
    };
    // associate elastic ip
    const as = new ec2.CfnEIPAssociation(scope, NameSet.NAME_EC2_EIP_AS, associationProps);
    return eip;
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

function loadUserData(): ec2.UserData {
  // Load user data (basic option)
  const cloudInitOption = fs.readFileSync(path.join(__dirname, '../config/userdata-cloud-init'));
  // Load user data
  const data = fs.readFileSync(path.join(__dirname, '../config/userdata.txt'));

  // Conbime user data
  const userData = Buffer.concat([cloudInitOption, data]);
  // Create user data
  return ec2.UserData.custom(userData.toString());
}