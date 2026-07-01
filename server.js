import express from 'express';
import cors from 'cors';
import pkg from '@mathieuc/tradingview';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const quotesPath = path.join(__dirname, 'quotes.json');
let ddQuotes = {};
try {
  ddQuotes = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
} catch (e) {
  console.error("Failed to load quotes.json", e);
}

// Caching Maps
const quoteCache = new Map();
const searchCache = new Map();
const QUOTE_TTL = 15000; // 15 seconds
const SEARCH_TTL = 60000; // 60 seconds

// Function to fetch quote data
async function getQuoteData(symbol, sessionId = null) {
  const now = Date.now();
  if (quoteCache.has(symbol)) {
    const cached = quoteCache.get(symbol);
    if (now - cached.timestamp < QUOTE_TTL) {
      return cached.data;
    }
  }

  return new Promise((resolve, reject) => {
    try {
      const client = new pkg.Client();
      const quoteSession = new client.Session.Quote({ fields: 'all' });
      const market = new quoteSession.Market(symbol);

      let dataResolved = false;
      let result = { price: '未知', change: '未知' };

      market.onData((data) => {
        if (data.lp !== undefined) result.price = data.lp;
        if (data.chp !== undefined) result.change = data.chp;
        
        if (!dataResolved && result.price !== '未知' && result.change !== '未知') {
          dataResolved = true;
          market.close();
          client.end();
          quoteCache.set(symbol, { data: result, timestamp: Date.now() });
          resolve(result);
        }
      });
      
      market.onError((err) => {
        if (!dataResolved) {
          dataResolved = true;
          market.close();
          client.end();
          reject(err);
        }
      });
      
      setTimeout(() => {
        if (!dataResolved) {
          dataResolved = true;
          market.close();
          client.end();
          quoteCache.set(symbol, { data: result, timestamp: Date.now() });
          resolve(result);
        }
      }, 3000); // 3 seconds timeout
      
    } catch (e) {
      reject(e);
    }
  });
}

// API: Search
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  
  const now = Date.now();
  if (searchCache.has(q)) {
    const cached = searchCache.get(q);
    if (now - cached.timestamp < SEARCH_TTL) {
      return res.json(cached.data);
    }
  }

  try {
    const results = await pkg.searchMarket(q);
    // Map to a clean format
    const formatted = results.map(r => ({
      symbol: `${r.exchange}:${r.symbol}`,
      description: r.description,
      type: r.type,
      exchange: r.exchange
    }));
    searchCache.set(q, { data: formatted, timestamp: Date.now() });
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get Quote
app.get('/api/quote', async (req, res) => {
  const { symbol, session } = req.query;
  if (!symbol) return res.status(400).json({ error: 'Missing symbol' });
  
  try {
    const data = await getQuoteData(symbol, session);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Ask DD
app.get('/api/ask-dd', async (req, res) => {
  const { symbol, session } = req.query;
  
  try {
    let quoteData = { price: '未知', change: '未知' };
    try {
      quoteData = await getQuoteData(symbol, session);
    } catch (e) {
      console.warn("Could not fetch quote for DD:", e);
    }

    const price = quoteData.price || '未知';
    const chg = quoteData.change ? quoteData.change.toFixed(2) : '未知';
    
    if (process.env.OPENROUTER_API_KEY) {
      const prompt = `
你現在扮演一位幣圈與股市的著名反指標 KOL，大家都叫你「DD」。
你的特色是：你極度自信，但每次你說看多，市場就暴跌；你說看空，市場就暴漲。你經常被市場教訓到爆倉，還會找各種荒謬的藉口。
這裡有一些你的經典語錄供你參考語氣：${JSON.stringify(ddQuotes)}

現在，有韭菜(用戶)來問你對於商品 ${symbol} 的看法。
目前該商品的最新價格是 ${price}，日漲跌幅是 ${chg}。
請結合目前的價格走勢，用你那充滿自信但註定會被打臉的「反指標語氣」給出一段簡短的交易心法或建議（大約 50 字以內）。
請務必包含你的口頭禪或類似的浮誇言詞。`;

      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "model": "nvidia/nemotron-3-ultra-550b-a55b:free",
            "messages": [
              {"role": "user", "content": prompt}
            ]
          })
        });
        
        const result = await response.json();
        
        if (result.choices && result.choices.length > 0) {
          res.json({ message: result.choices[0].message.content });
        } else {
          console.error("OpenRouter Error:", result);
          throw new Error("Invalid response from OpenRouter");
        }
      } catch (err) {
        console.error("LLM Error:", err);
        res.status(500).json({ error: "LLM 呼叫失敗" });
      }
    } else {
      // Fallback Mock
      const categories = Object.keys(ddQuotes);
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      const quotesInCategory = ddQuotes[randomCategory];
      const randomQuote = quotesInCategory[Math.floor(Math.random() * quotesInCategory.length)];
      
      let analysis = `(這是模擬回覆，請在 .env 設定 GEMINI_API_KEY)\n這支 ${symbol} 現在價格 ${price} (漲跌 ${chg})！`;
      if (randomCategory === 'buy_dip') analysis += `現在跌剛好，無腦抄底怎麼輸！${randomQuote}`;
      else if (randomCategory === 'short') analysis += `這點位做空簡直送分題！${randomQuote}`;
      else analysis += `肯定是莊家在搞鬼！${randomQuote}`;
      
      res.json({ message: analysis });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`DD Terminal Backend running on http://localhost:${PORT}`);
});
