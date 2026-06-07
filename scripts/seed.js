require('dotenv').config();

const connectDatabase = require('../src/config/database');
const Park = require('../src/models/Park');
const Review = require('../src/models/Review');
const User = require('../src/models/User');

const demoPassword = 'MeetNSniffDemo123!';

const users = [
  {
    username: 'admin',
    email: 'admin@meetn-sniff.demo',
    displayName: 'Demo Admin',
    role: 'admin',
    dog: { name: 'Scout', breed: 'Mixed Breed', size: 'medium', birthYear: 2020, temperament: ['calm'] },
  },
  {
    username: 'marlon',
    email: 'marlon@meetn-sniff.demo',
    displayName: 'Marlon',
    role: 'user',
    dog: { name: 'Nala', breed: 'Labrador', size: 'medium', birthYear: 2021, temperament: ['friendly', 'playful'] },
  },
  {
    username: 'gamal',
    email: 'gamal@meetn-sniff.demo',
    displayName: 'Gamal',
    role: 'user',
    dog: { name: 'Fritz', breed: 'Dachshund', size: 'small', birthYear: 2019, temperament: ['curious'] },
  },
];

const parks = [
  {
    name: 'Hundezone Prater',
    slug: 'hundezone-prater',
    description: 'Spacious dog area near Prater Hauptallee with lots of room for walks.',
    address: { street: 'Prater Hauptallee', city: 'Wien', postalCode: '1020', country: 'Austria' },
    location: { type: 'Point', coordinates: [16.397, 48.216] },
    tags: ['off-leash', 'spacious', 'popular'],
    amenities: ['benches', 'shade', 'waste-bags'],
    rules: { leashRequired: false, fenced: true, dogWasteBags: true },
  },
  {
    name: 'Hundezone Donauinsel',
    slug: 'hundezone-donauinsel',
    description: 'Open riverside area for longer walks and dog meetups.',
    address: { street: 'Donauinsel', city: 'Wien', postalCode: '1220', country: 'Austria' },
    location: { type: 'Point', coordinates: [16.414, 48.232] },
    tags: ['riverside', 'off-leash', 'large'],
    amenities: ['water', 'waste-bags'],
    rules: { leashRequired: false, fenced: false, dogWasteBags: true },
  },
  {
    name: 'Hundezone Augarten',
    slug: 'hundezone-augarten',
    description: 'Calmer walking area around Augarten with shaded paths.',
    address: { street: 'Augarten', city: 'Wien', postalCode: '1020', country: 'Austria' },
    location: { type: 'Point', coordinates: [16.38, 48.225] },
    tags: ['shady', 'calm', 'walking'],
    amenities: ['benches', 'shade'],
    rules: { leashRequired: true, fenced: false, dogWasteBags: true },
  },
  {
    name: 'Hundezone Stadtpark Umgebung',
    slug: 'hundezone-stadtpark-umgebung',
    description: 'Central park area for short walks before or after work.',
    address: { street: 'Stadtpark', city: 'Wien', postalCode: '1010', country: 'Austria' },
    location: { type: 'Point', coordinates: [16.379, 48.205] },
    tags: ['central', 'busy', 'walking'],
    amenities: ['benches', 'water'],
    rules: { leashRequired: true, fenced: false, dogWasteBags: true },
  },
  {
    name: 'Hundezone Schweizergarten',
    slug: 'hundezone-schweizergarten',
    description: 'Green area near Hauptbahnhof with good access and open lawns.',
    address: { street: 'Schweizergarten', city: 'Wien', postalCode: '1030', country: 'Austria' },
    location: { type: 'Point', coordinates: [16.388, 48.187] },
    tags: ['accessible', 'lawns', 'walking'],
    amenities: ['benches', 'shade', 'waste-bags'],
    rules: { leashRequired: true, fenced: false, dogWasteBags: true },
  },
];

const reviewTemplates = [
  {
    rating: 5,
    title: 'Great for meeting other dogs',
    body: 'Plenty of space and a relaxed atmosphere.',
    tags: ['friendly', 'spacious'],
    dogFriendliness: 5,
    cleanliness: 4,
    crowdLevel: 3,
  },
  {
    rating: 4,
    title: 'Good everyday walk',
    body: 'Nice paths and easy to reach, but sometimes busy.',
    tags: ['walking', 'accessible'],
    dogFriendliness: 4,
    cleanliness: 4,
    crowdLevel: 4,
  },
];

async function createUser(data) {
  const user = new User(data);
  await user.setPassword(demoPassword);
  return user.save();
}

async function seed() {
  await connectDatabase(process.env.MONGODB_URI);

  const demoEmails = users.map((user) => user.email);
  const demoSlugs = parks.map((park) => park.slug);
  const existingDemoUsers = await User.find({ email: { $in: demoEmails } }).select('_id');
  const existingDemoParks = await Park.find({ slug: { $in: demoSlugs } }).select('_id');

  // Only remove records owned by this demo seed, so running it twice stays predictable.
  await Promise.all([
    Review.deleteMany({
      $or: [
        { user: { $in: existingDemoUsers.map((user) => user._id) } },
        { park: { $in: existingDemoParks.map((park) => park._id) } },
      ],
    }),
    User.deleteMany({ email: { $in: demoEmails } }),
    Park.deleteMany({ slug: { $in: demoSlugs } }),
  ]);

  const [admin, marlon, gamal] = await Promise.all(users.map(createUser));
  const createdParks = await Park.insertMany(parks.map((park) => ({ ...park, createdBy: admin._id })));

  const reviews = createdParks.flatMap((park, index) => [
    { ...reviewTemplates[index % reviewTemplates.length], park: park._id, user: marlon._id },
    { ...reviewTemplates[(index + 1) % reviewTemplates.length], park: park._id, user: gamal._id },
  ]);

  await Review.insertMany(reviews);
  await Promise.all(createdParks.map((park) => Review.recalculateParkRating(park._id)));

  console.log('Seed complete');
  console.log(`Users: ${users.length} (${demoEmails.join(', ')})`);
  console.log(`Parks: ${parks.length}`);
  console.log(`Reviews: ${reviews.length}`);
  console.log(`Admin login: ${users[0].email} / ${demoPassword}`);
  console.log(`User logins: ${users.slice(1).map((user) => user.email).join(', ')} / ${demoPassword}`);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exit(1);
  });
