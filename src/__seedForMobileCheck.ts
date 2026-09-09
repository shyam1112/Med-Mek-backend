import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import fs from 'fs';
import User from './models/User';
import Medicine from './models/Medicine';
import Customer from './models/Customer';

async function main() {
  const uri = fs.readFileSync('/tmp/claude-1000/-home-shyam-Projects-a-shyam-med-mek/fb5e2a7e-dfe6-4565-9c17-e6deb3f2dbb9/scratchpad/test-mongo-uri5.txt', 'utf-8').trim();
  await mongoose.connect(uri);
  const user = await User.findOne({ username: 'testadmin5' });
  for (let i = 1; i <= 8; i++) {
    await Medicine.create({
      owner: user!._id, name: `Test Medicine ${i}`, category: 'Analgesic', unitOfMeasure: 'Strip',
      unitsPerPack: 10, purchasePrice: 20 + i, sellingPrice: 30 + i, gstPercentage: 12,
      currentStock: 100 + i, batchNumber: `B${100 + i}`, expiryDate: new Date('2028-01-01'),
    });
  }
  await Customer.create({ owner: user!._id, name: 'Test Customer', mobile: '9998887776', address: 'Test address' });
  console.log('seeded');
  await mongoose.disconnect();
}
main();
