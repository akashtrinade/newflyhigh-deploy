import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface PlatformStackProps extends cdk.StackProps {
  appName: string;
  environment: string;
}

/**
 * Stateful platform resources — deployed once, rarely changed.
 * Contains: Secrets Manager, DynamoDB tables for WebSocket state,
 * CloudWatch log groups for Lambda functions.
 */
export class PlatformStack extends cdk.Stack {
  public readonly connectionsTable: dynamodb.Table;
  public readonly roomsTable: dynamodb.Table;
  public readonly credentialsSecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: PlatformStackProps) {
    super(scope, id, props);

    const { appName, environment } = props;

    // ── DynamoDB: WebSocket connections ──
    this.connectionsTable = new dynamodb.Table(this, 'ConnectionsTable', {
      tableName: `${appName}-${environment}-connections`,
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: environment === 'production'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });

    // GSI for looking up connections by email (INCLUDE projection saves storage)
    this.connectionsTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ['connectionId', 'role', 'userId', 'activeRoomId', 'ttl'],
    });

    // GSI for looking up connections by userId
    this.connectionsTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ['connectionId', 'email', 'role', 'activeRoomId', 'ttl'],
    });

    // ── DynamoDB: WebRTC rooms ──
    this.roomsTable = new dynamodb.Table(this, 'RoomsTable', {
      tableName: `${appName}-${environment}-rooms`,
      partitionKey: { name: 'roomId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: environment === 'production'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });

    // ── Secrets Manager ──
    // Populate with: MONGODB_URI, JWT_SECRET, MAIL_USERNAME, MAIL_PASSWORD,
    //                GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
    this.credentialsSecret = new secretsmanager.Secret(this, 'Credentials', {
      secretName: `${appName}/${environment}/credentials`,
      description: `FlyHigh backend credentials for ${environment}`,
    });

    // ── CloudWatch Log Groups (centralized retention) ──
    new logs.LogGroup(this, 'BackendLogGroup', {
      logGroupName: `/aws/lambda/${appName}-backend-${environment}`,
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new logs.LogGroup(this, 'SignalingLogGroup', {
      logGroupName: `/aws/lambda/${appName}-signaling-${environment}`,
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ── Outputs ──
    new cdk.CfnOutput(this, 'ConnectionsTableName', {
      value: this.connectionsTable.tableName,
    });
    new cdk.CfnOutput(this, 'RoomsTableName', {
      value: this.roomsTable.tableName,
    });
    new cdk.CfnOutput(this, 'CredentialsSecretArn', {
      value: this.credentialsSecret.secretArn,
    });
  }
}
