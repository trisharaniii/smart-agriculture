const https = require('https');
const fs = require('fs');
const path = require('path');

const cropsDir = path.join(__dirname, 'frontend', 'crops');
if (!fs.existsSync(cropsDir)) {
    fs.mkdirSync(cropsDir, { recursive: true });
}

const crops = {
    "rice": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Rice_Plant.jpg/400px-Rice_Plant.jpg",
    "cotton": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Cotton_Plant.jpg/400px-Cotton_Plant.jpg",
    "maize": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Corn_plant.jpg/400px-Corn_plant.jpg",
    "soybean": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Soybean.jpg/400px-Soybean.jpg",
    "groundnut": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Arachis_hypogaea_-_Peanut_-_desc-1.jpg/400px-Arachis_hypogaea_-_Peanut_-_desc-1.jpg",
    "wheat": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Ears_of_Wheat_close-up.jpg/400px-Ears_of_Wheat_close-up.jpg",
    "mustard": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Brassica_napus_2.jpg/400px-Brassica_napus_2.jpg",
    "gram": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Chickpea.jpg/400px-Chickpea.jpg",
    "barley": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Barley_%28Hordeum_vulgare_%D0%B6%D0%B8%D1%82%D0%BE%29.jpg/400px-Barley_%28Hordeum_vulgare_%D0%B6%D0%B8%D1%82%D0%BE%29.jpg",
    "peas": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Peas_in_pods_-_Studio.jpg/400px-Peas_in_pods_-_Studio.jpg",
    "watermelon": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Watermelon.jpg/400px-Watermelon.jpg",
    "cucumber": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Cucumber_in_greenhouse.jpg/400px-Cucumber_in_greenhouse.jpg",
    "bittergourd": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Momordica_charantia_-_Bitter_melon_01.jpg/400px-Momordica_charantia_-_Bitter_melon_01.jpg",
    "pumpkin": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/French_Pumpkin.jpg/400px-French_Pumpkin.jpg",
    "moongdal": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Mung_beans.jpg/400px-Mung_beans.jpg"
};

const download = (name, url) => {
    return new Promise((resolve, reject) => {
        const dest = path.join(cropsDir, `${name}.jpg`);
        const file = fs.createWriteStream(dest);
        const options = { headers: { 'User-Agent': 'MiniprojectDashboard/1.0 (dev@example.com)' } };
        
        https.get(url, options, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => { file.close(); resolve(); });
            } else {
                reject(new Error(`Failed with status ${response.statusCode}`));
            }
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
};

async function dlAll() {
    for (const [name, url] of Object.entries(crops)) {
        console.log(`Downloading ${name}.jpg...`);
        try {
            await download(name, url);
            console.log(`Success: ${name}`);
        } catch (e) {
            console.error(`Failed ${name}:`, e);
        }
    }
}
dlAll();
