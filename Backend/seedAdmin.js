import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for Admin Seeding');

    await User.deleteMany({ $or: [{ email: 'admin@vare.com' }, { username: 'admin' }] });
    console.log('Existing admin removed (if any)');

    await User.create({
        name: 'Default Admin',
        username: 'admin',
        email: 'admin@vare.com',
        password: 'admin123',
        address: 'Admin Headquarters',
        isAdmin: true
      });
      console.log('Default Admin created successfully');

    process.exit();
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
