require('dotenv').config();
const mongoose = require('mongoose');

const testConnection = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error('❌ MONGODB_URI is not defined in environment variables');
      process.exit(1);
    }
    
    console.log('🔍 Testing MongoDB connection...');
    console.log(`📍 Connection string: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//****:****@')}`);
    
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log(`✅ MongoDB Connected successfully!`);
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   State: ${['disconnected', 'connected', 'connecting', 'disconnecting'][conn.connection.readyState]}`);
    
    // Test a simple query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\n📊 Collections in database: ${collections.length}`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
    await mongoose.connection.close();
    console.log('\n✅ Connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ MongoDB Connection Error: ${error.message}`);
    
    if (error.name === 'MongoServerSelectionError') {
      console.log('\n🔍 Common causes:');
      console.log('   1. Your IP address is not whitelisted in MongoDB Atlas');
      console.log('   2. Network connectivity issues');
      console.log('   3. MongoDB Atlas cluster is paused or unavailable');
      console.log('\n💡 Solutions:');
      console.log('   1. Go to MongoDB Atlas → Network Access → Add IP Address');
      console.log('   2. Use 0.0.0.0/0 (allow all IPs) for testing only');
      console.log('   3. Check if your cluster is running');
    } else if (error.name === 'MongoParseError') {
      console.log('\n🔍 Connection string format error');
      console.log('   Check your MONGODB_URI in .env file');
    } else if (error.message.includes('authentication failed')) {
      console.log('\n🔍 Authentication error');
      console.log('   Check your MongoDB username and password');
    }
    
    process.exit(1);
  }
};

testConnection();

