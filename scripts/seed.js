const { Pool } = require('pg');
require('dotenv').config();

const logger = require('../src/utils/logger');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'multilingual_mandi',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

// Sample commodity data
const commodities = [
  {
    name_en: 'Rice',
    name_hi: 'चावल',
    name_te: 'బియ్యం',
    name_ta: 'அரிசி',
    name_kn: 'ಅಕ್ಕಿ',
    name_bn: 'চাল',
    name_mr: 'तांदूळ',
    category: 'grains',
    unit: 'kg',
    quality_grades: ['Grade A', 'Grade B', 'Grade C'],
    peak_months: [10, 11, 12, 1],
    off_season_months: [5, 6, 7, 8],
    regional_names: {
      'Andhra Pradesh': ['Biyyam', 'Vadlu'],
      'Tamil Nadu': ['Arisi', 'Nellu'],
      'Karnataka': ['Akki', 'Bhatta'],
      'West Bengal': ['Chal', 'Dhan']
    }
  },
  {
    name_en: 'Wheat',
    name_hi: 'गेहूं',
    name_te: 'గోధుమ',
    name_ta: 'கோதுமை',
    name_kn: 'ಗೋಧಿ',
    name_bn: 'গম',
    name_mr: 'गहू',
    category: 'grains',
    unit: 'kg',
    quality_grades: ['Sharbati', 'Lokwan', 'HD-2967'],
    peak_months: [3, 4, 5],
    off_season_months: [9, 10, 11],
    regional_names: {
      'Punjab': ['Kanak', 'Gehun'],
      'Haryana': ['Gehun', 'Kanak'],
      'Uttar Pradesh': ['Gehun', 'Godhum']
    }
  },
  {
    name_en: 'Onion',
    name_hi: 'प्याज',
    name_te: 'ఉల్లిపాయ',
    name_ta: 'வெங்காயம்',
    name_kn: 'ಈರುಳ್ಳಿ',
    name_bn: 'পেঁয়াজ',
    name_mr: 'कांदा',
    category: 'vegetables',
    unit: 'kg',
    quality_grades: ['Premium', 'Medium', 'Small'],
    peak_months: [11, 12, 1, 2],
    off_season_months: [6, 7, 8],
    regional_names: {
      'Maharashtra': ['Kanda', 'Pyaj'],
      'Karnataka': ['Eerulli', 'Nirulli'],
      'Andhra Pradesh': ['Ullipaya', 'Vengayam']
    }
  },
  {
    name_en: 'Tomato',
    name_hi: 'टमाटर',
    name_te: 'టమాటో',
    name_ta: 'தக்காளி',
    name_kn: 'ಟೊಮೇಟೊ',
    name_bn: 'টমেটো',
    name_mr: 'टोमॅटो',
    category: 'vegetables',
    unit: 'kg',
    quality_grades: ['A Grade', 'B Grade', 'C Grade'],
    peak_months: [10, 11, 12, 1, 2, 3],
    off_season_months: [6, 7, 8],
    regional_names: {
      'Karnataka': ['Tomato', 'Thakkali'],
      'Andhra Pradesh': ['Tomato', 'Thakkali'],
      'Tamil Nadu': ['Thakkali', 'Tomato']
    }
  },
  {
    name_en: 'Turmeric',
    name_hi: 'हल्दी',
    name_te: 'పసుపు',
    name_ta: 'மஞ்சள்',
    name_kn: 'ಅರಿಶಿನ',
    name_bn: 'হলুদ',
    name_mr: 'हळद',
    category: 'spices',
    unit: 'kg',
    quality_grades: ['Finger', 'Bulb', 'Powder'],
    peak_months: [1, 2, 3, 4],
    off_season_months: [7, 8, 9],
    regional_names: {
      'Andhra Pradesh': ['Pasupu', 'Arishina'],
      'Tamil Nadu': ['Manjal', 'Pasupu'],
      'Karnataka': ['Arishina', 'Manjal']
    }
  }
];

// Sample price data
const generatePriceData = (commodityId, locations) => {
  return locations.map(location => ({
    commodity_id: commodityId,
    location_state: location.state,
    location_district: location.district,
    location_market: location.market,
    price_min: Math.floor(Math.random() * 20) + 10,
    price_max: Math.floor(Math.random() * 30) + 40,
    price_modal: Math.floor(Math.random() * 20) + 25,
    quality: 'Medium',
    quantity: 100,
    unit: 'kg',
    source: 'Government API',
    confidence: 0.85
  }));
};

const sampleLocations = [
  { state: 'Andhra Pradesh', district: 'Krishna', market: 'Vijayawada Mandi' },
  { state: 'Andhra Pradesh', district: 'Guntur', market: 'Guntur Mandi' },
  { state: 'Karnataka', district: 'Bangalore Rural', market: 'Bangalore Mandi' },
  { state: 'Karnataka', district: 'Mysore', market: 'Mysore Mandi' },
  { state: 'Tamil Nadu', district: 'Chennai', market: 'Koyambedu Market' },
  { state: 'Tamil Nadu', district: 'Coimbatore', market: 'Coimbatore Mandi' },
  { state: 'Maharashtra', district: 'Pune', market: 'Pune Mandi' },
  { state: 'Maharashtra', district: 'Nashik', market: 'Nashik Mandi' },
];

async function seedDatabase() {
  const pool = new Pool(dbConfig);
  
  try {
    logger.info('Starting database seeding...');
    
    // Clear existing data
    await pool.query('TRUNCATE TABLE price_data, commodities RESTART IDENTITY CASCADE');
    logger.info('Cleared existing data');
    
    // Insert commodities
    const commodityIds = [];
    for (const commodity of commodities) {
      const result = await pool.query(`
        INSERT INTO commodities (
          name_en, name_hi, name_te, name_ta, name_kn, name_bn, name_mr,
          category, unit, quality_grades, peak_months, off_season_months, regional_names
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING commodity_id
      `, [
        commodity.name_en, commodity.name_hi, commodity.name_te, commodity.name_ta,
        commodity.name_kn, commodity.name_bn, commodity.name_mr, commodity.category,
        commodity.unit, commodity.quality_grades, commodity.peak_months,
        commodity.off_season_months, JSON.stringify(commodity.regional_names)
      ]);
      
      commodityIds.push(result.rows[0].commodity_id);
      logger.info(`Inserted commodity: ${commodity.name_en}`);
    }
    
    // Insert price data
    for (let i = 0; i < commodityIds.length; i++) {
      const priceData = generatePriceData(commodityIds[i], sampleLocations);
      
      for (const price of priceData) {
        await pool.query(`
          INSERT INTO price_data (
            commodity_id, location_state, location_district, location_market,
            price_min, price_max, price_modal, quality, quantity, unit, source, confidence
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          price.commodity_id, price.location_state, price.location_district,
          price.location_market, price.price_min, price.price_max, price.price_modal,
          price.quality, price.quantity, price.unit, price.source, price.confidence
        ]);
      }
      
      logger.info(`Inserted price data for commodity ${i + 1}`);
    }
    
    // Insert sample translation cache entries
    const sampleTranslations = [
      {
        source_text: 'What is the price of rice?',
        source_lang: 'en',
        target_lang: 'hi',
        translation: 'चावल की कीमत क्या है?',
        context: 'price_inquiry'
      },
      {
        source_text: 'I want to buy onions',
        source_lang: 'en',
        target_lang: 'te',
        translation: 'నేను ఉల్లిపాయలు కొనాలనుకుంటున్నాను',
        context: 'purchase_intent'
      },
      {
        source_text: 'Good quality tomatoes available',
        source_lang: 'en',
        target_lang: 'ta',
        translation: 'நல்ல தரமான தக்காளி கிடைக்கிறது',
        context: 'product_availability'
      }
    ];
    
    for (const translation of sampleTranslations) {
      await pool.query(`
        INSERT INTO translation_cache (
          source_text, source_lang, target_lang, translation, context
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        translation.source_text, translation.source_lang, translation.target_lang,
        translation.translation, translation.context
      ]);
    }
    
    logger.info('Inserted sample translation cache entries');
    
    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error('Seeding failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info('Seed script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seed script failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };