const readXlsxFile = require('read-excel-file/node');
const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, '.env') });
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

/* ================= SERVE FRONTEND ================= */

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.use(express.static(path.join(__dirname, '..', 'frontend')));

/* ================= CONFIG ================= */

const WEATHER_KEY = "42dd068dcb102be4b4af4515d1868562";

const upload = multer({ dest: "uploads/" });

const cropsPath = path.join(__dirname, "..", "database", "crops.json");
const problemsPath = path.join(__dirname, "..", "database", "problems.json");
const excelPath = path.join(__dirname, "..", "database", "crop_suggestions_1000_rows.xlsx");

/* ================= CROPS API ================= */

app.get("/api/crops",(req,res)=>{

try{

let data = JSON.parse(fs.readFileSync(cropsPath));

res.json(data);

}catch(err){

res.status(500).json({error:"cannot read crops"});

}

});

/* ================= EXCEL DATABASE ================= */

app.get("/api/cropdata", async (req,res)=>{

try{

const rows = await readXlsxFile(excelPath);

const headers = rows[0];

const data = rows.slice(1).map(row=>{

const obj={};

headers.forEach((header,index)=>{
obj[header]=row[index];
});

return obj;

});

res.json(data);

}catch(err){

console.error(err);

res.status(500).json({error:"cannot read excel database"});

}

});

/* ================= WEATHER ================= */

app.get("/api/weather", async (req,res)=>{

try{

let city="Hyderabad";

let response = await axios.get(
`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_KEY}&units=metric`
);

let data=response.data;

res.json({

temperature:data.main.temp,
humidity:data.main.humidity,
weather:data.weather[0].main

});

}catch(err){

res.status(500).json({error:"weather fetch failed"});

}

});

/* ================= AI IMAGE ANALYSIS ================= */

app.post("/api/analyze", upload.single("image"), async (req,res)=>{
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.json({
                disease: "Setup Required",
                confidence: 0,
                suggestion: "Please add your GEMINI_API_KEY to the backend/.env file and restart the server.",
                summary: "API key missing"
            });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

        const langCode = req.body.language || "en";
        const langMap = { "en": "English", "te": "Telugu", "hi": "Hindi" };
        const language = langMap[langCode] || "English";

        if (!req.file) {
             return res.status(400).json({ error: "No image provided" });
        }
        const imagePath = req.file.path;
        const imageParts = [
            {
                inlineData: {
                    data: fs.readFileSync(imagePath).toString("base64"),
                    mimeType: req.file.mimetype
                }
            }
        ];

        const prompt = `You are an expert AI Agricultural Assistant specialized in plant disease detection using leaf images.
Your tasks:
1. Analyze the uploaded plant/leaf image carefully.
2. Identify whether the leaf is healthy or diseased.
3. If diseased, detect the most likely disease name.
4. Provide a clear explanation of the disease.
5. Suggest practical treatment and prevention methods for farmers.

Respond EXACTLY in this JSON format. Respond purely with the JSON payload, no markdown backticks:
{
  "disease": "Disease Name (or 'Healthy' or 'Unrecognized')",
  "confidence": 85,
  "summary": "Short description of the problem/situation.",
  "suggestion": "Detailed causes, treatment and prevention tips."
}

Important Rules:
* Base your answer STRICTLY on visible symptoms in the image.
* Do not hallucinate. If unsure, state it's a possible disease.
* Respond ONLY in ${language}. Ensure all text values in the JSON (except the keys) are translated to ${language}.`;

        const result = await model.generateContent([prompt, ...imageParts]);
        const responseText = result.response.text();

        // Cleanup
        try { fs.unlinkSync(imagePath); } catch (e) { console.error("Unlink error:", e); }

        let cleanText = responseText.replace(/\`\`\`json/gi, "").replace(/\`\`\`/gi, "").trim();
        const output = JSON.parse(cleanText);

        res.json(output);

    } catch(err) {
        console.error("AI Analysis Error:", err);
        res.json({
            disease: "Analysis Error",
            confidence: 0,
            suggestion: "An error occurred during AI analysis: " + err.message,
            summary: "Please try again."
        });
    }
});

/* ================= AI TEXT ASSISTANT ================= */

app.post("/api/ask-ai", async (req,res)=>{
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.json({
                disease: "Setup Required",
                confidence: 0,
                suggestion: "Please add your GEMINI_API_KEY to the backend/.env file and restart the server.",
                summary: "API key missing"
            });
        }
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

        let question = req.body.question;
        let langCode = req.body.language || "en";
        const langMap = { "en": "English", "te": "Telugu", "hi": "Hindi" };
        const language = langMap[langCode] || "English";

        const prompt = `You are an expert AI Agricultural Assistant. A farmer is describing their plant/crop problem in text (transcribed from their voice or typed).
Their problem is: "${question}"

Analyze their problem description carefully.
1. Identify whether the plant is healthy or diseased.
2. If diseased, identify the most likely disease name.
3. Provide a clear explanation.
4. Suggest practical treatment and prevention methods.

Respond EXACTLY in this JSON format. Respond purely with the JSON payload, no markdown backticks:
{
  "disease": "Disease Name (or 'Healthy' or 'Unrecognized problem')",
  "confidence": 85,
  "summary": "Short description of the problem/situation.",
  "suggestion": "Detailed causes, treatment and prevention tips."
}

Important Rules:
* Base your answer on their text description. Do not hallucinate.
* Respond ONLY in ${language}. All text values in the JSON (except keys) MUST be translated to ${language}.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        let cleanText = responseText.replace(/\`\`\`json/gi, "").replace(/\`\`\`/gi, "").trim();
        const output = JSON.parse(cleanText);

        res.json(output);

    } catch(err) {
        console.error("AI Text Analysis Error:", err);
        res.json({
            disease: "Analysis Error",
            confidence: 0,
            suggestion: "An error occurred: " + err.message,
            summary: "Please try again."
        });
    }
});

/* ================= SAVE PROBLEM ================= */

app.post("/api/problems",(req,res)=>{

try{

let records = JSON.parse(fs.readFileSync(problemsPath));

const entry={

text:req.body.text || "",
image:req.body.image || null,
disease:req.body.disease || null,
suggestion:req.body.suggestion || null,
summary:req.body.summary || null,
date:new Date().toISOString()

};

records.push(entry);

fs.writeFileSync(

problemsPath,
JSON.stringify(records,null,2)

);

res.status(201).json(entry);

}catch(e){

console.error(e);

res.status(500).json({error:"failed to save"});

}

});

/* ================= GET PROBLEMS ================= */

app.get("/api/problems",(req,res)=>{

try{

let records = JSON.parse(fs.readFileSync(problemsPath));

res.json(records);

}catch(e){

res.status(500).json({error:"could not read"});

}

});

/* ================= OTP SYSTEM ================= */

app.post("/api/send-otp",(req,res)=>{

const phone=req.body.phone;

const otp=Math.floor(100000 + Math.random()*900000);

console.log("Generated OTP:",otp);

res.json({

success:true,
otp:otp

});

});

/* ================= SERVER ================= */

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>{

console.log(`🌾 AGROIQ Backend Running on port ${PORT}`);
  console.log(`🔗 Open: http://localhost:${PORT}`);

});