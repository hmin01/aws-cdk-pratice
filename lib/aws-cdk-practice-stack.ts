import { Construct } from 'constructs';
import { Stack, StackProps, Token } from 'aws-cdk-lib';
import { aws_ec2 as ec2, aws_ecs as ecs } from 'aws-cdk-lib';

import { Names } from '../model/nameset';
import * as AwsEvents from '../service/events';
import * as AwsRole from '../service/role';
import * as AwsVpc from '../service/vpc';
import { EC2, SecurityGroup, ElasticLoadBalancer } from '../service/ec2';
import * as AwsEcs from '../service/ecs';
import * as AwsLambda from '../service/lambda';
import * as AwsS3 from '../service/s3';
import * as AwsSqs from '../service/sqs';

import { open, readFileSync } from 'fs';
import { join } from 'path';

export class AwsCdkPracticeStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Load config file
    const config = loadConfiguration();

    // Get default AWS VPC
    const vpc = AwsVpc.getDefaultVPC(this, Names.VPC.DEFAULT);
    // Get private subnet
    const privateSubnets = extractSubnet(vpc, config.vpc.privateSubnets);
    // Get public subnet
    const publicSubnets = extractSubnet(vpc, config.vpc.publicSubnets);

    // Create a security groups
    const managementSg = SecurityGroup.management(this, vpc, Names.SG.MANAGEMENT);
    const privateSg = SecurityGroup.privateGroup(this, vpc, Names.SG.PRIVATE_GROUP);
    const processSg = SecurityGroup.processApi(this, vpc, Names.SG.PROCESS_API);

    // Create AWS Endpoints (For AWS ECR, AWS CloudWatch Logs, AWS S3, AWS SQS)
    AwsVpc.createEndpoints(vpc, privateSubnets, [privateSg]);
    // Create AWS SQS (FIFO Queue)
    const sqs = AwsSqs.createQueue(this, Names.SQS);
    // Add queue name in config
    config.sqs = sqs.queueName;
    // Create AWS S3 bucket
    const bucket = AwsS3.createS3Bucket(this, Names.S3);    

    // Get a machine image for EC2
    const instance = createServer(this, vpc, publicSubnets, managementSg, config.ec2);
    // Add instance ip address in config
    config.ec2.ip = Token.asString(instance.instancePrivateIp);
    // Set OPA address
    if (config.opa.uri === "") {
      config.opa.uri = `http://${config.ec2.ip}:4001/authentication/user`;
    }

    // Set lambda environment various
    config.lambda.environment.S3_BUCKET = bucket.bucketName;
    config.lambda.environment.SQS = sqs.queueName;
    // Create AWS IAM role for lambda
    const roleForLambda = AwsRole.createRoleForLambda(this, Names.IAM.LAMBDA);
    // Create AWS Lambda function
    const lambda = AwsLambda.createLambdaFunction(this, config.lambda, roleForLambda, Names.LAMBDA);

    // Set schedule config
    const scheduleConfig = { minute: '5' };
    // Set schedule to bakcup logs
    AwsEvents.setScheduleForLogBackup(this, lambda, scheduleConfig, Names.EVENTS);

    // Create AWS NLB
    const nlb = ElasticLoadBalancer.createNLB(this, vpc, publicSubnets, Names.NLB.LOAD_BALANCER);

    // Create AWS ECS service
    const ecsService = composeECS(this, vpc, privateSubnets, [privateSg, processSg], config);
    // Set listener (for load balancing)
    AwsEcs.setListener(nlb, ecsService, Names.NLB.LISTENER, Names.NLB.TARGETS, 4000);
  }
}

function createServer(scope: Construct, vpc: ec2.IVpc, subnets: ec2.ISubnet[], securityGroup: ec2.ISecurityGroup, config: any): ec2.Instance {
  try {
    // Get a machine image for EC2
    const ami = EC2.getMachineImage(config.image.name, config.image.owner);
    // Create AWS IAM role for EC2
    const roleInstance = AwsRole.createRoleForEC2(scope, Names.IAM.EC2);
    // Create EC2 instance
    const instance = EC2.createInstance(scope, vpc, subnets, roleInstance, ami, securityGroup, config.keyName, Names.EC2.MANAGEMENT);
    // Return
    return instance;
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

function composeECS(scope: Construct, vpc: ec2.IVpc, subnets: ec2.ISubnet[], securityGrops: ec2.ISecurityGroup[], config: any): ecs.FargateService {
  // Create AWS ECS cluster
  const cluster = AwsEcs.createCluster(scope, vpc);
  // Create AWS IAM role for ECS (ecs execution role)
  const ecsRole = AwsRole.createRoleForECS(scope, Names.IAM.ECS);
  // Create AWS IAM role for ECS (task role)
  const taskRole = AwsRole.createRoleForECSTask(scope, Names.IAM.ECS_TASK);
  // Get a container image for ESC
  const image = AwsEcs.getContainerImageFromECR(scope, 'arn:aws:ecr:ap-northeast-2:395824177941:repository/privacydam', 'latest', Names.ECR.REPOSITORY);
  // Set config For ECS
  const definitionConfig = {
    cpu: 512,
    environment: {
      DSN: createDSN(config.ec2.ip),
      OPA: config.opa.uri,
      SQS: config.sqs,
    },
    memory: 1024,
    portMappings: [{containerPort: 4000, hostPort: 4000 }]
  };
  // Create AWS ECS task definition
  const taskDefinition = AwsEcs.createFargateTaskDefinition(scope, definitionConfig, image, ecsRole, taskRole, Names.ECS.TASK_DEFINITION);
  // Create AWS ECS service in created cluster
  return AwsEcs.createEcsService(scope, cluster, subnets, securityGrops, taskDefinition, Names.ECS.SERVICE);
}

function loadConfiguration(): any {
  try {
    // Load database config file
    const file = readFileSync(join(__dirname, '../config/config.json'));
    // Extract database connection data
    return JSON.parse(file.toString());
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

function extractSubnet(vpc:ec2.IVpc, ids: string[]): ec2.ISubnet[] {
  try {
    // Set default array
    const subnets: ec2.ISubnet[] = [];
    // Extract subnet data
    for (const id of ids) {
      const subnet = AwsVpc.getSubnetById(vpc, id);
      if (subnet !== undefined) {
        subnets.push(subnet);
      }
    }
    // Return
    return subnets;
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

function createDSN(host: string): string {
  try {
    // Load database config file
    const file = readFileSync(join(__dirname, '../config/database.config'));
    // Extract database connection data
    const config = JSON.parse(file.toString());

    // Create DSN and return created data
    return `${config["username"]}:${config["password"]}@tcp(${host}:3306)/${config["database"]}`;
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

// function main(scope: Construct) {
//   // Get the default VPC
//   const defaultVpc = ec2.Vpc.fromLookup(scope, 'VPC', { isDefault: true });

//   // Create privacyDAM basic security group
//   const pdamSecurityGroup = createEC2SecurityGroupToConnection(scope, defaultVpc);
//   // Create security group for external database to allow access from privacyDAM
//   createEC2SecurityGroupToAllow(scope, defaultVpc, pdamSecurityGroup);

//   // Create ec2 instance
//   const instance = createEC2Instance(scope, defaultVpc, pdamSecurityGroup);
//   // // Create eip and associate with instance
//   // const eip = createElasticIpAddress(this, instance);
  
//   // Load a lambda config data
//   const file = fs.readFileSync(path.join(__dirname, '../config/lambda-setting.json'));
//   const config = JSON.parse(file.toString());
//   // Set lambda environment (OPA host and management server using internal database)
//   config.environment.DSN = `privacyDAM_admin:qlalfqjsgh@tcp(${Token.asString(instance.instancePrivateIp)}:3306)/privacyDAM`;
//   config.environment.OPA = `http://${Token.asString(instance.instancePrivateIp)}:4001/authentication/user`;
//   // Create Role for lambda function
//   const fn = createLambdaFunction(scope, config, defaultVpc, pdamSecurityGroup);

//   // Create apigateway
//   createApiGateway(scope, fn);
// }

// function createLambdaFunction(scope: Construct, config:any, vpc: ec2.IVpc, securityGroup: ec2.SecurityGroup): lambda.Function {
//   try {
//     // Get the public subnet
//     const subnet = vpc.publicSubnets[0];

//     // Create lambda role
//     const role = AwsRole.createLambdaRole(scope);

//     // Set the lambda properties
//     const props = {
//       allowPublicSubnet: true,
//       code: lambda.Code.fromAsset(path.join(__dirname, '../code/main.zip')),
//       description: 'Process API generated by privacyDAM',
//       environment: config.environment,
//       functionName: NameSet.NAME_LAMBDA,
//       handler: 'main',
//       memorySize: config.memory,
//       role: role,
//       runtime: lambda.Runtime.GO_1_X,
//       securityGroup: securityGroup,
//       timeout: Duration.seconds(config.timeout),
//       tracing: lambda.Tracing.ACTIVE,
//       vpc: vpc,
//       vpcSubnets: {
//         subnets: [subnet]
//       }
//     }

//     // Create lambda
//     const fn = new lambda.Function(scope, NameSet.NAME_LAMBDA, props);
//     console.log('[Notice] Create an aws lambda function');
//     return fn;
//   } catch (err) {
//     console.error(err);
//     process.exit(0);
//   }
// }

// function createApiGateway(scope: Construct, fn: lambda.Function) {
//   // Set the api gateway properties
//   const props = {
//     description: 'REST API router to process request_api generated by privacyDAM',
//     deployOptions: {
//       loggingLevel: apigateway.MethodLoggingLevel.INFO,
//       stageName: NameSet.NAME_APIGATEWAY_STAGE,
//       tracingEnabled: true,
//     },
//     restApiName: NameSet.NAME_APIGATEWAY
//   };
//   // Create api gateway
//   const api = new apigateway.RestApi(scope, NameSet.NAME_APIGATEWAY, props);

//   // Defining APIs
//   const mainRouter = api.root.addResource('process');
//   const processRouter = mainRouter.addResource('{name}');

//   // Create integration and set method
//   const integration = new apigateway.LambdaIntegration(fn);
//   processRouter.addMethod('GET', integration);
// }

// function createEC2Instance(scope: Construct, vpc: ec2.IVpc, incomingSecurityGroup: ec2.SecurityGroup): ec2.Instance {
//   try {
//     // Create a role for the instance
//     const role = AwsRole.createEC2InstanceRole(scope);

//     // Create a security group for the instance
//     const securityGroup = createEC2SecurityGroup(scope, vpc);

//     // Set the AMI properties
//     const amiProps = {
//       name: 'privacyDAM-ManagementServer-v1.2',
//       owners: ['395824177941'],
//     };
//     // Set the ec2 instance properties
//     const instanceProps = {
//       vpc: vpc,
//       role: role,
//       securityGroup: securityGroup,
//       instanceName: NameSet.NAME_EC2,
//       instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
//       machineImage: ec2.MachineImage.lookup(amiProps),
//       keyName: 'tov_hmin',
//       userData: loadUserData(),
//       vpcSubnets: {
//         subnets: vpc.publicSubnets
//       }
//     };
//     // Finally elts provision our ec2 instance
//     const instance = new ec2.Instance(scope, NameSet.NAME_EC2, instanceProps);
//     // Set security group for connect related database
//     instance.addSecurityGroup(incomingSecurityGroup);

//     console.log('[Notice] Create an aws ec2 instance');
//     return instance;
//   } catch (err) {
//     console.error(err);
//     process.exit(0);
//   }
// }

// function createEC2SecurityGroupToConnection(scope: Construct, vpc: ec2.IVpc): ec2.SecurityGroup {
//   // Set the security group properties
//   const props = {
//     vpc: vpc,
//     allowAllOutbound: true,
//     securityGroupName: NameSet.NAME_EC2_SECURITY_GROUP_TO_CONN
//   };

//   try {
//     // Create basic security group
//     const securityGroup = new ec2.SecurityGroup(scope, NameSet.NAME_EC2_SECURITY_GROUP_TO_CONN, props);
//     // Return
//     return securityGroup;
//   } catch (err) {
//     console.error(err);
//     process.exit(0);
//   }
// }

// function createEC2SecurityGroupToAllow(scope: Construct, vpc: ec2.IVpc, incomingSecurityGroup: ec2.SecurityGroup): ec2.SecurityGroup {
//   // Set the security group properties
//   const props = {
//     vpc: vpc,
//     allowAllOutbound: true,
//     securityGroupName: NameSet.NAME_EC2_SECURITY_GROUP_TO_ALLOW
//   };

//   try {
//     // Create basic security group
//     const securityGroup = new ec2.SecurityGroup(scope, NameSet.NAME_EC2_SECURITY_GROUP_TO_ALLOW, props);
//     // Set spectific port to allow inbound traffic
//     securityGroup.addIngressRule(incomingSecurityGroup, ec2.Port.tcp(3306), 'Allow Mysql(port) access from PrivacyDAM');
//     // Return
//     return securityGroup;
//   } catch (err) {
//     console.error(err);
//     process.exit(0);
//   }
// }

// function createEC2SecurityGroup(scope: Construct, vpc: ec2.IVpc): ec2.SecurityGroup {
//   // Set the security group properties
//   const props = {
//     vpc: vpc,
//     allowAllOutbound: true,
//     securityGroupName: NameSet.NAME_EC2_SECURITY_GROUP_BASIC
//   };

//   try {
//     // Create basic security group
//     const securityGroup = new ec2.SecurityGroup(scope, NameSet.NAME_EC2_SECURITY_GROUP_BASIC, props);
//     // Set spectific port to allow inbound traffic
//     securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH access from internet [using privacyDAM]');
//     securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3306), 'Allow Mysql(port 3306) access from internet [using privacyDAM]');
//     securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(4000), 'Allow TCP(port 4000) access from internet [using privacyDAM]');
//     securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(4001), 'Allow TCP(port 4001) access from internet [using privacyDAM]');
//     // Return
//     return securityGroup;
//   } catch (err) {
//     console.error(err);
//     process.exit(0);
//   }
// }

// function createElasticIpAddress(scope: Construct, instance: ec2.Instance): ec2.CfnEIP {
//   try {
//     // Set the elastic ip properties
//     const eipProps = {
//       tags: [{key: 'Name', value: NameSet.NAME_EC2_EIP}]
//     };
//     // Create elastic ip address
//     const eip = new ec2.CfnEIP(scope, NameSet.NAME_EC2_EIP, eipProps);

//     // Set the association properties
//     const associationProps = {
//       associationId: NameSet.NAME_EC2_EIP_AS,
//       eip: eip.ref,
//       instanceId: instance.instanceId
//     };
//     // associate elastic ip
//     const as = new ec2.CfnEIPAssociation(scope, NameSet.NAME_EC2_EIP_AS, associationProps);
//     return eip;
//   } catch (err) {
//     console.error(err);
//     process.exit(0);
//   }
// }

// function loadUserData(): ec2.UserData {
//   // Load user data (basic option)
//   const cloudInitOption = fs.readFileSync(path.join(__dirname, '../config/userdata-cloud-init'));
//   // Load user data
//   const data = fs.readFileSync(path.join(__dirname, '../config/userdata.txt'));

//   // Conbime user data
//   const userData = Buffer.concat([cloudInitOption, data]);
//   // Create user data
//   return ec2.UserData.custom(userData.toString());
// }