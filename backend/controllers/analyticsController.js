const Feedback = require('../models/Feedback');
const { aggregateKeywords, generateDailySummary } = require('../utils/nlp');

const startOfDay = date => { const d = new Date(date); d.setHours(0,0,0,0); return d; };
const endOfDay   = date => { const d = new Date(date); d.setHours(23,59,59,999); return d; };
const addDays    = (date, n) => { const d = new Date(date); d.setDate(d.getDate()+n); return d; };
const toDateStr  = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const getAnalytics = async (req, res) => {
  try {
    const { period = 'weekly' } = req.query;
    const now            = new Date();
    const todayStart     = startOfDay(now);
    const todayEnd       = endOfDay(now);
    const yesterdayStart = startOfDay(addDays(now, -1));
    const yesterdayEnd   = endOfDay(addDays(now, -1));
    const trendDays      = period === 'monthly' ? 30 : 7;
    const trendStart     = startOfDay(addDays(now, -(trendDays-1)));

    const [totalCount, avgAgg, sentAgg, mealAgg] = await Promise.all([
      Feedback.countDocuments(),
      Feedback.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]),
      Feedback.aggregate([{ $group: { _id: '$sentiment', count: { $sum: 1 } } }]),
      Feedback.aggregate([{ $group: { _id: '$meal_type', avg: { $avg: '$rating' }, count: { $sum: 1 } } }]),
    ]);

    const overallAvg    = avgAgg[0]?.avg || 0;
    const sentimentDist = { Positive: 0, Negative: 0, Neutral: 0 };
    sentAgg.forEach(s => { if (s._id) sentimentDist[s._id] = s.count; });
    const mealStats = mealAgg.map(m => ({ meal_type: m._id, avgRating: parseFloat(m.avg.toFixed(2)), count: m.count }));

    const todayFilter = { date: { $gte: todayStart, $lte: todayEnd } };
    const [todayCount, todayAvgAgg, todaySentAgg, todayMealAgg] = await Promise.all([
      Feedback.countDocuments(todayFilter),
      Feedback.aggregate([{ $match: todayFilter }, { $group: { _id: null, avg: { $avg: '$rating' } } }]),
      Feedback.aggregate([{ $match: todayFilter }, { $group: { _id: '$sentiment', count: { $sum: 1 } } }]),
      Feedback.aggregate([{ $match: todayFilter }, { $group: { _id: '$meal_type', avg: { $avg: '$rating' }, count: { $sum: 1 } } }]),
    ]);

    const todayAvg       = todayAvgAgg[0]?.avg || 0;
    const todaySentiment = { Positive: 0, Negative: 0, Neutral: 0 };
    todaySentAgg.forEach(s => { if (s._id) todaySentiment[s._id] = s.count; });
    const todayMealStats = todayMealAgg.map(m => ({ meal_type: m._id, avgRating: parseFloat(m.avg.toFixed(2)), count: m.count }));

    const yAgg = await Feedback.aggregate([
      { $match: { date: { $gte: yesterdayStart, $lte: yesterdayEnd } } },
      { $group: { _id: null, avg: { $avg: '$rating' } } },
    ]);
    const yesterdayAvg = yAgg[0]?.avg ?? null;

    const trendAgg = await Feedback.aggregate([
      { $match: { date: { $gte: trendStart, $lte: todayEnd } } },
      { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' }, day: { $dayOfMonth: '$date' } }, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);
    const trendMap = {};
    trendAgg.forEach(t => { trendMap[`${t._id.year}-${String(t._id.month).padStart(2,'0')}-${String(t._id.day).padStart(2,'0')}`] = { avg: parseFloat(t.avg.toFixed(2)), count: t.count }; });
    const trendLabels = [], trendValues = [], trendCounts = [];
    for (let i = trendDays-1; i >= 0; i--) {
      const k = toDateStr(addDays(now, -i));
      trendLabels.push(k); trendValues.push(trendMap[k]?.avg ?? null); trendCounts.push(trendMap[k]?.count ?? 0);
    }

    const negFbs = await Feedback.find({ sentiment: { $in: ['Negative','Neutral'] } }, 'keywords').lean();
    const topKeywords = aggregateKeywords(negFbs).slice(0, 10);

    const mealSentAgg = await Feedback.aggregate([{ $group: { _id: { meal_type: '$meal_type', sentiment: '$sentiment' }, count: { $sum: 1 } } }]);
    const mealSentiment = {};
    mealSentAgg.forEach(({ _id, count }) => {
      if (!_id.meal_type) return;
      if (!mealSentiment[_id.meal_type]) mealSentiment[_id.meal_type] = { Positive: 0, Negative: 0, Neutral: 0 };
      if (_id.sentiment) mealSentiment[_id.meal_type][_id.sentiment] = count;
    });

    const dailySummary = generateDailySummary({ avgRating: todayAvg, total: todayCount, sentiment: todaySentiment, topKeywords, mealStats: todayMealStats, yesterdayAvg });

    res.json({
      success: true,
      data: {
        overall: { totalFeedback: totalCount, avgRating: parseFloat(overallAvg.toFixed(2)), sentimentDist, mealStats },
        today:   { totalFeedback: todayCount, avgRating: parseFloat(todayAvg.toFixed(2)), sentimentDist: todaySentiment, mealStats: todayMealStats, yesterdayAvg: yesterdayAvg !== null ? parseFloat(yesterdayAvg.toFixed(2)) : null },
        trend:   { labels: trendLabels, values: trendValues, counts: trendCounts, period },
        topKeywords, mealSentiment, dailySummary,
      },
    });
  } catch (err) {
    console.error('getAnalytics:', err);
    res.status(500).json({ success: false, message: 'Analytics error.' });
  }
};

module.exports = { getAnalytics };
