import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2_authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfront_origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

interface AppStackProps extends cdk.StackProps {
  appName: string;
  environment: string;
  domain: string;
  backendMemory: number;
  signalingMemory: number;
  provisionedConcurrency: number;
  logLevel: string;
  certificateArn?: string;
  connectionsTable: dynamodb.Table;
  roomsTable: dynamodb.Table;
  credentialsSecret: secretsmanager.ISecret;
}

/**
 * Stateless app resources — deployed per environment.
 * API Gateway (HTTP + WebSocket), Lambda functions, S3 + CloudFront for the SPA.
 */
export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const {
      appName, environment, domain, backendMemory, signalingMemory,
      provisionedConcurrency, logLevel, certificateArn,
      connectionsTable, roomsTable, credentialsSecret,
    } = props;

    // PLACEHOLDER sentinel means no real certificate ARN is configured.
    // Replace with your actual ACM certificate ARN in cdk.json for custom domains.
    const hasCustomDomain = !!(certificateArn && certificateArn !== 'PLACEHOLDER');
    const projectRoot = path.join(__dirname, '..', '..');

    // ═══════════════════════════════════════════════════════════
    // Lambda: Backend (Spring Boot)
    // ═══════════════════════════════════════════════════════════
    const backendLambda = new lambda.Function(this, 'BackendLambda', {
      functionName: `${appName}-backend-${environment}`,
      runtime: lambda.Runtime.JAVA_21,
      handler: 'com.flyhigh.backend.StreamLambdaHandler::handleRequest',
      code: lambda.Code.fromAsset(
        path.join(projectRoot, 'flyhigh-backend', 'target', 'flyhigh-backend-0.0.1-SNAPSHOT.jar')
      ),
      memorySize: backendMemory,
      timeout: cdk.Duration.seconds(29), // API Gateway max
      snapStart: lambda.SnapStartConf.ON_PUBLISHED_VERSIONS,
      environment: {
        SPRING_PROFILES_ACTIVE: environment,
        SECRET_ARN: credentialsSecret.secretArn,
        CORS_ORIGINS: hasCustomDomain ? `https://${domain}` : '*',
        LOG_LEVEL: logLevel,
      },
      logGroup: cdk.aws_logs.LogGroup.fromLogGroupName(
        this, 'BackendLogGroupImport', `/aws/lambda/${appName}-backend-${environment}`
      ),
    });

    // Reserved concurrency: prevents backend from consuming account-level quota
    const backendConcurrency = environment === 'production' ? 50 : 10;
    (backendLambda.node.defaultChild as lambda.CfnFunction).reservedConcurrentExecutions = backendConcurrency;

    credentialsSecret.grantRead(backendLambda);

    // ═══════════════════════════════════════════════════════════
    // Lambda: Signaling (Node.js)
    // ═══════════════════════════════════════════════════════════
    const signalingLambda = new lambda.Function(this, 'SignalingLambda', {
      functionName: `${appName}-signaling-${environment}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'lambda.handler',
      code: lambda.Code.fromAsset(
        path.join(projectRoot, 'flyhigh-signaling-server')
      ),
      memorySize: signalingMemory,
      timeout: cdk.Duration.seconds(29),
      environment: {
        CONNECTIONS_TABLE: connectionsTable.tableName,
        ROOMS_TABLE: roomsTable.tableName,
        // JWT secret resolved from Secrets Manager at deploy time by CloudFormation
        JWT_SECRET: credentialsSecret.secretValueFromJson('JWT_SECRET').unsafeUnwrap(),
        AWS_REGION: this.region,
      },
      logGroup: cdk.aws_logs.LogGroup.fromLogGroupName(
        this, 'SignalingLogGroupImport', `/aws/lambda/${appName}-signaling-${environment}`
      ),
    });

    // Reserved concurrency: prevents signaling from consuming account-level quota
    const signalingConcurrency = environment === 'production' ? 20 : 10;
    (signalingLambda.node.defaultChild as lambda.CfnFunction).reservedConcurrentExecutions = signalingConcurrency;

    connectionsTable.grantReadWriteData(signalingLambda);
    roomsTable.grantReadWriteData(signalingLambda);

    // ═══════════════════════════════════════════════════════════
    // API Gateway: HTTP API → Backend Lambda
    // ═══════════════════════════════════════════════════════════
    const httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: `${appName}-http-${environment}`,
      corsPreflight: {
        allowOrigins: hasCustomDomain ? [`https://${domain}`] : ['*'],
        allowMethods: [apigatewayv2.CorsHttpMethod.GET, apigatewayv2.CorsHttpMethod.POST,
                       apigatewayv2.CorsHttpMethod.PUT, apigatewayv2.CorsHttpMethod.DELETE,
                       apigatewayv2.CorsHttpMethod.OPTIONS],
        allowHeaders: ['Content-Type', 'Authorization'],
        allowCredentials: hasCustomDomain,
      },
    });

    const backendIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
      'BackendIntegration', backendLambda
    );

    httpApi.addRoutes({
      path: '/api/{proxy+}',
      integration: backendIntegration,
      // TODO: Add JWT authorizer when Cognito User Pool or OIDC provider is configured.
      // Use apigatewayv2_authorizers.HttpJwtAuthorizer for zero-trust edge auth:
      //   authorizer: new apigatewayv2_authorizers.HttpJwtAuthorizer('JwtAuth', jwtIssuer, { ... })
      // For now, the backend handles JWT validation via Spring Security filter chain.
    });

    // API Gateway access logging — enables debugging 4xx/5xx errors
    const httpApiLogGroup = new logs.LogGroup(this, 'HttpApiAccessLogs', {
      logGroupName: `/aws/apigateway/${appName}-http-${environment}`,
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const httpStage = httpApi.defaultStage!.node.defaultChild as apigatewayv2.CfnStage;
    httpStage.accessLogSettings = {
      destinationArn: httpApiLogGroup.logGroupArn,
      format: JSON.stringify({
        requestId: '$context.requestId',
        ip: '$context.identity.sourceIp',
        requestTime: '$context.requestTime',
        httpMethod: '$context.httpMethod',
        routeKey: '$context.routeKey',
        status: '$context.status',
        protocol: '$context.protocol',
        responseLength: '$context.responseLength',
      }),
    };

    // Throttling: prevents a single client from saturating the backend
    httpStage.defaultRouteSettings = {
      throttlingBurstLimit: environment === 'production' ? 500 : 50,
      throttlingRateLimit: environment === 'production' ? 1000 : 100,
    };

    // Domain for HTTP API (only when certificate is configured)
    if (hasCustomDomain) {
      const httpApiDomain = new apigatewayv2.DomainName(this, 'HttpApiDomain', {
        domainName: `api.${domain}`,
        certificate: cdk.aws_certificatemanager.Certificate.fromCertificateArn(
          this, 'HttpApiCert', certificateArn!
        ),
      });

      // Map the custom domain to the HTTP API $default stage
      new apigatewayv2.ApiMapping(this, 'HttpApiMapping', {
        api: httpApi,
        domainName: httpApiDomain,
        stage: httpApi.defaultStage!,
      });
    }

    // ═══════════════════════════════════════════════════════════
    // API Gateway: WebSocket API → Signaling Lambda
    // ═══════════════════════════════════════════════════════════
    const wsApi = new apigatewayv2.WebSocketApi(this, 'WebSocketApi', {
      apiName: `${appName}-ws-${environment}`,
      connectRouteOptions: { integration: new apigatewayv2_integrations.WebSocketLambdaIntegration(
        'ConnectIntegration', signalingLambda) },
      disconnectRouteOptions: { integration: new apigatewayv2_integrations.WebSocketLambdaIntegration(
        'DisconnectIntegration', signalingLambda) },
      defaultRouteOptions: { integration: new apigatewayv2_integrations.WebSocketLambdaIntegration(
        'DefaultIntegration', signalingLambda) },
    });

    const wsStage = new apigatewayv2.WebSocketStage(this, 'WebSocketStage', {
      webSocketApi: wsApi,
      stageName: environment,
      autoDeploy: true,
    });

    // WebSocket API access logging
    const wsApiLogGroup = new logs.LogGroup(this, 'WsApiAccessLogs', {
      logGroupName: `/aws/apigateway/${appName}-ws-${environment}`,
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const wsCfnStage = wsStage.node.defaultChild as apigatewayv2.CfnStage;
    wsCfnStage.accessLogSettings = {
      destinationArn: wsApiLogGroup.logGroupArn,
      format: JSON.stringify({
        requestId: '$context.requestId',
        ip: '$context.identity.sourceIp',
        requestTime: '$context.requestTime',
        routeKey: '$context.routeKey',
        status: '$context.status',
      }),
    };

    // WebSocket throttling
    wsCfnStage.defaultRouteSettings = {
      throttlingBurstLimit: environment === 'production' ? 200 : 30,
      throttlingRateLimit: environment === 'production' ? 500 : 50,
    };

    // Domain for WebSocket API (only when certificate is configured)
    if (hasCustomDomain) {
      const wsApiDomain = new apigatewayv2.DomainName(this, 'WsApiDomain', {
        domainName: `ws.${domain}`,
        certificate: cdk.aws_certificatemanager.Certificate.fromCertificateArn(
          this, 'WsApiCert', certificateArn!
        ),
      });

      // Map the custom domain to the WebSocket API stage
      new apigatewayv2.ApiMapping(this, 'WsApiMapping', {
        api: wsApi,
        domainName: wsApiDomain,
        stage: wsStage,
      });
    }

    // IAM: Allow backend to post to WebSocket API (for session extension notifications)
    backendLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['execute-api:ManageConnections'],
      resources: [
        `arn:aws:execute-api:${this.region}:${this.account}:${wsApi.apiId}/${environment}/*`,
      ],
    }));

    // ═══════════════════════════════════════════════════════════
    // S3 + CloudFront: React SPA
    // ═══════════════════════════════════════════════════════════
    const spaBucket = new s3.Bucket(this, 'SpaBucket', {
      bucketName: `${appName}-${environment}-spa`,
      removalPolicy: environment === 'production'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'production',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true, // Enables instant rollback to previous SPA deploy
      cors: [{
        allowedMethods: [s3.HttpMethods.GET],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
        maxAge: 3600,
      }],
    });

    // ═══════════════════════════════════════════════════════════
    // WAF — Web Application Firewall (CloudFront)
    // Protects against OWASP Top 10: SQL injection, XSS, bad bots, etc.
    // ═══════════════════════════════════════════════════════════
    const webAcl = new wafv2.CfnWebACL(this, 'CloudFrontWebAcl', {
      name: `${appName}-${environment}-webacl`,
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `${appName}-${environment}-waf`,
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: 'AWSManagedCommonRuleSet',
          priority: 0,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedCommonRuleSet',
            sampledRequestsEnabled: true,
          },
        },
        {
          name: 'AWSManagedSQLiRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesSQLiRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedSQLiRuleSet',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    const cloudFrontProps: cloudfront.DistributionProps = {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: cloudfront_origins.S3BucketOrigin.withOriginAccessControl(spaBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      errorResponses: [
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.seconds(10) },
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.seconds(10) },
      ],
      // Restrict edge locations to US/Canada/Europe for cost savings.
      // Set to PRICE_CLASS_ALL if you have a truly global user base.
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      // Custom domain + SSL (only when certificate ARN is configured)
      ...(hasCustomDomain ? {
        domainNames: [domain],
        certificate: cdk.aws_certificatemanager.Certificate.fromCertificateArn(
          this, 'CloudFrontCert', certificateArn!
        ),
      } : {}),
    };

    const distribution = new cloudfront.Distribution(this, 'SpaDistribution', {
      ...cloudFrontProps,
      webAclId: webAcl.attrArn,
    });

    // ═══════════════════════════════════════════════════════════
    // SNS Topic for CloudWatch Alarm notifications
    // ═══════════════════════════════════════════════════════════
    const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `${appName}-${environment}-alarms`,
      displayName: `${appName} ${environment} alarms`,
    });

    // ═══════════════════════════════════════════════════════════
    // CloudWatch Alarms
    // ═══════════════════════════════════════════════════════════
    const backendAlarm = new cloudwatch.Alarm(this, 'Backend5xxAlarm', {
      alarmName: `${appName}-backend-5xx-${environment}`,
      metric: backendLambda.metricErrors({ period: cdk.Duration.minutes(5) }),
      threshold: 5,
      evaluationPeriods: 2,
      alarmDescription: `${appName} backend 5xx errors > 5 in 5 minutes`,
    });
    backendAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));

    const signalingAlarm = new cloudwatch.Alarm(this, 'Signaling5xxAlarm', {
      alarmName: `${appName}-signaling-5xx-${environment}`,
      metric: signalingLambda.metricErrors({ period: cdk.Duration.minutes(5) }),
      threshold: 5,
      evaluationPeriods: 2,
      alarmDescription: `${appName} signaling errors > 5 in 5 minutes`,
    });
    signalingAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));

    // ═══════════════════════════════════════════════════════════
    // Outputs (for CI/CD)
    // ═══════════════════════════════════════════════════════════
    new cdk.CfnOutput(this, 'SpaBucketName', { value: spaBucket.bucketName });
    new cdk.CfnOutput(this, 'CloudFrontDistributionId', { value: distribution.distributionId });
    new cdk.CfnOutput(this, 'HttpApiUrl', { value: httpApi.apiEndpoint });
    new cdk.CfnOutput(this, 'WsApiUrl', { value: wsApi.apiEndpoint });
    new cdk.CfnOutput(this, 'CloudFrontDomain', { value: distribution.domainName });
  }
}
