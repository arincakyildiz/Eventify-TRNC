const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    console.log('Attempting to connect to MongoDB...');
    
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000, // 30 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      connectTimeoutMS: 30000, // 30 seconds connection timeout
      maxPoolSize: 10, // Maintain up to 10 socket connections
      retryWrites: true,
      w: 'majority'
    });
    
    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
    });
    
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.log('\n🔍 Troubleshooting steps:');
    console.log('1. Check MongoDB Atlas Network Access - your IP should be whitelisted');
    console.log('   (Or use 0.0.0.0/0 to allow all IPs for testing)');
    console.log('2. Verify the connection string in .env file');
    console.log('3. Check if the database user has proper permissions');
    console.log('4. Ensure the cluster is running and accessible');
    console.log('\n📝 Current MONGODB_URI format should be:');
    console.log('   mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority');
    
    // Don't exit in development - allow server to start with warning
    if (process.env.NODE_ENV === 'production') {
      console.error('\n❌ Exiting in production mode due to database connection failure');
      process.exit(1);
    } else {
      console.warn('\n⚠️  Server will continue but database operations will fail!');
      console.warn('   Fix the MongoDB connection to enable full functionality.');
    }
  }
};

module.exports = connectDB;

