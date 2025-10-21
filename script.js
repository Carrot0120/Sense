document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 元素引用 ---
    const apiKeyInput = document.getElementById('gemini-api-key');
    const verifyKeyBtn = document.getElementById('verify-key-btn');
    const apiStatus = document.getElementById('api-status');
    const regionMenu = document.getElementById('region-menu');
    const spotList = document.getElementById('spot-list');
    const spotDetail = document.getElementById('spot-detail');
    const detailTitle = document.getElementById('detail-title');
    const detailImage = document.querySelector('#detail-image img');
    const detailContent = document.getElementById('detail-content');
    const detailCoords = document.getElementById('detail-coords');
    const generatePathBtn = document.getElementById('generate-path-btn');
    
    const showRegionBtn = document.getElementById('show-region-btn');
    const showCustomBtn = document.getElementById('show-custom-btn');
    const regionMenuPanel = document.getElementById('region-menu-panel');
    const customPlanPanel = document.getElementById('custom-plan-panel');
    const customPlanForm = document.getElementById('custom-plan-form');
    const generateCustomBtn = document.getElementById('generate-custom-btn');
    
    // 情境互動 DOM
    const contextInteraction = document.getElementById('context-interaction');
    const contextMessage = document.getElementById('context-message');
    const userResponseArea = document.getElementById('user-response-area');
    
    // --- 網站狀態變數 (本地儲存與記憶模組) ---
    let isApiVerified = localStorage.getItem('isApiVerified') === 'true';
    let currentApiKey = localStorage.getItem('geminiApiKey') || '';
    let currentSpots = {}; // 儲存當前地區的所有景點數據 (map: id -> spot)
    let selectedSpot = null; // 當前選中的景點
    let currentPlanSpots = []; // 儲存當前行程的景點陣列 (用於情境感知)
    let interactionTimer = null; // 情境互動定時器變數
    
    // 模擬情境數據 (實時感知) - 初始值設定
    const context = {
        weather: '晴天',   // 模擬：晴天/陰天/雨天
        crowd: '正常',     // 模擬：正常/擁擠/稀疏
        festival: false,   // 模擬：是否有節慶
        time: new Date().getHours(), // 模擬：當前小時
        walkDistance: 1.5, // 模擬：已步行公里數
        userMood: '舒適',  // 模擬：使用者心境 (舒適/疲憊/興奮/文化)
    };

    // 心境互動問題庫
    const MOOD_QUESTIONS = [
        {
            q: "您現在覺得是想找個地方放鬆休息，還是繼續探索？",
            options: [
                { text: "👣 繼續走 (興奮)", mood: "興奮" },
                { text: "☕ 找地方休息 (疲憊)", mood: "疲憊" }
            ],
            action: (mood) => {
                context.userMood = mood;
                if (mood === '疲憊') context.walkDistance = 5; // 模擬疲憊增加步行距離
                updateSpotSuggestions();
            }
        },
        {
            q: "您對戶外景點的陽光或室內展覽比較感興趣？",
            options: [
                { text: "☀️ 戶外風景 (興奮)", mood: "興奮" },
                { text: "🏛️ 室內空間 (文化)", mood: "文化" }
            ],
            action: (mood) => {
                context.userMood = mood;
                updateSpotSuggestions();
            }
        },
        {
            q: "您感覺有點餓了嗎？想找美食嗎？",
            options: [
                { text: "😋 想找美食", mood: "美食" },
                { text: "繼續行程 🏃", mood: "舒適" }
            ],
            action: (mood) => {
                context.userMood = mood;
                updateSpotSuggestions();
            }
        }
    ];

    // --- 模擬資料：嚴格 JSON 格式 ---
    const MOCK_DATA = {
        "taipei": {
            "title": "台北都會 3 天清新日常",
            "spots": [
                {
                    "id": "t1",
                    "name": "富錦街咖啡日常",
                    "short_desc": "充滿綠意與特色咖啡廳的街道，適合漫步放鬆。",
                    "long_desc": "富錦街位於民生社區，兩旁種植著綠蔭，許多風格獨特的咖啡館、選物店藏身其中。這裡步調緩慢，是體驗台北清新日常的絕佳地點。特別推薦在午後點一杯手沖咖啡，享受靜謐時光。",
                    "image_url": "https://picsum.photos/400/200?random=1",
                    "coords": {"lat": 25.0601, "lng": 121.5540}
                },
                {
                    "id": "t2",
                    "name": "華山文創園區 (室內)",
                    "short_desc": "老酒廠改建的藝文空間，集結展覽、市集和美食。",
                    "long_desc": "華山文創園區前身是日治時期的酒廠，保留了紅磚建築的歷史痕跡。現在是台北重要的藝文聚落，經常舉辦各種文創展覽、獨立電影放映和週末市集。非常適合文青和喜歡探索創意的人。",
                    "image_url": "https://picsum.photos/400/200?random=2",
                    "coords": {"lat": 25.0440, "lng": 121.5294}
                },
                {
                    "id": "t3",
                    "name": "台北市立美術館 (室內)",
                    "short_desc": "臺灣首座現代美術館，適合陰雨天前往。",
                    "long_desc": "位於圓山飯店附近，收藏了大量現代與當代藝術作品，是文化愛好者與躲避日曬雨淋的好去處。",
                    "image_url": "https://picsum.photos/400/200?random=10",
                    "coords": {"lat": 25.0722, "lng": 121.5225}
                }
            ]
        },
        "hualien": {
            "title": "花蓮海岸 2 天戶外冒險",
            "spots": [
                {
                    "id": "h1",
                    "name": "七星潭",
                    "short_desc": "美麗的月牙灣海岸，鵝卵石海灘和清澈海水。",
                    "long_desc": "七星潭的名稱雖有『潭』，但實際是一片令人心曠神怡的弧形海灣。以黑色的鵝卵石海灘聞名，在此可以遠眺清水斷崖，享受太平洋的海風與浪濤聲。建議清晨來此欣賞日出。",
                    "image_url": "https://picsum.photos/400/200?random=3",
                    "coords": {"lat": 24.0305, "lng": 121.6265}
                }
            ]
        }
    };
    
    // --- 啟用/禁用 介面函數 ---
    function setInterfaceEnabled(isEnabled) {
        const regionButtons = regionMenu.querySelectorAll('.region-btn');
        
        regionButtons.forEach(btn => btn.disabled = !isEnabled);
        showRegionBtn.disabled = !isEnabled;
        showCustomBtn.disabled = !isEnabled;
        generateCustomBtn.disabled = !isEnabled;
        
        if (isEnabled) {
            spotList.innerHTML = `<h2>🖼️ 請選擇地區或自訂行程</h2>`;
        } else {
            spotList.innerHTML = `
                <h2>🖼️ 本日推薦景點</h2>
                <p class="placeholder-text">⚠️ 請先在上方「API 密鑰設定」區塊完成驗證，才能選擇行程。</p>
            `;
            spotDetail.classList.add('hidden');
            generatePathBtn.disabled = true;
            document.querySelectorAll('.region-btn').forEach(b => b.classList.remove('active'));
        }
    }

    // --- 側邊欄切換邏輯 ---
    function switchPanel(panelId) {
        if (!isApiVerified) {
             alert('請先完成 API 密鑰驗證，才能切換規劃模式！');
             return;
        }

        regionMenuPanel.classList.add('hidden');
        customPlanPanel.classList.add('hidden');
        showRegionBtn.classList.remove('active');
        showCustomBtn.classList.remove('active');

        if (panelId === 'region') {
            regionMenuPanel.classList.remove('hidden');
            showRegionBtn.classList.add('active');
        } else {
            customPlanPanel.classList.remove('hidden');
            showCustomBtn.classList.add('active');
        }
    }
    
    // --- 核心函數：情境感知與動態建議 ---
    function updateSpotSuggestions(message = "") {
        if (currentPlanSpots.length === 0) return;

        let filteredSpots = [...currentPlanSpots]; 
        let suggestions = [];
        let highlight = false;
        
        // 1. 環境感知：天氣與節慶
        const isIndoorSpot = (name) => /博物館|展覽|咖啡|室內|休息|茶館|美食/.test(name);
        
        // 陰天/雨天 -> 優先推薦室內景點
        if (context.weather === '陰天' || context.weather === '雨天') {
            filteredSpots.sort((a, b) => {
                const isIndoorA = isIndoorSpot(a.name) || isIndoorSpot(a.short_desc);
                const isIndoorB = isIndoorSpot(b.name) || isIndoorSpot(b.short_desc);
                return isIndoorB - isIndoorA; // 室內景點排前面
            });
            suggestions.push(`偵測到天氣為「${context.weather}」，已將室內景點優先排序。`);
            highlight = true;
        }

        // 節慶期間 -> 推播周邊文化活動 (模擬將文化/節慶相關點置頂)
        if (context.festival) {
            const festivalSpot = filteredSpots.find(spot => /文化|市集|節慶|藝文/.test(spot.name));
            if (festivalSpot) {
                filteredSpots = filteredSpots.filter(spot => spot.id !== festivalSpot.id);
                filteredSpots.unshift(festivalSpot);
                suggestions.push(`附近正在舉行特別文化活動，推薦您前往「${festivalSpot.name}」。`);
                highlight = true;
            }
        }

        // 2. 使用者狀態感知：疲勞與心境
        if (context.walkDistance > 4 || context.userMood === '疲憊') {
            // 行走太久或心境疲憊 -> 安排休息或咖啡店
            const restSpot = filteredSpots.find(spot => /咖啡|休息|茶館|公園/.test(spot.name));
            if (restSpot) {
                filteredSpots = filteredSpots.filter(spot => spot.id !== restSpot.id);
                filteredSpots.unshift(restSpot);
                suggestions.push(`偵測您已步行較遠，或心境疲憊，推薦您前往「${restSpot.name}」休息。`);
                highlight = true;
                context.walkDistance = 0.5; // 模擬休息後距離重置
            }
        }
        
        // 3. 心境感知：美食
        if (context.userMood === '美食') {
            const foodSpot = filteredSpots.find(spot => /美食|小吃|餐廳/.test(spot.name));
            if (foodSpot) {
                filteredSpots = filteredSpots.filter(spot => spot.id !== foodSpot.id);
                filteredSpots.unshift(foodSpot);
                suggestions.push(`您想找美食，推薦您優先探索「${foodSpot.name}」！`);
                highlight = true;
            }
        }
        
        // 渲染新的景點列表
        renderSpots({ title: currentPlanSpots.plan_title || "動態調整行程", spots: filteredSpots }, suggestions, highlight);
    }
    
    // --- 輔助函數：渲染景點列表 (加入情境提示) ---
    function renderSpots(data, suggestions = [], highlight = false) {
        let html = `<h2>🖼️ ${data.title || "行程景點"}</h2>`; 
        
        if (suggestions.length > 0) {
            html += `<div class="card" style="margin-bottom: 15px; background: #fffcf0;">
                <h4 style="color: var(--primary-color); margin: 0 0 5px;">情境感知助理</h4>
                ${suggestions.map(s => `<p class="suggestion-highlight">${s}</p>`).join('')}
            </div>`;
        }

        spotList.innerHTML = html;
        currentSpots = {}; 
        currentPlanSpots = data.spots; // 保持原始清單

        data.spots.forEach(spot => {
            currentSpots[spot.id] = spot; 
            const card = document.createElement('div');
            card.className = 'spot-card';
            card.dataset.spotId = spot.id;
            card.innerHTML = `
                <h4>${spot.name}</h4>
                <p>${spot.short_desc}</p>
            `;
            spotList.appendChild(card);
            
            card.addEventListener('click', () => {
                displaySpotDetail(spot.id);
            });
        });
    }

    // --- 輔助函數：顯示景點詳細資訊 (不變) ---
    function displaySpotDetail(spotId) {
        document.querySelectorAll('.spot-card').forEach(card => card.classList.remove('selected'));
        document.querySelector(`.spot-card[data-spot-id="${spotId}"]`)?.classList.add('selected');

        selectedSpot = currentSpots[spotId];
        if (!selectedSpot) return;
        
        detailTitle.textContent = selectedSpot.name;
        detailContent.innerHTML = `<p>${selectedSpot.long_desc}</p>`;
        detailCoords.innerHTML = `<strong>座標 (Lat/Lng):</strong> ${selectedSpot.coords.lat}, ${selectedSpot.coords.lng}`;
        
        detailImage.src = selectedSpot.image_url;
        detailImage.classList.remove('hidden');

        spotDetail.classList.remove('hidden');
        generatePathBtn.disabled = !isApiVerified; 
        
        const mapDisplay = document.getElementById('map-display');
        mapDisplay.innerHTML = `<p class="map-placeholder">已定位至：${selectedSpot.name} (${selectedSpot.coords.lat}, ${selectedSpot.coords.lng})</p>`;
    }

    // --- 互動功能 5: 心境互動系統引擎 ---
    function startInteractionEngine() {
        if (interactionTimer) clearInterval(interactionTimer);

        // 隨機設定 20 秒到 60 秒之間發起一次互動
        const randomDelay = Math.floor(Math.random() * 40000) + 20000; 
        
        interactionTimer = setTimeout(() => {
            if (currentPlanSpots.length === 0) {
                 // 如果沒有行程，則不發起互動
                 startInteractionEngine(); 
                 return;
            }

            const interaction = MOOD_QUESTIONS[Math.floor(Math.random() * MOOD_QUESTIONS.length)];
            
            contextInteraction.classList.remove('hidden');
            contextMessage.textContent = interaction.q;
            userResponseArea.innerHTML = '';
            userResponseArea.classList.remove('hidden');
            
            interaction.options.forEach(option => {
                const btn = document.createElement('button');
                btn.className = 'soft-btn primary-btn';
                btn.textContent = option.text;
                btn.addEventListener('click', () => {
                    interaction.action(option.mood);
                    contextInteraction.classList.add('hidden');
                    // 重啟定時器
                    startInteractionEngine(); 
                });
                userResponseArea.appendChild(btn);
            });

        }, randomDelay);
    }
    
    // --- 初始化/狀態檢查 ---
    if (isApiVerified) {
        apiStatus.textContent = '狀態：已啟用 (使用在地儲存密鑰)';
        apiStatus.classList.add('verified');
        apiKeyInput.value = currentApiKey;
        setInterfaceEnabled(true);
        switchPanel('region'); 
        
        // 載入預設行程並啟動引擎
        currentPlanSpots = MOCK_DATA.taipei.spots;
        updateSpotSuggestions(); 
        startInteractionEngine();
    } else {
        apiStatus.textContent = '狀態：未驗證 (功能禁用)';
        apiStatus.classList.remove('verified');
        setInterfaceEnabled(false);
    }


    // --- 互動功能 1: API 密鑰驗證 ---
    verifyKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key.length < 10) { 
            apiStatus.textContent = '狀態：密鑰格式錯誤，請檢查。';
            // ... (禁用邏輯) ...
            return;
        }

        isApiVerified = true;
        currentApiKey = key;
        localStorage.setItem('isApiVerified', 'true');
        localStorage.setItem('geminiApiKey', key);
        apiStatus.textContent = '狀態：驗證成功，Gemini 功能已啟用！';
        apiStatus.classList.add('verified');
        alert('API Key 驗證成功 (前端模擬)。您現在可以選擇行程或自訂規劃。');
        
        setInterfaceEnabled(true); 
        switchPanel('region'); 
        
        // 載入預設行程並啟動引擎
        currentPlanSpots = MOCK_DATA.taipei.spots;
        updateSpotSuggestions();
        startInteractionEngine(); 

        if (selectedSpot) generatePathBtn.disabled = false;
    });

    // --- 互動功能 2: 點選地區顯示景點 ---
    regionMenu.addEventListener('click', (e) => {
        if (!isApiVerified) return;
        
        const btn = e.target.closest('.region-btn');
        if (btn) {
            document.querySelectorAll('.region-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const region = btn.dataset.region;
            if (MOCK_DATA[region]) {
                currentPlanSpots = MOCK_DATA[region].spots; 
                updateSpotSuggestions(MOCK_DATA[region].title);
            }
            
            spotDetail.classList.add('hidden');
            selectedSpot = null;
            generatePathBtn.disabled = true;
        }
    });

    // --- 互動功能 3: 點擊按鈕生成路徑規劃引擎 (模擬) ---
    generatePathBtn.addEventListener('click', () => {
        if (!isApiVerified || !selectedSpot) return;

        const style = document.getElementById('travel-style').value;
        
        // 模擬 Gemini 輸出，嚴格 JSON
        const pathResponse = {
            "origin": "用戶所在地 (模擬：台北車站)",
            "destination": selectedSpot.name,
            "transport_mode": "大眾運輸 + 步行",
            "steps": [
                {"step_num": 1, "instruction": `從台北車站搭乘捷運至最近的捷運站。`},
                {"step_num": 2, "instruction": `步行約 15 分鐘，沿途可感受${style}氛圍。`},
                {"step_num": 3, "instruction": "建議：步行時可順道在附近的特色咖啡廳停留。"}
            ],
            "estimated_time": "約 45 分鐘"
        };
        
        let pathHtml = `<h4>🗺️ 路徑規劃建議：${pathResponse.transport_mode}</h4>`;
        // ... (HTML 渲染邏輯) ...

        document.getElementById('map-display').innerHTML = pathHtml;
        alert('路徑規劃已生成 (模擬)。');
    });

    // --- 互動功能 4: 側邊欄切換與自訂行程生成 ---
    showRegionBtn.addEventListener('click', () => switchPanel('region'));
    showCustomBtn.addEventListener('click', () => switchPanel('custom'));

    customPlanForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!isApiVerified) return;

        const country = document.getElementById('travel-country').value;
        const days = document.getElementById('travel-days').value;
        const style = document.getElementById('travel-style').value;
        const customSpotsText = document.getElementById('custom-spots').value;
        const customSpotsArray = customSpotsText.split('\n').filter(s => s.trim() !== '');

        alert(`將為您生成「${country}」${days}天「${style}」風格的導覽 (模擬 AI 生成)。`);

        // 模擬 Gemini 輸出，確保 JSON 格式嚴格
        const mockResponse = {
            "plan_title": `專屬 AI 導覽：${country} ${days}天 ${style}之旅`,
            "spots": []
        };
        
        const spotsToGenerate = customSpotsArray.length > 0 ? customSpotsArray : ["AI推薦景點 A - 美食小吃", "AI推薦景點 B - 戶外公園", "AI推薦景點 C - 室內展覽"];

        mockResponse.spots = spotsToGenerate.map((spotName, index) => ({
            "id": `custom_${index + 1}`,
            "name": spotName,
            "short_desc": `${spotName} - 由 AI 根據您的「${style}」風格推薦。`,
            "long_desc": `這是關於 ${spotName} 的詳細介紹，內容將會基於 Gemini 對於「${style}」主題的理解所生成。`,
            "image_url": `https://picsum.photos/400/200?random=${Math.floor(Math.random() * 100) + index + 10}`,
            "coords": {"lat": 24 + Math.random(), "lng": 121 + Math.random()} 
        }));

        currentPlanSpots = mockResponse.spots; 
        updateSpotSuggestions(`已載入您的「${style}」風格自訂行程。`);
        
        document.querySelectorAll('.region-btn').forEach(b => b.classList.remove('active'));
        switchPanel('region'); // 生成完成後，切換回景點列表模式
    });
});
