require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Event = require('../models/Event');

// Connect to database
connectDB();

// Update event dates to be from today onwards
const updateEventDates = async () => {
  try {
    console.log('🔄 Updating event dates...');

    // Wait for database connection (with timeout)
    let connected = false;
    const maxWaitTime = 10000; // 10 seconds
    const startTime = Date.now();

    const checkConnection = () => {
      return mongoose.connection.readyState === 1;
    };

    if (!checkConnection()) {
      console.log('⏳ Waiting for MongoDB connection...');
      await new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (checkConnection()) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            connected = true;
            resolve();
          } else if (Date.now() - startTime > maxWaitTime) {
            clearInterval(checkInterval);
            reject(new Error('MongoDB connection timeout'));
          }
        }, 100);

        const timeout = setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('MongoDB connection timeout'));
        }, maxWaitTime);

        mongoose.connection.once('connected', () => {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          connected = true;
          resolve();
        });
      });
    }
    
    console.log('✅ Database connected');

    // Get all events sorted by current date
    const events = await Event.find({}).sort({ date: 1 });
    console.log(`📅 Found ${events.length} events`);

    if (events.length === 0) {
      console.log('ℹ️ No events to update');
      process.exit(0);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day

    let daysToAdd = 7; // Start from 7 days from today (1 week ahead)
    let updatedCount = 0;

    console.log(`\n📅 Today is: ${today.toLocaleDateString()}\n`);

    for (const event of events) {
      const originalDate = new Date(event.date);
      const originalTime = originalDate;
      
      // Set new date starting from 7 days from today
      const newDate = new Date(today);
      newDate.setDate(newDate.getDate() + daysToAdd);
      
      // Preserve the original time (hours and minutes)
      newDate.setHours(originalTime.getHours(), originalTime.getMinutes(), 0, 0);

      await Event.findByIdAndUpdate(event._id, { date: newDate });
      console.log(`✅ Updated "${event.title}":`);
      console.log(`   ${originalDate.toLocaleDateString()} ${originalDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} → ${newDate.toLocaleDateString()} ${newDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`);
      updatedCount++;
      daysToAdd += 3; // Add 3 days between each event
    }

    console.log(`\n✅ Successfully updated ${updatedCount} event dates`);
    console.log(`✅ All events moved to dates starting from ${new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()} onwards`);
    console.log('✅ Event date update completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating event dates:', error);
    process.exit(1);
  }
};

// Run the update
updateEventDates();

