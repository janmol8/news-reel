const Parser = require('rss-parser');
const parser = new Parser({
  customFields: {
    item: [
      ['media:thumbnail', 'media:thumbnail'],
      ['enclosure', 'enclosure'],
      ['media:content', 'media:content'],
      ['image', 'image'],
      ['description', 'description'],
      ['content:encoded', 'contentEncoded']
    ],
  }
});

async function check() {
  const urls = [
    "https://www.moneycontrol.com/rss/business.xml",
    "https://economictimes.indiatimes.com/news/economy/rssfeeds/13733806.cms",
    "https://www.livemint.com/rss/economy"
  ];
  
  for (const url of urls) {
    try {
      console.log(`\n--- Checking ${url} ---`);
      const feed = await parser.parseURL(url);
      const item = feed.items[0];
      console.log("Title:", item.title);
      console.log("Keys:", Object.keys(item));
      console.log("Media Content:", item['media:content']);
      console.log("Enclosure:", item.enclosure);
      console.log("Thumbnail:", item['media:thumbnail']);
      if (item.description) console.log("Description has img:", item.description.includes('<img'));
    } catch (e) {
      console.log(`Error checking ${url}: ${e.message}`);
    }
  }
}

check();