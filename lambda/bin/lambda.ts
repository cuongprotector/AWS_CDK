#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LambdaStack } from '../lib/lambda-stack';

const app = new cdk.App();

const dev_env = {
  env: { account: '724070731874', region: 'us-west-2' },
}
const dev_params = {
  branch: 'test',
  environment: 'develop',
  unload_bucket_name: 'realne-prod-demand-predict-unload-ts',
}

const dev_unload_stack = new LambdaStack(app, 'LambdaStack',dev_env, dev_params);
cdk.Tags.of(dev_unload_stack).add('Environment', 'develop');