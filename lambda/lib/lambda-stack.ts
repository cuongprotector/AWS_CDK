import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as events from 'aws-cdk-lib/aws-events'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as path from 'path'
import * as targets from 'aws-cdk-lib/aws-events-targets'
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps, params?: any) {
    super(scope, id, props);

    const branch = params.branch;
    const environment = params.environment;
    const account_id = cdk.Stack.of(this).account
    const region = cdk.Stack.of(this).region;
    const unload_bucket_name = params.unload_bucket_name
    //
    const bucket = new s3.Bucket(this, 'L0_Bucket', {
      bucketName: unload_bucket_name,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    // Get Policys
    const lambda_full_policy = iam.ManagedPolicy.fromAwsManagedPolicyName(
      'AWSLambda_FullAccess'
    );
    const lambda_policy = iam.ManagedPolicy.fromAwsManagedPolicyName(
      'service-role/AWSLambdaRole'
    );
    const cw_full_policy = iam.ManagedPolicy.fromAwsManagedPolicyName(
      'CloudWatchLogsFullAccess'
    );
    const timestream_read_policy = iam.ManagedPolicy.fromAwsManagedPolicyName(
      'AmazonTimestreamReadOnlyAccess'
    );
    const s3_full_policy = iam.ManagedPolicy.fromAwsManagedPolicyName(
      'AmazonS3FullAccess'
    );
    // Create Lambda Roles

    const lambda_execution_role = new iam.Role(this, 'L0_LambdaExecRole', {
      roleName: 'lambda_execution_role',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });
    lambda_execution_role.addManagedPolicy(s3_full_policy);
    lambda_execution_role.addManagedPolicy(lambda_policy);
    lambda_execution_role.addManagedPolicy(timestream_read_policy);
    lambda_execution_role.addManagedPolicy(cw_full_policy);
    lambda_execution_role.addManagedPolicy(lambda_full_policy);
    // Create Main Flow Resources
    const env_params = {
      "ENV_NAME": branch,
      "REGION": region,
    };
    const l0 = createLambda(this, 'L0', lambda_execution_role, [], env_params);

    const e0 = createSchedulerRule(this, 'E0', l0);
    eventRule(this, l0, 'Log0_Event_for_Log_L0');
  }
}

function createSchedulerRule(scope: Construct, name: string, lambda_function: lambda.Function) {
  const rule = new events.Rule(scope, `${name}ScheduleRule_0`, {
    ruleName: name,
    schedule: events.Schedule.cron({}),
  });
  rule.addTarget(new targets.LambdaFunction(lambda_function))
  return rule;
}

function createLambda(scope: Construct, name: string, exec_role: iam.IRole, layers: lambda.ILayerVersion[], env_params: any) {
  const func = new lambda.Function(scope, name, {
    runtime: lambda.Runtime.PYTHON_3_9,
    handler: 'lambda_function.lambda_handler',
    code: lambda.Code.fromAsset(path.join(__dirname, name)),
    functionName: name,
    memorySize: 1024,
    timeout: cdk.Duration.seconds(100),
    layers: layers,
    role: exec_role,
    allowPublicSubnet: true,
    environment: env_params
  });
  return func;
}

function eventRule(scope: Construct, lambda: lambda.Function, name: string){
  new events.Rule(scope, name, {
    eventPattern: {
      source: ["aws.logs"],
      detailType: ["AWS API Call via CloudTrail"],
      detail: {
        "eventSource": [
          "logs.amazonaws.com"
        ],
        "eventName": [
          "CreateLogGroup"
        ]
      }
    },
    targets: [new targets.LambdaFunction(lambda, {retryAttempts: 3})],
  });
}