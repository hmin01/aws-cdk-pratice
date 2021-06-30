export const ROLE_LAMBDA                      = 'privacyDAM-LambdaRole';
export const ROLE_EC2                         = 'privacyDAM-EC2Role';
export const ROLE_APIGATEWAY                  = 'privacyDAM-ApiGatewayRole';

export const NAME_LAMBDA                      = 'privacyDAM-Process';
export const NAME_EC2                         = 'privacyDAM-ManagementServer';
export const NAME_EC2_SECURITY_GROUP_TO_CONN  = 'privacyDAM-ConnectDB'
export const NAME_EC2_SECURITY_GROUP_TO_ALLOW = 'privacyDAM-AllowConnection'
export const NAME_EC2_SECURITY_GROUP_BASIC    = 'privacyDAM-BasicSecurityGroup';
export const NAME_EC2_EIP                     = 'privacyDAM-EIP';
export const NAME_EC2_EIP_AS                  = 'privacyDAM-EIP-Association';
export const NAME_APIGATEWAY                  = 'privacyDAM-APIs';
export const NAME_APIGATEWAY_STAGE            = 'pdam';


export const Names = {
  EC2: {
    KEY_PAIR: 'privacyDAM-Key',
    MANAGEMENT: 'privacyDAM-EC2-ManagementServer'
  },
  ECS: {
    CLUSTER: 'privacyDAM-ECS-Cluster',
    CONTAINER: 'privacyDAM-ECS-Container',
    SERVICE: 'privacyDAM-ECS',
    TASK_DEFINITION: 'privacyDAM-ECS-TaskDefinition',
    LOGS: 'privacyDAM-ECS-logs'
  },
  ECR: {
    REPOSITORY: 'privacyDAM-ECR-Repository'
  },
  EVENTS: 'privacyDAM-Events-Schedule',
  LAMBDA: 'privacyDAM-Lambda-Archiving',
  NLB: {
    LOAD_BALANCER: 'privacyDAM-NLB',
    LISTENER: 'privacyDAM-NLB-Lisenter',
    TARGETS: 'privacyDAM-NLB-Targets'
  },
  IAM: {
    EC2: 'privacyDAM-Role-EC2',
    ECS: 'privacyDAM-Role-ECS',
    ECS_TASK: 'privacyDAM-Role-ECSTask',
    LAMBDA: 'privacyDAM-Role-Lambda'
  },
  S3: 'privacydam-archiving',
  SG: {
    MANAGEMENT: 'privacyDAM-SecurityGroup-Management',
    PRIVATE_GROUP: 'privacyDAM-SecurityGroup-PrivateComm',
    PROCESS_API: 'privacyDAM-SecurityGroup-Process'
  },
  SQS: 'privacyDAM-Process.fifo',
  VPC: {
    DEFAULT: 'privacyDAM-VPC',
    ENDPOINT: {
      ECR_API: 'privacyDAM-Endpoint-ECR.API',
      ECR_DKR: 'privacyDAM-Endpoint-ECR.DKR',
      LOGS: 'privacyDAM-Endpoint-Logs',
      S3: 'privacyDAM-Endpoint-S3',
      SQS: 'privacyDAM-Endpoint-SQS'
    }
  }
};