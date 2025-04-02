/**
 * Model Testing Script
 * 
 * This is a simple script to test the database models.
 * Run with: npx ts-node src/tests/model-test.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, State, Event, MessageTimer, Country } from '../models';
import { connectToDatabase } from '../lib/database';

// Load environment variables
dotenv.config();

async function testModels() {
  try {
    console.log('🧪 Running model tests...');
    
    // Connect to the database
    console.log('\n📊 Testing database connection...');
    await connectToDatabase();
    console.log('✅ Database connection successful');
    
    // Test country model
    console.log('\n🌍 Testing Country model...');
    const countries = await Country.find().limit(5);
    console.log(`Found ${countries.length} countries in the database`);
    
    // Test user model
    console.log('\n👤 Testing User model...');
    try {
      const testUser = new User({
        userName: 'test_user_' + Date.now(),
        pinNumber: '123456',
        location: {
          countryCode: 'US',
          countryName: 'United States',
          timeZone: 'America/New_York',
          gmtOffset: 'GMT-5:00'
        },
        role: 'user'
      });
      
      // Don't actually save to avoid creating test users
      // await testUser.save();
      console.log('✅ User model can be instantiated');
      console.log(`   Username: ${testUser.userName}`);
      console.log(`   Location: ${testUser.location.countryName}`);
      console.log(`   Role: ${testUser.role}`);
      
    } catch (error) {
      console.error('❌ User model test failed:', error);
    }
    
    // Test state model
    console.log('\n⏱️ Testing State model...');
    try {
      const currentState = await State.getCurrentState();
      console.log(`Current state: ${currentState ? 'Found' : 'Not set'}`);
      
      if (currentState) {
        const isExpired = State.isExpired(currentState);
        console.log(`Timer status: ${isExpired ? 'Expired' : 'Active'}`);
      }
    } catch (error) {
      console.error('❌ State model test failed:', error);
    }
    
    // Test event model
    console.log('\n📝 Testing Event model...');
    try {
      const recentResets = await Event.getRecentResets(24);
      console.log(`Recent reset events (24h): ${recentResets}`);
    } catch (error) {
      console.error('❌ Event model test failed:', error);
    }
    
    // Test message timer model
    console.log('\n📩 Testing MessageTimer model...');
    try {
      const activeTimer = await MessageTimer.getActiveTimer();
      console.log(`Active message timer: ${activeTimer ? 'Found' : 'Not set'}`);
      
      if (activeTimer) {
        console.log(`   Trigger time: ${activeTimer.triggerTime}`);
        console.log(`   Message: ${activeTimer.messageContent.text.substring(0, 30)}...`);
      }
    } catch (error) {
      console.error('❌ MessageTimer model test failed:', error);
    }
    
    console.log('\n✅ Model tests completed');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
  }
}

// Run the tests
testModels(); 