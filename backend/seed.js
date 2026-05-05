require('dotenv').config();
const mongoose = require('mongoose');
const Admin    = require('./models/Admin');
const Menu     = require('./models/Menu');
const Feedback = require('./models/Feedback');
const { analyzeSentiment, extractKeywords, extractComplaintKeywords } = require('./utils/nlp');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_mess';
const toDateStr = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const samples = [
  { rating:5, feedback_text:'Amazing breakfast today! Fresh idli and crispy dosas. Really enjoyed!', meal_type:'Breakfast' },
  { rating:4, feedback_text:'Lunch was good. Dal and rice were tasty and properly cooked.', meal_type:'Lunch' },
  { rating:2, feedback_text:'Dinner was very oily. The sabzi had too much oil, felt unhealthy.', meal_type:'Dinner' },
  { rating:1, feedback_text:'Rice was stale and cold. Very disappointed with lunch quality.', meal_type:'Lunch' },
  { rating:5, feedback_text:'Best breakfast this week! Upma was hot, flavorful, perfectly seasoned.', meal_type:'Breakfast' },
  { rating:3, feedback_text:'Dinner was okay, roti was a bit hard and curry was bland.', meal_type:'Dinner' },
  { rating:2, feedback_text:'Food served late. By the time it reached us it was cold.', meal_type:'Lunch' },
  { rating:4, feedback_text:'Breakfast was nice and fresh today. Good quantity and tasty food!', meal_type:'Breakfast' },
  { rating:1, feedback_text:'I found hair in my food. Extremely unhygienic and unacceptable!', meal_type:'Dinner' },
  { rating:3, feedback_text:'Meal was okay today. Nothing great, nothing terrible.', meal_type:'Lunch' },
  { rating:5, feedback_text:'Excellent dinner! Paneer was fresh and sabzi was delicious.', meal_type:'Dinner' },
  { rating:2, feedback_text:'Dal was watery and tasteless. Roti was burnt. Needs improvement.', meal_type:'Dinner' },
  { rating:4, feedback_text:'Good quality breakfast. Poha was fresh and warm. Enjoyed it!', meal_type:'Breakfast' },
  { rating:1, feedback_text:'Rice was undercooked and hard. Could not eat it at all.', meal_type:'Lunch' },
  { rating:5, feedback_text:'Wonderful lunch today! Everything was fresh, hot and very tasty.', meal_type:'Lunch' },
  { rating:2, feedback_text:'Food smelled bad at dinner. Seemed stale or expired.', meal_type:'Dinner' },
  { rating:3, feedback_text:'Average breakfast. Quantity was sufficient but taste could be better.', meal_type:'Breakfast' },
  { rating:4, feedback_text:'Nice healthy dinner. Enjoyed vegetables and chapati. Satisfying.', meal_type:'Dinner' },
  { rating:1, feedback_text:'Mess was dirty. Plates were unclean, floor unhygienic. Disgusting.', meal_type:'Lunch' },
  { rating:5, feedback_text:'Amazing breakfast! Best poha I have had here. Crispy sev and fresh coriander!', meal_type:'Breakfast' },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const existing = await Admin.findOne({ username: 'admin' });
    if (!existing) {
      await Admin.create({ username: 'admin', password: 'admin123' });
      console.log('👤 Admin created → admin / admin123');
    } else {
      console.log('👤 Admin already exists.');
    }

    const today = toDateStr(new Date());
    const menus = [
      { date: today, meal_type: 'Breakfast', items: ['Idli & Sambar','Poha','Bread & Butter','Tea / Coffee','Seasonal Fruit'] },
      { date: today, meal_type: 'Lunch',     items: ['Steamed Rice','Dal Tadka','Aloo Gobi Sabzi','Chapati','Salad','Buttermilk'] },
      { date: today, meal_type: 'Dinner',    items: ['Paneer Butter Masala','Chapati / Paratha','Jeera Rice','Dal','Dessert'] },
    ];
    for (const m of menus) {
      await Menu.findOneAndUpdate({ date: m.date, meal_type: m.meal_type }, { $set: { items: m.items } }, { upsert: true, new: true });
    }
    console.log(`🍽️  Menu created for ${today}`);

    const count = await Feedback.countDocuments();
    if (count === 0) {
      const docs = samples.map(fb => {
        const { sentiment } = analyzeSentiment(fb.feedback_text, fb.rating);
        const keywords = [...new Set([...extractKeywords(fb.feedback_text, 10), ...extractComplaintKeywords(fb.feedback_text)])];
        const d = new Date(); d.setDate(d.getDate() - Math.floor(Math.random() * 7));
        return { ...fb, sentiment, keywords, date: d };
      });
      await Feedback.insertMany(docs);
      console.log(`📝 ${docs.length} sample feedback entries inserted`);
    } else {
      console.log(`📝 Feedback exists (${count} entries). Skipping.`);
    }

    console.log('\n🎉 Seeding complete! Run: npm start');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
