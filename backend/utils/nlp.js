const POSITIVE_WORDS = new Set(['good','great','excellent','amazing','tasty','fresh','delicious','nice','wonderful','perfect','love','liked','enjoyed','satisfied','happy','clean','healthy','yummy','best','hot','warm','crispy','soft','sweet','flavorful','nutritious','proper','quality','better','improved','awesome','superb','brilliant','fantastic','pleasing','appetizing','well','cooked','timely','quick','prompt','sufficient','enough','full','variety','balanced','hygienic','neat','rich','tender','juicy','hearty','nourishing','filling','refreshing','outstanding']);
const NEGATIVE_WORDS = new Set(['bad','oily','cold','late','stale','rotten','awful','terrible','disgusting','horrible','worst','dirty','unhealthy','tasteless','bland','undercooked','overcooked','spicy','salty','expired','waste','poor','slow','raw','hard','burned','burnt','sour','smell','smelly','insects','worms','stones','plastic','hair','unclean','unhygienic','cockroach','flies','watery','insufficient','less','disappointed','disgusted','pathetic','unacceptable','moldy','dry','soggy','greasy','lumpy','flavorless','unpleasant','dissatisfied','contaminated','delay','delayed','missing','never','not']);
const COMPLAINT_KEYWORDS = new Set(['oily','cold','late','stale','dirty','smelly','insects','worms','stones','plastic','hair','unclean','unhygienic','cockroach','flies','watery','raw','burned','burnt','sour','bland','tasteless','hard','dry','soggy','greasy','undercooked','overcooked','insufficient','less','delay','delayed','rotten','moldy','contaminated','expired','unhealthy','poor']);
const STOP_WORDS = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','is','was','are','were','be','been','have','has','had','do','does','did','will','would','could','should','may','might','it','this','that','i','me','my','we','our','you','your','he','she','they','them','what','which','who','how','when','where','all','some','no','not','only','so','than','too','very','just','about','food','today','meal','mess','really','also','there','here','as','if','from','up','out','by','am','then','now','own','want','need','got','get','give']);
const NEGATION_WORDS = new Set(['not','no','never','neither','nor','nothing']);

function analyzeSentiment(text, rating) {
  if (!text) return { sentiment: 'Neutral', score: 0, positiveCount: 0, negativeCount: 0 };
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  let pos = 0, neg = 0, negated = false;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (NEGATION_WORDS.has(w)) { negated = true; continue; }
    if (POSITIVE_WORDS.has(w)) { negated ? neg++ : pos++; negated = false; }
    else if (NEGATIVE_WORDS.has(w)) { negated ? pos++ : neg++; negated = false; }
    else if (negated) negated = false;
  }
  let score = pos - neg;
  if (rating !== undefined) {
    if (rating >= 4 && score === 0) score = 1;
    if (rating <= 2 && score === 0) score = -1;
    if (rating === 1) score = Math.min(score, -1);
    if (rating === 5) score = Math.max(score, 1);
  }
  const sentiment = score > 0 ? 'Positive' : score < 0 ? 'Negative' : 'Neutral';
  return { sentiment, score, positiveCount: pos, negativeCount: neg };
}

function extractKeywords(text, topN = 10) {
  if (!text) return [];
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  const freq = {};
  words.forEach(w => { if (!STOP_WORDS.has(w) && w.length > 2) freq[w] = (freq[w] || 0) + 1; });
  return Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0, topN).map(([w]) => w);
}

function extractComplaintKeywords(text) {
  if (!text) return [];
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  return [...new Set(words.filter(w => COMPLAINT_KEYWORDS.has(w)))];
}

function aggregateKeywords(feedbacks) {
  const counts = {};
  feedbacks.forEach(fb => (fb.keywords || []).forEach(k => { counts[k] = (counts[k] || 0) + 1; }));
  return Object.entries(counts).map(([keyword, count]) => ({ keyword, count })).sort((a,b) => b.count - a.count);
}

function generateDailySummary({ avgRating, total, sentiment, topKeywords, mealStats, yesterdayAvg }) {
  const lines = [];
  if (total === 0) { lines.push('📋 **No feedback received today.**'); return lines; }
  lines.push(`📊 **Total Feedback Today:** ${total} response${total !== 1 ? 's' : ''}`);
  const ratingEmoji = avgRating >= 4 ? '🌟' : avgRating >= 3 ? '⭐' : '⚠️';
  lines.push(`${ratingEmoji} **Average Rating:** ${avgRating.toFixed(1)} / 5.0`);
  if (yesterdayAvg !== null && yesterdayAvg !== undefined) {
    const diff = avgRating - yesterdayAvg;
    if (Math.abs(diff) >= 0.1) {
      lines.push(`${diff > 0 ? '📈' : '📉'} **Trend:** Rating ${diff > 0 ? `improved by ${diff.toFixed(1)}` : `dropped by ${Math.abs(diff).toFixed(1)}`} vs yesterday (${yesterdayAvg.toFixed(1)})`);
    } else {
      lines.push(`➡️ **Trend:** Rating remained stable compared to yesterday.`);
    }
  }
  const { Positive: pos = 0, Negative: neg = 0, Neutral: neu = 0 } = sentiment;
  lines.push(`😊 **Sentiment:** ${pos} Positive | ${neg} Negative | ${neu} Neutral`);
  if (neg > pos) lines.push(`🚨 **Alert:** More negative feedback than positive today!`);
  else if (pos > neg * 2) lines.push(`🎉 **Highlight:** Students are overwhelmingly satisfied today!`);
  if (mealStats && mealStats.length > 0) {
    const worst = [...mealStats].sort((a,b) => a.avgRating - b.avgRating)[0];
    const best  = [...mealStats].sort((a,b) => b.avgRating - a.avgRating)[0];
    if (worst && worst.avgRating < 3.0) lines.push(`⚠️ **Low Rated:** ${worst.meal_type} rated poorly (${worst.avgRating.toFixed(1)}/5).`);
    if (best  && best.avgRating  >= 4.0) lines.push(`✅ **Best Meal:** ${best.meal_type} received great ratings (${best.avgRating.toFixed(1)}/5).`);
  }
  if (topKeywords && topKeywords.length > 0) {
    const complaints = topKeywords.filter(k => COMPLAINT_KEYWORDS.has(k.keyword)).slice(0, 3);
    if (complaints.length > 0) {
      lines.push(`🔍 **Top Complaints:** ${complaints.map(c => `"${c.keyword}" (${c.count}×)`).join(', ')}`);
    }
  }
  if (topKeywords.some(k => k.keyword === 'cold'))  lines.push(`💡 **Tip:** Ensure food is served at proper temperature.`);
  if (topKeywords.some(k => k.keyword === 'oily'))  lines.push(`💡 **Tip:** Reduce oil usage in cooking.`);
  if (topKeywords.some(k => k.keyword === 'late'))  lines.push(`💡 **Tip:** Improve meal serving punctuality.`);
  if (topKeywords.some(k => k.keyword === 'bland')) lines.push(`💡 **Tip:** Improve seasoning and recipe variety.`);
  return lines;
}

module.exports = { analyzeSentiment, extractKeywords, extractComplaintKeywords, aggregateKeywords, generateDailySummary, COMPLAINT_KEYWORDS };
