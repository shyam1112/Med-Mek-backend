import User from '../models/User';

export const seedSuperAdmin = async (): Promise<void> => {
  const adminUsername = process.env.ADMIN_USERNAME || 'superadmin';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@medmek.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const adminName = process.env.ADMIN_NAME || 'MedMek Admin';

  const existing = await User.findOne({ role: 'superadmin' });
  if (existing) return;

  await User.create({
    username: adminUsername,
    name: adminName,
    email: adminEmail,
    password: adminPassword,
    role: 'superadmin',
    status: 'approved',
    storeName: 'MedMek HQ',
  });

  console.log(`✓ Super admin seeded → username: "${adminUsername}" | password: "${adminPassword}"`);
  console.log('  Change ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_EMAIL in .env for production!');
};
