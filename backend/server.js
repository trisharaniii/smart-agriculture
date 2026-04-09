const readXlsxFile = require('read-excel-file/node');
const express = require("express");
const fs = require("fs");
const path = require("path");
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

app.post("/api/analyze", upload.single("image"), (req,res)=>{

const result={

disease:"Leaf Blight",
confidence:82,
suggestion:"Spray Neem Oil and remove infected leaves",
summary:"Leaf blight detected. Immediate treatment required."

};

res.json(result);

});

/* ================= AI TEXT ASSISTANT ================= */

app.post("/api/ask-ai",(req,res)=>{

let question=req.body.question;
let lang=req.body.language;

let answer="Use neem oil spray and check soil moisture.";

if(lang==="te"){
answer="నీమ్ ఆయిల్ స్ప్రే చేయండి మరియు మట్టి తేమను పరిశీలించండి.";
}

if(lang==="hi"){
answer="नीम ऑयल स्प्रे करें और मिट्टी की नमी जांचें.";
}

res.json({answer});

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

const PORT = process.env.PORT || 5000;
app.listen(PORT,()=>{

console.log(`🌾 AGROIQ Backend Running on port ${PORT}`);

});