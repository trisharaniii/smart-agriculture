const SUPABASE_URL = "https://utyqgtkvzpaiklcbzyir.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0eXFndGt2enBhaWtsY2J6eWlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTE1NDksImV4cCI6MjA4ODk4NzU0OX0.CWCj0MHAKkJI1Rv-WUxcYaxYJyEAEmGW2_-3ERzV3Og"

// ✅ FIX 1: Safe Supabase client init (window.supabase may not be ready instantly)
let supabaseClient;
try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch(e) {
    console.error("Supabase init failed:", e);
}

/* ================= AUTH HELPERS ================= */
function showAuthMessage(elementId, msg, isError) {
    let el = document.getElementById(elementId);
    if (!el) return;
    el.style.display = "block";
    el.style.color = isError ? "red" : "#2e7d32";
    el.innerText = msg;
}

/* ================= LOGIN ================= */
async function loginUser() {
    let name = document.getElementById("name")?.value.trim();
    let pass = document.getElementById("password")?.value.trim();
    let langEl = document.getElementById("language");
    let lang = langEl ? langEl.value : "en";
    
    localStorage.setItem("lang", lang);
    let msgId = "loginMessage";

    if (!name || !pass) {
        showAuthMessage(msgId, "Enter username and password.", true);
        return;
    }

    let btn = document.getElementById("loginBtn");
    if(btn) { btn.innerText = "Logging in..."; btn.disabled = true; }

    let { data, error } = await supabaseClient.from("users").select("*");

    if (error) {
        showAuthMessage(msgId, "Database error: " + error.message, true);
        if(btn) { btn.innerText = "Login"; btn.disabled = false; }
        return;
    }

    let userByName = data.find(u => u.name === name);

    if (!userByName) {
        showAuthMessage(msgId, "User not found. Please register first.", true);
        if(btn) { btn.innerText = "Login"; btn.disabled = false; }
        return;
    }

    let user = data.find(u => u.name === name && u.password === pass);

    if (user) {
        localStorage.setItem("farmerName", user.name);
        window.location.href = "problem.html";
    } else {
        showAuthMessage(msgId, "Incorrect password. Please try again.", true);
        if(btn) { btn.innerText = "Login"; btn.disabled = false; }
    }
}

/* ================= REGISTER ================= */
async function registerUser() {
    let name = document.getElementById("regName")?.value.trim();
    let mobile = document.getElementById("regMobile")?.value.trim();
    let password = document.getElementById("regPassword")?.value.trim();
    let confirmPassword = document.getElementById("confirmPassword")?.value.trim();
    
    let msgId = "regMessage";

    if (!name || !mobile || !password || !confirmPassword) {
        showAuthMessage(msgId, "Please fill in all fields.", true);
        return;
    }

    if (password.length < 6) {
        showAuthMessage(msgId, "Password must be at least 6 characters.", true);
        return;
    }

    if (password !== confirmPassword) {
        showAuthMessage(msgId, "Passwords do not match.", true);
        return;
    }

    let btn = document.querySelector("button[onclick='registerUser()']");
    if(btn) { btn.innerText = "Registering..."; btn.disabled = true; }

    let { error } = await supabaseClient.from("users").insert([{ name, mobile, password }]);

    if (error) {
        showAuthMessage(msgId, "Registration failed: " + error.message, true);
        if(btn) { btn.innerText = "Register"; btn.disabled = false; }
        return;
    }

    showAuthMessage(msgId, "Registration successful! Redirecting...", false);
    setTimeout(() => {
        window.location.href = "index.html";
    }, 1500);
}

/* ================= FORGOT PASSWORD ================= */
let resetOTP = "";
let resettingMobile = "";

async function sendResetOTP() {
    let mobile = document.getElementById("resetMobile")?.value.trim();
    let msgId = "forgotMessage";

    if (!mobile) {
        showAuthMessage(msgId, "Enter your registered mobile number.", true);
        return;
    }

    let btn = document.getElementById("btnSendOTP");
    if(btn) { btn.innerText = "Checking..."; btn.disabled = true; }

    let { data, error } = await supabaseClient.from("users").select("mobile").eq("mobile", mobile);

    if (error || !data || data.length === 0) {
        showAuthMessage(msgId, "Mobile number not found in our records.", true);
        if(btn) { btn.innerText = "Send OTP"; btn.disabled = false; }
        return;
    }

    resettingMobile = mobile;
    resetOTP = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Simulate SMS
    alert("System Simulated OTP: " + resetOTP);
    
    document.getElementById("step1").style.display = "none";
    let step2 = document.getElementById("step2");
    if (step2) step2.style.display = "block";
    showAuthMessage(msgId, "OTP sent successfully! Please set a new password.", false);
}

async function resetPassword() {
    let otp = document.getElementById("resetOTP")?.value.trim();
    let newPass = document.getElementById("resetNewPassword")?.value.trim();
    let confPass = document.getElementById("resetConfirmPassword")?.value.trim();
    let msgId = "forgotMessage";

    if (!otp || !newPass || !confPass) {
        showAuthMessage(msgId, "Please fill in all fields.", true);
        return;
    }

    if (otp !== resetOTP) {
        showAuthMessage(msgId, "Invalid OTP.", true);
        return;
    }

    if (newPass.length < 6) {
        showAuthMessage(msgId, "Password must be at least 6 characters.", true);
        return;
    }

    if (newPass !== confPass) {
        showAuthMessage(msgId, "Passwords do not match.", true);
        return;
    }

    let btn = document.getElementById("btnResetPass");
    if(btn) { btn.innerText = "Updating..."; btn.disabled = true; }

    // Supabase standard update
    let { error } = await supabaseClient.from("users").update({ password: newPass }).eq("mobile", resettingMobile);

    if (error) {
        showAuthMessage(msgId, "Update failed: " + error.message, true);
        if(btn) { btn.innerText = "Update Password"; btn.disabled = false; }
        return;
    }

    showAuthMessage(msgId, "Password reset successfully! Redirecting to login...", false);
    setTimeout(() => {
        window.location.href = "index.html";
    }, 2000);
}

/* ================= PROBLEM ANALYSIS ================= */
async function analyzeProblem() {

    let textEl = document.getElementById("problemText");
    if (!textEl) return;

    let text = textEl.value.toLowerCase().trim();

    if (!text) {
        alert("Please describe your crop problem");
        return;
    }

    // 🔄 Button loading state
    let btn = document.querySelector("button[onclick='analyzeProblem()']");
    if (btn) {
        btn.innerText = "Analyzing...";
        btn.disabled = true;
    }

    // 📥 Fetch all diseases
    let { data, error } = await supabaseClient
        .from("plant_diseases")
        .select("*");

    if (error) {
        console.log(error);
        alert("Error fetching data");
        if (btn) {
            btn.innerText = "Analyze";
            btn.disabled = false;
        }
        return;
    }

    // 🧠 Stop words remove
    const stopWords = new Set([
        "my","is","are","the","a","an","of","and","with",
        "have","has","i","it","its","me","to","very",
        "some","see","getting","feeling","looks"
    ]);

    // 🧩 Meaningful words
    let userWords = text.split(/\s+/).filter(w =>
        w.length > 2 && !stopWords.has(w)
    );

    let bestMatch = null;
    let bestScore = 0;

    // 🔍 Matching loop
    data.forEach(item => {

        if (!item.symptoms && !item.disease) return;

        let itemText = (
            (item.symptoms || "") + " " +
            (item.disease || "")
        ).toLowerCase();

        let score = 0;

        // 🔹 Word match
        userWords.forEach(word => {

            if (itemText.includes(word)) score += 2;

            itemText.split(/\s+/).forEach(itemWord => {
                if (itemWord.length > 3 && word.includes(itemWord)) {
                    score += 1;
                }
            });
        });

        // 🔹 Phrase match bonus
        let words = text.split(/\s+/);
        for (let i = 0; i < words.length - 1; i++) {
            let phrase = words[i] + " " + words[i + 1];
            if (itemText.includes(phrase)) score += 5;
        }

        // 🔹 Disease direct match
        if (text.includes((item.disease || "").toLowerCase())) {
            score += 10;
        }

        // 🔥 Best match select
        if (score > bestScore) {
            bestScore = score;
            bestMatch = item;
        }
    });

    console.log("BEST MATCH:", bestMatch, "Score:", bestScore);

    // ✅ Final decision
    if (bestMatch && bestScore >= 2) {

    console.log("BEST MATCH:", bestMatch);

    if (!bestMatch.id) {
        alert("ID missing in database ❌");
        return;
    }

    localStorage.setItem("selectedDiseaseId", Number(bestMatch.id));

    // Save search history and confidence
    let conf = bestScore >= 10 ? 98 : (bestScore >= 5 ? 85 : 72);
    localStorage.setItem("lastConfidence", conf + "%");
    let searchRecord = {
        problem: text,
        disease: bestMatch.disease,
        confidence: conf + "%",
        timestamp: new Date().toLocaleString()
    };
    let history = JSON.parse(localStorage.getItem("searchHistory") || "[]");
    history.unshift(searchRecord);
    if(history.length > 15) history.pop();
    localStorage.setItem("searchHistory", JSON.stringify(history));

    console.log("Saved ID:", bestMatch.id);

    window.location.href = "dashboard.html";

} else {

    alert("No matching disease found 😔");

    if (btn) {
        btn.innerText = "Analyze";
        btn.disabled = false;
    }
}
}
/* ================= DASHBOARD LOAD ================= */
async function loadDashboard() {

    let id = parseInt(localStorage.getItem("selectedDiseaseId"));

    console.log("Selected ID:", id);

    let resEl = document.getElementById("diseaseResult");
    let solEl = document.getElementById("solutionText");

    if (!id || id === "null" || isNaN(id)) {
        if (resEl) resEl.innerText = "Unknown Problem";
        if (solEl) solEl.innerText = "No data found";
        return;
    }

    let { data, error } = await supabaseClient
    .from("plant_diseases")
    .select("*")
    .eq("id", id)
    .limit(1);

    console.log("Fetched:", data);

   let item = data[0];

if (!item) {
    console.log("No item found");
    return;
}

console.log("ITEM:", item);

// SAFE SET
if (resEl) resEl.innerText = item.disease ?? "No Data";

let alertBadge = document.getElementById("alertBadge");
if (alertBadge) alertBadge.innerText = "Alert: " + (item.disease ?? "No Data");

if (solEl) {
    solEl.innerText =
        (item.solution ?? "No solution") +
        "\n\n💊 Medicine: " + (item.medicine ?? "N/A");
}

let img = document.getElementById("diseaseImage");
if (img) {
    let url = item.image || item.image_url || item.url || "";
    if (typeof url === 'string') {
        url = url.trim().replace(/^['"](.*)['"]$/, '$1'); // Clean accidental quotes
    }
    
    // Master function for flawless generic auto-fetching
    function autoFetchWikipedia(imageElement) {
        imageElement.onerror = null;
        
        // Photorealistic ultra-fallback for obscure diseases
        let safeFallback = "./crops/generic_disease.png";
        imageElement.src = safeFallback;
        
        // Search Wikipedia for the exact disease name (broader net)
        let query = encodeURIComponent(item.disease); // "Mango Malformation"
        fetch(`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${query}&gsrlimit=1&prop=pageimages&format=json&pithumbsize=500&origin=*`)
        .then(res => res.json())
        .then(data => {
            if (data.query && data.query.pages) {
                let pages = data.query.pages;
                let pageId = Object.keys(pages)[0];
                if (pages[pageId] && pages[pageId].thumbnail) {
                    let thumbUrl = pages[pageId].thumbnail.source;
                    if (thumbUrl.startsWith("//")) {
                        thumbUrl = "https:" + thumbUrl; 
                    }
                    // Test if Wikipedia image is valid, if so apply it.
                    let tempImg = new Image();
                    tempImg.onload = () => imageElement.src = thumbUrl;
                    tempImg.src = thumbUrl;
                }
            }
        }).catch(e => console.log("Wiki fetch API error", e));
    }

    if (url.endsWith("...") || url === "null" || url === "") {
        console.warn("⚠️ Truncated URL. Spawning Wikipedia Auto-Fetcher...");
        autoFetchWikipedia(img);
    } else {
        if (!url.startsWith("http") && !url.startsWith("data:")) {
            if (url !== "null" && url !== "") {
                url = `${SUPABASE_URL}/storage/v1/object/public/images/${url}`;
            }
        }
        
        img.removeAttribute("referrerpolicy"); // Cleaned conflicting policies 
        
        img.onerror = function() {
            console.warn("⚠️ Provided DB Link Blocked/404. Spawning Wikipedia Auto-Fetcher...");
            autoFetchWikipedia(this);
        };
        img.src = url;
    }
}

let confEl = document.getElementById("diseaseConfidence");
if (confEl) confEl.innerText = localStorage.getItem("lastConfidence") || "94%";
}
    // Apply language after data loads
    applyLanguage();
/* ================= LANGUAGE & TRANSLATIONS ================= */
function applyLanguage() {
    const dict = {
        en: {
            dashboardTitle: "Crop Analysis Dashboard", welcome: "Welcome", home: "Home", dashboard: "Dashboard",
            notifications: "Notifications", history: "History", settings: "Settings", logout: "Logout",
            recent_searches: "Recent Searches", nameHolder: "Your Name", passHolder: "Password", loginBtn: "Login",
            regTitle: "Farmer Registration", regName: "Your Name", regMob: "Mobile Number", regPass: "Password", regConf: "Confirm Password",
            sendOtp: "Send OTP", regBtn: "Register", probTitle: "Describe Crop Problem", probHolder: "Explain your crop problem here...",
            analyzeBtn: "Analyze", histTitle: "History",
            
            // Dashboard deeper translations
            smartCrop: "Smart Crop Recommendations",
            diseaseDetected: "Disease Detected",
            liveWeather: "Live Weather",
            recommendedSolution: "Recommended Solution",
            sensorMap: "Sensor Map",
            accountSettings: "Account Settings",
            appPreferences: "App Preferences",
            settingsH1: "Settings",
            
            diseaseLbl: "Disease",
            confidenceLbl: "Confidence",
            applyTreatment: "Apply This Treatment",
            saveChanges: "Save Changes",
            farmerNameLbl: "Farmer Name",
            darkModeLbl: "Dark Mode"
        },
        te: {
            dashboardTitle: "పంట విశ్లేషణ డాష్‌బోర్డ్", welcome: "స్వాగతం", home: "హోమ్", dashboard: "డాష్‌బోర్డ్",
            notifications: "నోటిఫికేషన్లు", history: "చరిత్ర", settings: "సెట్టింగులు", logout: "లాగౌట్",
            recent_searches: "ఇటీవలి శోధనలు", nameHolder: "మీ పేరు", passHolder: "పాస్వర్డ్", loginBtn: "లాగిన్",
            regTitle: "రైతు నమోదు", regName: "మీ పేరు", regMob: "మొబైల్ నంబర్", regPass: "పాస్వర్డ్", regConf: "పాస్వర్డ్ ధృవీకరించండి",
            sendOtp: "OTP పంపండి", regBtn: "నమోదు", probTitle: "పంట సమస్యను వివరించండి", probHolder: "మీ పంట సమస్యను ఇక్కడ వివరించండి...",
            analyzeBtn: "విశ్లేషించండి", histTitle: "చరిత్ర",
            
            smartCrop: "పంట సూచనలు", diseaseDetected: "వ్యాధి గుర్తింపు", liveWeather: "వాతావరణం",
            recommendedSolution: "సూచించిన పరిష్కారం", sensorMap: "సెన్సార్ మ్యాప్", accountSettings: "ఖాతా సెట్టింగులు",
            appPreferences: "యాప్ ప్రాధాన్యతలు", settingsH1: "సెట్టింగులు",
            
            diseaseLbl: "వ్యాధి", confidenceLbl: "విశ్వాసం", applyTreatment: "ఈ చికిత్స వర్తించండి",
            saveChanges: "మార్పులను సేవ్ చేయండి", farmerNameLbl: "రైతు పేరు", darkModeLbl: "డార్క్ మోడ్"
        },
        hi: {
            dashboardTitle: "फसल विश्लेषण डैशबोर्ड", welcome: "स्वागत है", home: "होम", dashboard: "डैशबोर्ड",
            notifications: "सूचनाएँ", history: "इतिहास", settings: "सेटिंग्स", logout: "लॉग आउट",
            recent_searches: "हाल की खोजें", nameHolder: "आपका नाम", passHolder: "पासवर्ड", loginBtn: "लॉगिन",
            regTitle: "किसान पंजीकरण", regName: "आपका नाम", regMob: "मोबाइल नंबर", regPass: "पासवर्ड", regConf: "पासवर्ड की पुष्टि करें",
            sendOtp: "OTP भेजें", regBtn: "पंजीकरण", probTitle: "फसल की समस्या का वर्णन करें", probHolder: "अपनी फसल की समस्या को यहाँ समझाएँ...",
            analyzeBtn: "विश्लेषण करें", histTitle: "इतिहास",
            
            smartCrop: "फसल सुझाव", diseaseDetected: "बीमारी का पता चला", liveWeather: "वर्तमान मौसम",
            recommendedSolution: "सुझाया गया समाधान", sensorMap: "सेंसर मैप", accountSettings: "खाता सेटिंग्स",
            appPreferences: "ऐप प्राथमिकताएं", settingsH1: "सेटिंग्स",
            
            diseaseLbl: "बीमारी", confidenceLbl: "भरोसा", applyTreatment: "यह उपचार लागू करें",
            saveChanges: "परिवर्तन सहेजें", farmerNameLbl: "किसान का नाम", darkModeLbl: "डार्क मोड"
        }
    };

    let lang = localStorage.getItem("lang") || "en";
    let t = dict[lang] || dict.en;

    let title = document.getElementById("dashboardTitle");
    if (title) title.innerText = t.dashboardTitle;

    let fName = localStorage.getItem("farmerName") || "Farmer";
    let w = document.getElementById("welcomeText");
    if (w) w.innerText = t.welcome + " " + fName + " 👋";
    
    let s = document.getElementById("settingsName");
    if (s) s.value = fName;

    document.querySelectorAll('.menu-item').forEach(item => {
        let text = item.innerText;
        if(text.includes('Home') || text.includes('హోమ్') || text.includes('होम')) item.innerHTML = `<span>🏠</span> ${t.home}`;
        if(text.includes('Dashboard') || text.includes('డాష్') || text.includes('डैशबोर्ड')) item.innerHTML = `<span>📊</span> ${t.dashboard}`;
        if(text.includes('Notifications') || text.includes('నోటిఫికేషన్లు') || text.includes('सूचनाएँ')) item.innerHTML = `<span>🔔</span> ${t.notifications}`;
        if(text.includes('History') || text.includes('చరిత్ర') || text.includes('इतिहास')) item.innerHTML = `<span>📜</span> ${t.history}`;
        if(text.includes('Settings') || text.includes('సెట్టింగులు') || text.includes('सेटिंग्स')) item.innerHTML = `<span>⚙️</span> ${t.settings}`;
        if(text.includes('Logout') || text.includes('లాగౌట్') || text.includes('लॉग आउट')) item.innerHTML = `<span>🚪</span> ${t.logout}`;
    });

    let histHeader = document.querySelector('#history h1');
    if (histHeader) histHeader.innerText = t.recent_searches;
    let histTitle = document.getElementById("historyTitle");
    if (histTitle) histTitle.innerText = t.histTitle;

    let n = document.getElementById("name"); if(n) n.placeholder = t.nameHolder;
    let p = document.getElementById("password"); if(p) p.placeholder = t.passHolder;
    let lBtn = document.getElementById("loginBtn"); if(lBtn) lBtn.innerText = t.loginBtn;

    let regH2 = document.querySelector(".login-box h2"); if(regH2) regH2.innerText = t.regTitle;
    let rn = document.getElementById("regName"); if(rn) rn.placeholder = t.regName;
    let rm = document.getElementById("regMobile"); if(rm) rm.placeholder = t.regMob;
    let rp = document.getElementById("regPassword"); if(rp) rp.placeholder = t.regPass;
    let rc = document.getElementById("confirmPassword"); if(rc) rc.placeholder = t.regConf;
    
    let sendBtn = document.querySelector("button[onclick='sendOTP()']"); if(sendBtn) sendBtn.innerText = t.sendOtp;
    let regBtn = document.querySelector("button[onclick='registerUser()']"); if(regBtn) regBtn.innerText = t.regBtn;
    
    let probTitle = document.getElementById("problemTitle"); if(probTitle) probTitle.innerText = t.probTitle;
    let probText = document.getElementById("problemText"); if(probText) probText.placeholder = t.probHolder;
    let anaBtn = document.querySelector(".analyze-btn"); if(anaBtn) anaBtn.innerText = t.analyzeBtn;

    // Advanced Deep Dashboard Translations
    document.querySelectorAll('h3').forEach(h => {
        let txt = h.innerText;
        if(txt.includes('Smart Crop') || txt.includes('పంట సూచనలు') || txt.includes('फसल सुझाव')) h.innerHTML = `🌾 ${t.smartCrop}`;
        if(txt.includes('Disease Detected') || txt.includes('వ్యాధి గుర్తింపు') || txt.includes('बीमारी')) h.innerHTML = `🦠 ${t.diseaseDetected}`;
        if(txt.includes('Live Weather') || txt.includes('వాతావరణం') || txt.includes('मौसम')) h.innerHTML = `☁️ ${t.liveWeather}`;
        if(txt.includes('Recommended Solution') || txt.includes('పరిష్కారం') || txt.includes('समाधान')) h.innerHTML = `💡 ${t.recommendedSolution}`;
        if(txt.includes('Sensor Map') || txt.includes('సెన్సార్ మ్యాప్') || txt.includes('सेंसर मैप')) h.innerHTML = `📍 ${t.sensorMap}`;
        if(txt.includes('Account Settings') || txt.includes('ఖాతా') || txt.includes('खाता')) h.innerHTML = `👤 ${t.accountSettings}`;
        if(txt.includes('App Preferences') || txt.includes('ప్రాధాన్యతలు') || txt.includes('प्राथमिकताएं')) h.innerHTML = `⚙️ ${t.appPreferences}`;
    });

    document.querySelectorAll('h1').forEach(h => {
        let txt = h.innerText;
        if(txt.includes('Settings') || txt.includes('సెట్టింగులు') || txt.includes('सेटिंग्स')) h.innerText = t.settingsH1;
    });

    document.querySelectorAll('b, span, button').forEach(el => {
        let txt = el.innerText.trim();
        if(txt === 'Disease:' || txt === 'వ్యాధి:' || txt === 'बीमारी:') el.innerText = `${t.diseaseLbl}:`;
        if(txt === 'Confidence:' || txt === 'విశ్వాసం:' || txt === 'भरोसा:') el.innerText = `${t.confidenceLbl}:`;
        if(txt === 'Apply This Treatment' || txt === 'ఈ చికిత్స వర్తించండి' || txt === 'यह उपचार लागू करें') el.innerText = t.applyTreatment;
        if(txt === 'Save Changes' || txt === 'మార్పులను సేవ్ చేయండి' || txt === 'परिवर्तन सहेजें') el.innerText = t.saveChanges;
        if(txt === 'Farmer Name' || txt === 'రైతు పేరు' || txt === 'किसान का नाम') el.innerText = t.farmerNameLbl;
        if(txt === 'Dark Mode' || txt === 'డార్క్ మోడ్' || txt === 'डार्क मोड') el.innerText = t.darkModeLbl;
    });

    let langDropdown = document.getElementById("language");
    if (langDropdown && langDropdown.value !== lang) langDropdown.value = lang;
}

function changeLanguage() {
    let langEl = document.getElementById("language");
    if (!langEl) return;
    localStorage.setItem("lang", langEl.value);
    applyLanguage();
}

/* ================= WEATHER ================= */
async function loadWeather() {
    try {
        let apiKey = "42dd068dcb102be4b4af4515d1868562";
        let city = "Nizamabad";

        let res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);
        let data = await res.json();

        if (data.cod !== 200) {
            console.warn("Weather API issue:", data.message);
            return;
        }

        let cityBox = document.getElementById("weatherCity");
        let tempBox = document.getElementById("weatherTemp");
        let descBox = document.getElementById("weatherDesc");

        if (cityBox) cityBox.innerText = data.name + ", TS";
        if (tempBox) tempBox.innerText = data.main.temp.toFixed(1) + " °C";
        if (descBox) descBox.innerText = data.weather[0].main;

    } catch (err) {
        console.log("Weather error", err);
    }
}

/* ================= PIE / MINI CHART ================= */
function loadChart() {
    let chartElement = document.getElementById("pieChart");
    if (!chartElement) return;

    let disease = localStorage.getItem("disease") || "Healthy";
    let diseased = disease === "Healthy" ? 0 : 70;
    let healthy  = disease === "Healthy" ? 100 : 30;

    new Chart(chartElement, {
        type: 'pie',
        data: {
            labels: ['Diseased', 'Healthy'],
            datasets: [{
                data: [diseased, healthy],
                backgroundColor: ['#ff6b6b', '#4caf50']
            }]
        },
        options: {
            plugins: { legend: { display: true } }
        }
    });
}

/* ================= CROP SUGGESTIONS (SEASONAL) ================= */
async function loadCropSuggestions() {
    let container = document.getElementById("cropSuggestions");
    if (!container) return;
    container.innerHTML = "";

    const month = new Date().getMonth() + 1;
    let season = "";
    let seasonTitle = "";

    if (month >= 6 && month <= 10) { season = "Kharif"; seasonTitle = "Monsoon (Kharif)"; }
    else if (month >= 11 || month <= 3) { season = "Rabi"; seasonTitle = "Winter (Rabi)"; }
    else { season = "Zaid"; seasonTitle = "Summer (Zaid)"; }

    let pTitle = container.previousElementSibling;
    if (pTitle && pTitle.tagName === "P") {
        let lang = localStorage.getItem("lang");
        if (lang === "te") pTitle.innerText = `మీ ప్రాంతంలో ${seasonTitle} పంటలు:`;
        else if (lang === "hi") pTitle.innerText = `अनुशंसित ${seasonTitle} फसलें:`;
        else pTitle.innerText = `Recommended ${seasonTitle} crops for optimal yield:`;
    }

    const seasonalCrops = {
        "Kharif": [
            { name: "Rice (Paddy)", desc: "Requires high water and heat.", img: "./crops/rice.png" },
            { name: "Cotton", desc: "Best grown in black soil.", img: "./crops/cotton.png" },
            { name: "Maize", desc: "Grows well in loamy soil.", img: "./crops/maize.png" },
            { name: "Soybean", desc: "Thrives in warm, moist climates.", img: "./crops/soybean.png" },
            { name: "Groundnut", desc: "Requires sandy loam and rain.", img: "./crops/groundnut.png" }
        ],
        "Rabi": [
            { name: "Wheat", desc: "Sown in winter, requires cool temps.", img: "./crops/wheat.png" },
            { name: "Mustard", desc: "Needs dry and cool weather.", img: "./crops/mustard.png" },
            { name: "Gram (Chickpea)", desc: "Drought-resistant, good for dry winters.", img: "./crops/gram.png" },
            { name: "Barley", desc: "Tolerant to drought and cold.", img: "./crops/barley.png" },
            { name: "Peas", desc: "Grows in frost-free cool climates.", img: "./crops/peas.png" }
        ],
        "Zaid": [
            { name: "Watermelon", desc: "Needs high heat and sandy soil.", img: "./crops/watermelon.png" },
            { name: "Cucumber", desc: "Warm season crop, requires irrigation.", img: "./crops/cucumber.png" },
            { name: "Bitter Gourd", desc: "Does well in summer heat.", img: "./crops/bittergourd.png" },
            { name: "Pumpkin", desc: "Requires long frost-free season.", img: "./crops/pumpkin.png" },
            { name: "Moong Dal", desc: "Heat tolerant pulse, matures quickly.", img: "./crops/moongdal.png" }
        ]
    };

    let activeCrops = seasonalCrops[season];

    activeCrops.forEach(crop => {
        let card = document.createElement("div");
        card.className = "glass-card"; 
        card.style.cssText = "display: flex; align-items: stretch; gap: 20px; padding: 20px; margin-bottom: 0; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: left;";
        
        card.innerHTML = `
            <img src="${crop.img}" alt="${crop.name}" style="width: 130px; height: 130px; object-fit: cover; border-radius: 12px; flex-shrink: 0; border: 3px solid var(--accent-green);">
            <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                <span style="background: rgba(124, 181, 24, 0.15); color: #2e7d32; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; margin-bottom: 10px; display: inline-block; width: fit-content;">🌱 Season: ${seasonTitle}</span>
                <h4 style="margin: 0 0 8px 0; font-size: 20px; color: var(--text-main);">${crop.name}</h4>
                <p style="margin: 0; font-size: 15px; color: #555; line-height: 1.6;">${crop.desc}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

/* ================= HISTORY ================= */
function loadHistory() {
    let container = document.getElementById("historyContainer");
    if (!container) return;
    
    let history = JSON.parse(localStorage.getItem("searchHistory") || "[]");
    
    if (history.length === 0) {
        container.innerHTML = '<p style="color: #666;">No history found. Go to the Home page to analyze a crop problem!</p>';
        return;
    }
    
    container.innerHTML = "";
    history.forEach(item => {
        let card = document.createElement("div");
        card.className = "glass-card";
        card.style.marginBottom = "0";
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <strong style="color: var(--accent-green); font-size: 18px;">${item.disease}</strong> 
                    <span style="font-size: 13px; background: #e8f5e9; color: #2e7d32; font-weight: bold; padding: 3px 8px; border-radius: 12px; margin-left: 10px;">${item.confidence}</span>
                    <p style="margin-top: 10px; color: #555; font-style: italic;">"${item.problem}"</p>
                </div>
                <small style="color: #999;">${item.timestamp}</small>
            </div>
        `;
        container.appendChild(card);
    });
}

/* ================= PAGE LOAD ================= */
// ✅ FIX 6: Removed the broken top-level line `let input = document.getElementById("farmerName")`
// that ran outside any function and caused a crash
document.addEventListener("DOMContentLoaded", async () => {
    applyLanguage();
    try {
        await loadDashboard();
    } catch (e) {
        console.error("Dashboard load error:", e);
    }
    loadWeather();
    loadChart();
    loadCropSuggestions();
    loadHistory();
});