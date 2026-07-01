import './style.css';

// DOM Elements
const sessionInput = document.getElementById('session-input');
const apiKeyInput = document.getElementById('api-key-input');
const symbolSearch = document.getElementById('symbol-search');
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');
const apiSaveMsg = document.getElementById('api-save-msg');
const ddModeBadge = document.getElementById('dd-mode-badge');

const marketSignalEl = document.getElementById('market-signal');
const ddActionEl = document.getElementById('dd-action');
const antiDdSignalEl = document.getElementById('anti-dd-signal');
const ddQuoteEl = document.getElementById('dd-quote');

const askBtn = document.getElementById('ask-btn');
const askResponse = document.getElementById('ask-dd-response');

const marqueeContent = document.getElementById('marquee-content');

// State
let currentSymbol = 'BINANCE:BTCUSDT';
let currentPrice = 0;
let tvWidget = null;
let pollInterval = null;
let searchTimeout = null;

// Marquee Quotes
const marqueeQuotes = [
  "無腦抄底怎麼輸", "我要歐印多了 各位我們頂峰相見", "空完彈 3%", 
  "我的幣安都只會送我爆倉通知📢", "這波下跌只是技術性調整", 
  "幹賣完噴上去", "上車後割肉 現在你是我爸"
];

function initMarquee() {
  marqueeContent.innerText = marqueeQuotes.join(" 🚀 ") + " 🚀 " + marqueeQuotes.join(" 🚀 ");
}

// Load TradingView Widget
function loadTVWidget(symbol) {
  const container = document.getElementById('tv-chart');
  container.innerHTML = ''; // clear old
  
  tvWidget = new window.TradingView.widget({
    "autosize": true,
    "symbol": symbol,
    "interval": "15",
    "timezone": "Etc/UTC",
    "theme": "dark",
    "style": "1",
    "locale": "zh_TW",
    "enable_publishing": false,
    "backgroundColor": "#0B0E14",
    "gridColor": "rgba(255, 255, 255, 0.06)",
    "hide_top_toolbar": false,
    "hide_legend": false,
    "save_image": false,
    "container_id": "tv-chart"
  });
}

function loadTVScript(callback) {
  if (window.TradingView) {
    callback();
    return;
  }
  const script = document.createElement('script');
  script.src = "https://s3.tradingview.com/tv.js";
  script.async = true;
  script.onload = callback;
  document.head.appendChild(script);
}

// Search Logic
async function performSearch(q) {
  if (!q) {
    searchResults.classList.add('hidden');
    return;
  }
  
  try {
    const res = await fetch(`http://localhost:3000/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    renderSearchResults(data);
  } catch (err) {
    console.error("Search error", err);
    renderSearchResults({ error: true });
  }
}

symbolSearch.addEventListener('input', (e) => {
  const q = e.target.value;
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    performSearch(q);
  }, 800); // Increased Debounce
});

symbolSearch.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    clearTimeout(searchTimeout);
    performSearch(e.target.value);
  }
});

searchBtn.addEventListener('click', () => {
  clearTimeout(searchTimeout);
  performSearch(symbolSearch.value);
});

function renderSearchResults(results) {
  searchResults.innerHTML = '';
  
  if (!results || results.error || !Array.isArray(results) || results.length === 0) {
    searchResults.innerHTML = '<div class="autocomplete-item"><span class="desc">找不到相符的商品</span></div>';
    searchResults.classList.remove('hidden');
    return;
  }
  
  results.slice(0, 10).forEach(item => {
    const div = document.createElement('div');
    div.className = 'autocomplete-item';
    div.innerHTML = `<span><strong>${item.symbol}</strong></span> <span class="desc">${item.description}</span>`;
    div.addEventListener('click', () => {
      selectSymbol(item.symbol);
    });
    searchResults.appendChild(div);
  });
  searchResults.classList.remove('hidden');
}

function selectSymbol(symbol) {
  currentSymbol = symbol;
  symbolSearch.value = symbol;
  searchResults.classList.add('hidden');
  loadTVWidget(currentSymbol);
  fetchQuote();
  
  // Clear LLM response area
  askResponse.innerText = "點擊上方按鈕，DD 將為您解析當前商品";
}

// Hide autocomplete when click outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-container')) {
    searchResults.classList.add('hidden');
  }
});

// Fetch Quote
async function fetchQuote() {
  try {
    const session = sessionInput.value;
    const url = `http://localhost:3000/api/quote?symbol=${currentSymbol}${session ? '&session='+session : ''}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.price) {
      currentPrice = data.price;
      updateSimulatedSignals();
    }
  } catch (error) {
    console.error("Fetch quote error:", error);
  }
}

// Simulate Signals for Left Panel
function updateSimulatedSignals() {
  const signals = ["強烈買入", "買入", "中性", "賣出", "強烈賣出"];
  const randomSignal = signals[Math.floor(Math.random() * signals.length)];
  
  marketSignalEl.innerText = randomSignal;
  
  if (randomSignal.includes("買入")) {
    ddActionEl.innerText = "開 100x 做空";
    ddActionEl.className = "value text-danger";
    antiDdSignalEl.innerText = "做多 (勝率 99%)";
    antiDdSignalEl.className = "value text-success glow";
    ddQuoteEl.innerText = '"這點位做空，簡直是送分題，等著收錢"';
  } else if (randomSignal.includes("賣出")) {
    ddActionEl.innerText = "開 100x 做多";
    ddActionEl.className = "value text-success";
    antiDdSignalEl.innerText = "做空 (勝率 99%)";
    antiDdSignalEl.className = "value text-danger glow";
    ddQuoteEl.innerText = '"大跌就是給你買的，不敢買活該窮"';
  } else {
    ddActionEl.innerText = "觀望中...";
    ddActionEl.className = "value text-neutral";
    antiDdSignalEl.innerText = "維持現狀";
    antiDdSignalEl.className = "value text-neutral";
    ddQuoteEl.innerText = '"這波下跌只是技術性調整，主力在洗盤而已"';
  }
}

// Ask DD Logic
askBtn.addEventListener('click', async () => {
  askResponse.innerText = "DD 大師正在看盤思考中...";
  try {
    const headers = {};
    if (apiKeyInput.value) {
      headers['x-openrouter-key'] = apiKeyInput.value;
    }
    
    const res = await fetch(`http://localhost:3000/api/ask-dd?symbol=${encodeURIComponent(currentSymbol)}`, {
      headers
    });
    
    const data = await res.json();
    typewriterEffect(data.message || "發生錯誤");
  } catch (err) {
    askResponse.innerText = "DD 拒絕回答 (連線錯誤)";
  }
});

function typewriterEffect(text) {
  askResponse.innerText = "";
  let i = 0;
  const timer = setInterval(() => {
    if (i < text.length) {
      askResponse.innerText += text.charAt(i);
      i++;
    } else {
      clearInterval(timer);
    }
  }, 40);
}

function updateModeBadge() {
  if (apiKeyInput.value.trim() !== '') {
    ddModeBadge.innerText = "🟢 LLM 模型已啟用";
    ddModeBadge.style.background = "rgba(0,255,136,0.2)";
    ddModeBadge.style.color = "var(--neon-green)";
    ddModeBadge.style.borderColor = "var(--neon-green)";
  } else {
    ddModeBadge.innerText = "🤡 模擬模式";
    ddModeBadge.style.background = "rgba(255,184,0,0.2)";
    ddModeBadge.style.color = "var(--neon-yellow)";
    ddModeBadge.style.borderColor = "var(--neon-yellow)";
  }
}

// Initializer
window.addEventListener('DOMContentLoaded', () => {
  // Load saved API Key
  const savedKey = localStorage.getItem('openRouterApiKey');
  if (savedKey) {
    apiKeyInput.value = savedKey;
  }
  updateModeBadge();
  
  // Save API Key on input/change
  apiKeyInput.addEventListener('input', (e) => {
    localStorage.setItem('openRouterApiKey', e.target.value);
    updateModeBadge();
  });

  apiKeyInput.addEventListener('change', () => {
    apiSaveMsg.style.opacity = 1;
    setTimeout(() => {
      apiSaveMsg.style.opacity = 0;
    }, 2000);
  });

  initMarquee();
  loadTVScript(() => {
    loadTVWidget(currentSymbol);
  });
  
  fetchQuote();
  pollInterval = setInterval(fetchQuote, 10000); // 10 seconds polling
});
