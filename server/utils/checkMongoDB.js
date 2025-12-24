require('dotenv').config();
const mongoose = require('mongoose');

const checkMongoDB = async () => {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI bulunamadı');
    return;
  }

  console.log('🔍 MongoDB bağlantısı test ediliyor...');
  
  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log('✅ MongoDB bağlantısı başarılı!');
    console.log(`   Database: ${conn.connection.name}`);
    
    // Test query
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`\n📊 Veritabanında ${collections.length} collection bulundu:`);
    collections.forEach(col => console.log(`   - ${col.name}`));
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Bağlantı hatası:', error.message);
    
    if (error.message.includes('whitelist')) {
      console.log('\n💡 Çözüm:');
      console.log('   1. MongoDB Atlas → Network Access → Add IP Address');
      console.log('   2. IP adresinizi ekleyin: 212.108.136.1');
      console.log('   3. Veya test için: 0.0.0.0/0 (tüm IP\'lere izin ver)');
    }
    
    process.exit(1);
  }
};

checkMongoDB();

