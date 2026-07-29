#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PlatformStack } from '../lib/platform-stack';
import { AppStack } from '../lib/app-stack';

const app = new cdk.App();

const env = app.node.tryGetContext('env') || 'staging';
const appName = app.node.tryGetContext('appName') || 'flyhigh';
const envConfig = app.node.tryGetContext(env) || {};

const stackEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

const domain = envConfig.domain || '';
const certArn = envConfig.certificateArn || '';
const hasCustomDomain = !!(certArn && !certArn.includes('ACCOUNT'));

// ── Platform: shared stateful resources (deploy once) ──
const platform = new PlatformStack(app, `${appName}-platform-${env}`, {
  env: stackEnv,
  appName,
  environment: env,
});

// ── App: stateless resources per deployment ──
new AppStack(app, `${appName}-app-${env}`, {
  env: stackEnv,
  appName,
  environment: env,
  domain: hasCustomDomain ? domain : '',
  backendMemory: envConfig.backendMemory || 1024,
  signalingMemory: envConfig.signalingMemory || 256,
  provisionedConcurrency: envConfig.provisionedConcurrency || 1,
  logLevel: envConfig.logLevel || 'INFO',
  certificateArn: hasCustomDomain ? certArn : undefined,
  connectionsTable: platform.connectionsTable,
  roomsTable: platform.roomsTable,
  credentialsSecret: platform.credentialsSecret,
});
