const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.log('Make sure MongoDB is running locally or update MONGODB_URI in .env for MongoDB Atlas');
    process.exit(1);
  }
};

module.exports = connectDB;

