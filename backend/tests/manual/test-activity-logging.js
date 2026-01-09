/**
 * Test Script for Activity Logging and Session Management
 * Run this after starting the backend server
 */

import fetch from 'node-fetch';
import prisma from './src/lib/prisma.js';

const API_URL = 'http://localhost:3001/api/v1';

async function testActivityLogging() {
  console.log('🧪 Testing Activity Logging & Session Management\n');

  try {
    // Test 1: Check initial counts
    console.log('📊 Initial Database State:');
    const initialSessions = await prisma.userSession.count();
    const initialLogs = await prisma.activityLog.count();
    console.log(`   Sessions: ${initialSessions}`);
    console.log(`   Activity Logs: ${initialLogs}\n`);

    // Test 2: Attempt login
    console.log('🔐 Testing Login...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'tester@2.com',
        password: 'password123'
      })
    });

    const loginData = await loginResponse.json();
    
    if (loginData.success) {
      console.log('   ✅ Login successful');
      console.log(`   User ID: ${loginData.user.id}`);
    } else {
      console.log('   ❌ Login failed:', loginData.error);
    }
    console.log('');

    // Test 3: Wait for database writes
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 4: Check updated counts
    console.log('📊 Updated Database State:');
    const finalSessions = await prisma.userSession.count();
    const finalLogs = await prisma.activityLog.count();
    console.log(`   Sessions: ${finalSessions} (${finalSessions - initialSessions > 0 ? '✅ +' + (finalSessions - initialSessions) : '❌ No change'})`);
    console.log(`   Activity Logs: ${finalLogs} (${finalLogs - initialLogs > 0 ? '✅ +' + (finalLogs - initialLogs) : '❌ No change'})\n`);

    // Test 5: Show recent activity logs
    if (finalLogs > initialLogs) {
      console.log('📋 Recent Activity Logs:');
      const recentLogs = await prisma.activityLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 5,
        select: {
          action: true,
          success: true,
          ipAddress: true,
          timestamp: true
        }
      });
      recentLogs.forEach(log => {
        console.log(`   ${log.success ? '✅' : '❌'} ${log.action} from ${log.ipAddress || 'N/A'} at ${log.timestamp.toISOString()}`);
      });
      console.log('');
    }

    // Test 6: Show recent sessions
    if (finalSessions > initialSessions) {
      console.log('🔑 Recent Sessions:');
      const recentSessions = await prisma.userSession.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          userId: true,
          isActive: true,
          ipAddress: true,
          createdAt: true,
          expiresAt: true
        }
      });
      recentSessions.forEach(session => {
        console.log(`   ${session.isActive ? '🟢' : '⚫'} Session ${session.id.slice(0, 8)}... for user ${session.userId.slice(0, 8)}...`);
        console.log(`      IP: ${session.ipAddress || 'N/A'}, Created: ${session.createdAt.toISOString()}`);
      });
      console.log('');
    }

    // Summary
    console.log('📈 Summary:');
    const sessionCreated = finalSessions > initialSessions;
    const logsCreated = finalLogs > initialLogs;
    
    if (sessionCreated && logsCreated) {
      console.log('   ✅ Activity logging: WORKING');
      console.log('   ✅ Session management: WORKING');
      console.log('   ✅ All Priority 1 features: IMPLEMENTED\n');
    } else {
      console.log('   ⚠️  Issues detected:');
      if (!sessionCreated) console.log('      - Sessions not being created');
      if (!logsCreated) console.log('      - Activity logs not being created');
      console.log('');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testActivityLogging();
