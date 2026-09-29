import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'ap-south-1' });
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = 'CloudBoardDemoTable';

const members = [
  { id: 'user-20', name: 'Alex Rivera (Lead)', email: 'alex.r@cloudboard.internal', role: 'leader', dept: 'Engineering', total_points: 120, avatar_url: '' },
  { id: 'user-08', name: 'Marcus Vance', email: 'marcus.v@cloudboard.internal', role: 'dept-head', dept: 'Engineering', total_points: 58, avatar_url: '' },
  { id: 'user-05', name: 'Dr. Lavanya Reddy', email: 'lavanya@cloudboard.internal', role: 'dept-head', dept: 'Marketing & Design', total_points: 45, avatar_url: '' },
  { id: 'user-06', name: 'Sanket Joshi', email: 'sanket@cloudboard.internal', role: 'dept-head', dept: 'Budget & IO', total_points: 38, avatar_url: '' },
  { id: 'user-07', name: 'Farah Khan', email: 'farah@cloudboard.internal', role: 'dept-head', dept: 'Delegate Handling', total_points: 52, avatar_url: '' },
  { id: 'user-09', name: 'Divya Patel', email: 'divya@cloudboard.internal', role: 'dept-head', dept: 'Event Coordination', total_points: 42, avatar_url: '' },
  { id: 'user-11', name: 'Sneha Iyer', email: 'sneha@cloudboard.internal', role: 'committee', dept: 'Engineering', total_points: 29, avatar_url: '' },
  { id: 'user-12', name: 'Arnav Bose', email: 'arnav@cloudboard.internal', role: 'committee', dept: 'Budget & IO', total_points: 26, avatar_url: '' },
  { id: 'user-10', name: 'Mehul Shah', email: 'mehul@cloudboard.internal', role: 'committee', dept: 'Marketing & Design', total_points: 24, avatar_url: '' },
  { id: 'user-13', name: 'Tanvi Kulkarni', email: 'tanvi@cloudboard.internal', role: 'committee', dept: 'Event Coordination', total_points: 22, avatar_url: '' },
  { id: 'user-01', name: 'Aanya Sharma', email: 'aanya@cloudboard.internal', role: 'volunteer', dept: 'Marketing & Design', total_points: 18, avatar_url: '' },
  { id: 'user-04', name: 'Kiran Das', email: 'kiran@cloudboard.internal', role: 'volunteer', dept: 'Delegate Handling', total_points: 15, avatar_url: '' },
  { id: 'user-02', name: 'Rohan Verma', email: 'rohan@cloudboard.internal', role: 'volunteer', dept: 'Marketing & Design', total_points: 12, avatar_url: '' },
  { id: 'user-03', name: 'Priya Nair', email: 'priya@cloudboard.internal', role: 'volunteer', dept: 'Budget & IO', total_points: 10, avatar_url: '' },
];

const points = [
  { id: 'pt-001', target_user_id: 'user-08', submitted_by: 'user-20', home_dept: 'Engineering', target_dept: 'Engineering', points: 15, reason: 'Architected CloudFront CDN caching strategy', category: 'innovation', status: 'approved', submitted_at: '2026-09-28T10:00:00.000Z', approved_by: 'Alex Rivera (Lead)' },
  { id: 'pt-002', target_user_id: 'user-11', submitted_by: 'user-08', home_dept: 'Engineering', target_dept: 'Engineering', points: 10, reason: 'Implemented DynamoDB auto-scaling and GSI indexes', category: 'delivery', status: 'approved', submitted_at: '2026-09-28T14:30:00.000Z', approved_by: 'Marcus Vance' },
  { id: 'pt-003', target_user_id: 'user-01', submitted_by: 'user-05', home_dept: 'Marketing & Design', target_dept: 'Marketing & Design', points: 8, reason: 'Designed community landing page and badges', category: 'culture', status: 'approved', submitted_at: '2026-09-27T09:15:00.000Z', approved_by: 'Dr. Lavanya Reddy' },
  { id: 'pt-004', target_user_id: 'user-04', submitted_by: 'user-07', home_dept: 'Delegate Handling', target_dept: 'Delegate Handling', points: 12, reason: 'Onboarded 50 new hackathon participants', category: 'collaboration', status: 'approved', submitted_at: '2026-09-29T08:00:00.000Z', approved_by: 'Farah Khan' },
  { id: 'pt-005', target_user_id: 'user-12', submitted_by: 'user-06', home_dept: 'Budget & IO', target_dept: 'Budget & IO', points: 10, reason: 'Automated cost analysis using AWS Cost Explorer', category: 'delivery', status: 'approved', submitted_at: '2026-09-26T16:00:00.000Z', approved_by: 'Sanket Joshi' },
];

async function seed() {
  console.log('Seeding members...');
  for (const m of members) {
    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `MEMBER#${m.id}`,
        SK: 'PROFILE',
        ...m,
        created_at: new Date().toISOString()
      }
    }));
  }
  console.log(`Successfully seeded ${members.length} members.`);

  console.log('Seeding points...');
  for (const p of points) {
    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `POINT#${p.id}`,
        SK: 'METADATA',
        ...p,
        reviewed_at: p.submitted_at
      }
    }));
  }
  console.log(`Successfully seeded ${points.length} points.`);
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});