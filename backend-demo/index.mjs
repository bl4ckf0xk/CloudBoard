import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || 'CloudBoardDemoTable';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const path = event.requestContext?.http?.path || event.path || '/';

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'OK' }) };
  }

  try {
    if (path.endsWith('/members') && method === 'GET') {
      const res = await ddb.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :prefix)',
        ExpressionAttributeValues: { ':prefix': 'MEMBER#' }
      }));
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ members: res.Items || [] })
      };
    }

    if (path.endsWith('/points') && method === 'GET') {
      const res = await ddb.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :prefix)',
        ExpressionAttributeValues: { ':prefix': 'POINT#' }
      }));
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ points: res.Items || [] })
      };
    }

    if (path.endsWith('/points') && method === 'POST') {
      const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
      const id = body.id || `point-${Date.now()}`;
      const item = {
        PK: `POINT#${id}`,
        SK: `METADATA`,
        id,
        target_user_id: body.targetUserId || body.target_user_id || 'user-01',
        submitted_by: body.submitterId || body.submitted_by || 'user-20',
        home_dept: body.home_dept || 'engineering',
        target_dept: body.target_dept || 'engineering',
        points: Number(body.points) || 10,
        reason: body.reason || 'Team collaboration recognition',
        category: body.category || 'collaboration',
        status: 'approved',
        submitted_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        approved_by: 'Alex Rivera (Lead)',
      };
      await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
      return {
        statusCode: 201,
        headers: CORS_HEADERS,
        body: JSON.stringify(item)
      };
    }

    if (path.includes('/approve') && (method === 'PUT' || method === 'POST')) {
      const match = path.match(/points\/([^/]+)/);
      const pointId = match ? match[1] : '';
      if (pointId) {
        await ddb.send(new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: `POINT#${pointId}`, SK: 'METADATA' },
          UpdateExpression: 'SET #st = :approved, reviewed_at = :now, approved_by = :approver',
          ExpressionAttributeNames: { '#st': 'status' },
          ExpressionAttributeValues: {
            ':approved': 'approved',
            ':now': new Date().toISOString(),
            ':approver': 'Demo Lead Reviewer'
          }
        }));
      }
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Point submission approved', pointId })
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'CloudBoard Demo Serverless API Live',
        endpoints: ['/members', '/points', '/points/{id}/approve'],
        timestamp: new Date().toISOString()
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message || 'Internal Server Error' })
    };
  }
};