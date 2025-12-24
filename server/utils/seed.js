require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Event = require('../models/Event');

// Connect to database
connectDB();

// Seed data
const seedData = async () => {
  try {
    console.log('Seeding database...');

    // Create default admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@eventify.trnc';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    let admin = await Admin.findOne({ email: adminEmail });
    if (!admin) {
      admin = await Admin.create({
        email: adminEmail,
        password: adminPassword
      });
      console.log('✅ Admin created:', admin.email);
    } else {
      console.log('✅ Admin already exists:', admin.email);
    }

    // Delete existing events to refresh
    await Event.deleteMany({});
    console.log('🗑️ Cleared existing events');

    // Create sample events with future dates
    const baseDate = new Date();
    const addDays = (days) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + days);
      return d;
    };

    const sampleEvents = [
      {
        title: 'Nicosia Spring Culture Festival',
        city: 'Nicosia',
        category: 'Culture',
        date: addDays(5),
        time: '18:30',
        location: 'Nicosia City Park',
        capacity: 200,
        description: 'Open-air festival with local music, traditional food stands, and art workshops for families.',
        imageUrl: 'nicosia.jpg',
        createdBy: admin._id
      },
      {
        title: 'Famagusta Beach Volleyball Tournament',
        city: 'Famagusta',
        category: 'Sports',
        date: addDays(10),
        time: '16:00',
        location: 'Glapsides Beach',
        capacity: 32,
        description: 'Amateur beach volleyball tournament for youth and adults. Teams of 4 players can register.',
        imageUrl: 'famagustaa.jpg',
        createdBy: admin._id
      },
      {
        title: 'Digital Skills Workshop for Seniors',
        city: 'Kyrenia',
        category: 'Education',
        date: addDays(3),
        time: '10:00',
        location: 'Kyrenia Municipality Culture Center',
        capacity: 40,
        description: 'Hands-on training for seniors on using smartphones, online banking, and e-government portals.',
        imageUrl: 'kyrenia.jpg',
        createdBy: admin._id
      },
      {
        title: 'City Clean-Up & Tree Planting Day',
        city: 'Iskele',
        category: 'Environment',
        date: addDays(1),
        time: '09:30',
        location: 'Iskele Seafront Promenade',
        capacity: 120,
        description: 'Community clean-up of coastal areas followed by planting new trees in public spaces.',
        imageUrl: 'city-cleanup-tree-planting.jpg',
        createdBy: admin._id
      },
      {
        title: 'Nicosia Open-Air Jazz Night',
        city: 'Nicosia',
        category: 'Music & Entertainment',
        date: addDays(7),
        time: '20:30',
        location: 'Old City Square, Nicosia',
        capacity: 150,
        description: 'Evening jazz concert with local bands, food trucks, and a relaxed open-air atmosphere.',
        imageUrl: 'avlu-nicosia.jpg',
        createdBy: admin._id
      },
      {
        title: 'Kyrenia Sunset Harbour Concert',
        city: 'Kyrenia',
        category: 'Music & Entertainment',
        date: addDays(12),
        time: '19:00',
        location: 'Kyrenia Harbour Stage',
        capacity: 300,
        description: 'Live music by the harbour at sunset featuring young bands and municipal orchestra performances.',
        imageUrl: 'sunset-concert.jpg',
        createdBy: admin._id
      },
      {
        title: 'Morphou Local Food & Handcraft Fair',
        city: 'Morphou',
        category: 'Culture',
        date: addDays(8),
        time: '11:00',
        location: 'Morphou Central Square',
        capacity: 250,
        description: 'Day-long fair with local food stalls, handcraft exhibitions, and children\'s activities.',
        imageUrl: 'morphou-food-fair.jpg',
        createdBy: admin._id
      },
      {
        title: 'Iskele Family Movie Night Outdoors',
        city: 'Iskele',
        category: 'Music & Entertainment',
        date: addDays(14),
        time: '21:00',
        location: 'Iskele Seafront Open Cinema Area',
        capacity: 180,
        description: 'Family-friendly movie screening under the stars with popcorn stands and kids\' corner.',
        imageUrl: 'iskele-movie-night.jpg',
        createdBy: admin._id
      },
      {
        title: 'Nicosia Community Fun Run',
        city: 'Nicosia',
        category: 'Sports',
        date: addDays(18),
        time: '09:00',
        location: 'Ataturk Stadium, Nicosia',
        capacity: 400,
        description: '5K and 10K fun run for all ages with charity booths and warm-up sessions led by trainers.',
        imageUrl: 'ataturk-stadium.jpg',
        createdBy: admin._id
      },
      {
        title: 'Famagusta Youth Coding Camp',
        city: 'Famagusta',
        category: 'Education',
        date: addDays(20),
        time: '10:30',
        location: 'Famagusta Innovation Center',
        capacity: 60,
        description: 'Weekend bootcamp introducing high school students to web development and basic programming.',
        imageUrl: 'famagusta-coding-camp.jpg',
        createdBy: admin._id
      },
      {
        title: 'Kyrenia Coastal Cycling Tour',
        city: 'Kyrenia',
        category: 'Sports',
        date: addDays(22),
        time: '08:30',
        location: 'Kyrenia Old Harbour Stage',
        capacity: 120,
        description: 'Guided cycling tour along the Kyrenia coastline with safety briefing and refreshment stops.',
        imageUrl: 'cycling-tour.jpg',
        createdBy: admin._id
      },
      {
        title: 'Lefke Green Living Workshop',
        city: 'Lefke',
        category: 'Environment',
        date: addDays(16),
        time: '15:00',
        location: 'Lefke Community Center',
        capacity: 80,
        description: 'Interactive talks and hands-on demos about recycling, composting, and sustainable home habits.',
        imageUrl: 'lefke-green-living.jpg',
        createdBy: admin._id
      },
      {
        title: 'Avenue Cinemax Indie Premiere',
        city: 'Nicosia',
        category: 'Culture',
        date: addDays(6),
        time: '19:30',
        location: 'Avenue Cinemax – Nicosia',
        capacity: 450,
        description: 'Exclusive screening of local indie films followed by a director Q&A session at Avenue Cinemax.',
        imageUrl: 'avenue.jpg',
        createdBy: admin._id
      },
      {
        title: 'Bellapais Classical Nights',
        city: 'Kyrenia',
        category: 'Culture',
        date: addDays(11),
        time: '20:00',
        location: 'Bellapais Monastery',
        capacity: 600,
        description: 'Open-air chamber music concert inside Bellapais Monastery featuring regional orchestras.',
        imageUrl: 'bellapais-manastiri.jpg',
        createdBy: admin._id
      },
      {
        title: 'Iskele Summer Festival Opening',
        city: 'Iskele',
        category: 'Music & Entertainment',
        date: addDays(9),
        time: '18:00',
        location: 'Iskele Municipality Festival Area',
        capacity: 2000,
        description: 'Festival kickoff with folk dances, municipal choir and street food market in the heart of Iskele.',
        imageUrl: 'bogazici-belediyesi-festival-alani.jpg',
        createdBy: admin._id
      },
      {
        title: 'Catalkoy Community Theatre Night',
        city: 'Kyrenia',
        category: 'Culture',
        date: addDays(13),
        time: '19:30',
        location: 'Catalkoy Municipality Cultural Center',
        capacity: 320,
        description: 'Local theatre troupe presents a bilingual play celebrating Cypriot folklore at Catalkoy Cultural Center.',
        imageUrl: 'catalkoy-erol-avgoren-kultur-merkezi.jpg',
        createdBy: admin._id
      },
      {
        title: 'Rauf Raif Denktaş Summit',
        city: 'Famagusta',
        category: 'Education',
        date: addDays(4),
        time: '10:00',
        location: 'Rauf Raif Denktaş Culture and Congress Center',
        capacity: 900,
        description: 'Regional innovation summit with keynote speakers, workshops, and networking sessions for youth.',
        imageUrl: 'rauf-raif-denktas-kultur-ve-kongre-sarayi.jpg',
        createdBy: admin._id
      },
      {
        title: 'BKM Mutfak Stand-up Special',
        city: 'Nicosia',
        category: 'Music & Entertainment',
        date: addDays(15),
        time: '21:00',
        location: 'BKM Mutfak Nicosia',
        capacity: 240,
        description: 'Comedy night featuring rising stand-up artists from Istanbul and Nicosia at BKM Mutfak.',
        imageUrl: 'BKM-Mutfak-Nicosia.jpg',
        createdBy: admin._id
      }
    ];

    // Insert all events
    const insertedEvents = await Event.insertMany(sampleEvents);
    console.log(`✅ ${insertedEvents.length} events created successfully!`);

    console.log('✅ Database seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
