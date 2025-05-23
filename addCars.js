const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const cars = [
  {
    title: "تويوتا كامري 2023",
    make: "Toyota",
    model: "Camry",
    year: 2023,
    price: 120000,
    mileage: 5000,
    fuelType: "بنزين",
    transmission: "أوتوماتيك",
    location: "الرياض",
    images: ["images/car1.jpg"],
    userId: "QW1SIIwVofTHNm3HnP1VesjbIIg2",
    createdAt: new Date(),
    status: "active"
  },
  {
    title: "هيونداي سوناتا 2022",
    make: "Hyundai",
    model: "Sonata",
    year: 2022,
    price: 95000,
    mileage: 15000,
    fuelType: "بنزين",
    transmission: "أوتوماتيك",
    location: "جدة",
    images: ["images/car2.jpg"],
    userId: "QW1SIIwVofTHNm3HnP1VesjbIIg2",
    createdAt: new Date(),
    status: "active"
  },
  {
    title: "نيسان التيما 2021",
    make: "Nissan",
    model: "Altima",
    year: 2021,
    price: 85000,
    mileage: 30000,
    fuelType: "بنزين",
    transmission: "أوتوماتيك",
    location: "الدمام",
    images: ["images/car3.jpg"],
    userId: "QW1SIIwVofTHNm3HnP1VesjbIIg2",
    createdAt: new Date(),
    status: "active"
  },
  {
    title: "كيا K5 2022",
    make: "Kia",
    model: "K5",
    year: 2022,
    price: 90000,
    mileage: 20000,
    fuelType: "بنزين",
    transmission: "أوتوماتيك",
    location: "الرياض",
    images: ["images/car4.jpg"],
    userId: "QW1SIIwVofTHNm3HnP1VesjbIIg2",
    createdAt: new Date(),
    status: "active"
  }
];

async function addCars() {
  for (const car of cars) {
    await db.collection('cars').add(car);
    console.log('Added car:', car.title);
  }
  console.log('All cars added!');
  process.exit(0);
}

addCars().catch(console.error); 