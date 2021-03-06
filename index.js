const fs = require('fs');

const { createCanvas, loadImage, registerFont } = require('canvas');
var imgur = require('imgur');
var FB = require('fb');

require('dotenv').config();

// API Configuration Setup
const fbAccessToken = process.env.FB_ACCESS_TOKEN;
const fbPageId = process.env.FB_PAGE_ID;
const imgurClientId = process.env.IMGUR_CLIENT_ID;
const debug = process.env.DEBUG;

if(debug) console.log("[WARNING] RUNNING IN DEBUG MODE");

// const startTime = process.env.START_TIME;
FB.setAccessToken(fbAccessToken);
imgur.setClientId(imgurClientId);

// Loads cities configurations
const rawCities = fs.readFileSync('configurations/cities.json');
const cities = JSON.parse(rawCities);

// Cache cities to dictionary to allow O(1) search by ID
var citiesCache = {};
cities.forEach((city) => {
    citiesCache[city.id] = city;
})

console.log(cities.length + " loaded");

var progress = {}; // Holds the progress of the war (who owns which area)
var progressTime = 0;

// Loads progress if exists. If not, create new progress/'game'.
if(fs.existsSync('outputs/progress.json')) {
    const rawProgress = fs.readFileSync('outputs/progress.json');
    const parsedProgress = JSON.parse(rawProgress);
    progress = parsedProgress.progress;
    progressTime = parsedProgress.time;
    console.log("Progress loaded");
} else {
    cities.forEach((city) => {
        progress[city.id] = {
            'owner': city.id,
        }
    })
    progressTime = -1;
    saveProgress();
    console.log("Progress generated");
}

// Cache cities owned by city ID of the owner to allow O(1) search
var progressCache = {};
cities.forEach((city) => { progressCache[city.id] = []; })
cities.forEach((city) => {
    const owner = progress[city.id].owner;
    if(progressCache[owner] == null) progressCache[owner] = [];
    progressCache[owner].push(city.id);
})

// Loads font
registerFont('assets/Montserrat.ttf', { family: 'Montserrat' })

if(!debug) runStepClock()
else step(); // Do one step when run instead of waiting for minute 00 (For Debugging purposes)

function runStepClock() {
    const date = new Date();
    const minutesLeft = 60 - date.getUTCMinutes();
    setTimeout(() => {
        if(isGameEnded()) {
            console.log('Game has ended');
            runStepClock();
            return;
        }
        const time = new Date().getTime();
        // if(time < startTime) {
        //     console.log('Not yet!');
        //     runStepClock();
        //     return;
        // }
        step();
    }, minutesLeft*60*1000);
}

// Get cityIds of cities that can attack
function getAttackingCities() {
    return cities
        .filter((city) => {
            var neighbours = city.neighbours;
            for(var i = 0; i<neighbours.length - 1; i++) {
                if(progress[neighbours[i]].owner != progress[city.id].owner) return true;
            }
            return false;
        });
}

// Ticks the progress, updates the map image, saves progress, and upload to Facebook
async function step() {
    var attackedCityId;
    var attackerCityId;

    var possibleAttackingCities = getAttackingCities();
    
    var buff = possibleAttackingCities.filter((city) => progress[progress[city.id].owner].owner == progress[city.id].owner);
    
    possibleAttackingCities = [...possibleAttackingCities, ...buff, ...buff, ...buff];
    var attackerCityId = possibleAttackingCities[getRandomInt(0, possibleAttackingCities.length - 1)].id;
    var attackableCityId = citiesCache[attackerCityId].neighbours.filter((neighbourId) => progress[neighbourId].owner != progress[attackerCityId].owner);
    var attackedCityId = attackableCityId[getRandomInt(0, attackableCityId.length-1)];

    console.log("Attacking city: " + citiesCache[attackerCityId].name);
    console.log("Attacked city: " + citiesCache[attackedCityId].name);

    const attacker = progress[attackerCityId].owner; // The ID of the one who attacks the city
    const attacked = progress[attackedCityId].owner; // The ID of the one who owns the city that's being attacked
    const attackedCity = citiesCache[attackedCityId]; // The city being attacked
    const attackedOriginCity = citiesCache[attacked]; // The detailed information of the one who owns the city that's being attacked
    const attackerOriginCity = citiesCache[attacker]; // The detailed information of the attacker
    
    progress[attackedCityId].owner = attacker; // Sets the owner of the attacked city to the attacker

    // Updates progress cache
    progressCache[attacked] = progressCache[attacked].filter((cityId) => cityId != attackedCityId); // Removes the city from ownership
    progressCache[attacker].push(attackedCityId); // Add city to ownership

    var message = generateMessage(
        getTime(++progressTime), 
        attackerOriginCity.name, 
        attackedCity.name, 
        (attackedCity.id != attacked) ? attackedOriginCity.name : null,
        (progressCache[attacked].length <= 0) ? attackedOriginCity.name : null,
    )

    saveProgress();
    await updateMap(attackedCityId);
    await uploadToFacebook(message);

    runStepClock();
}

function generateMessage(time, attackerName, cityName, previousOwner, previousOwnerDisappear) {
    const template = [
        `${time}, Neo ${attackerName} menjajah Neo ${cityName}${(previousOwner) ? ` yang sebelumnya dijajah oleh Neo ${previousOwner}.` : `.`}${(previousOwnerDisappear) ? `\nNeo ${previousOwnerDisappear} telah lenyap ditelan bumi. 💥` : ''}`,
        `Pada bulan ${time}, Neo ${attackerName} berhasil mencuri${(previousOwner) ? `` : ` hati`} Neo ${cityName}${(previousOwner) ? ` dari Neo ${previousOwner}.` : `.`}${(previousOwnerDisappear) ? `\nNeo ${previousOwnerDisappear} sakit hati karena NTR dan menghilang. 😭` : ''}`,
        `${time}, Neo ${attackerName} mengambil alih Neo ${cityName}${(previousOwner) ? ` dari Neo ${previousOwner}.` : `.`}${(previousOwnerDisappear) ? `\nNeo ${previousOwnerDisappear} telah terkalahkan dalam peperangan. 🔫` : ''}`,
        `${time}, Neo ${attackerName} menduduki Neo ${cityName}${(previousOwner) ? ` yang sebelumnya diduduki oleh Neo ${previousOwner}.` : `.`}${(previousOwnerDisappear) ? `\nNeo ${previousOwnerDisappear} telah terkalahkan.` : ''}`,
    ]

    var message = template[getRandomInt(0, template.length-1)];
    if(debug) message = "[DEBUG]\n\n" + message;
    if(isGameEnded()) message += `\nPerang Neo Jakarta telah berakhir. ${attackerName} berhasil menguasai seluruh Neo Jakarta.`;

    return message;
}

function isGameEnded() {
    var count = 0;
    for(owner in progressCache) {
        if(progressCache[owner].length > 0) count++;
        if(count > 1) return false;
    }
    return true;
}

// Update the map colors based on each city owners.
// changedCity contains the ID of the city that had recently got ownership change. Set null if no changes.
async function updateMap(changedCity) {
    const mapImage = await loadImage('assets/neojakarta.svg');
    const targetImage = await loadImage('assets/target.png');
    const canvas = createCanvas(2000, 2000);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 2000, 2000);
    ctx.drawImage(mapImage, 0, 0, 2000, 2000);

    // Perform map coloring
    cities.forEach((city) => {
        const owner = citiesCache[progress[city.id].owner];
        const ownerColor = owner.color;
        floodFill(Math.floor(city.x), Math.floor(city.y), ctx, ownerColor.r, ownerColor.g, ownerColor.b);
    });

    // Add target image into changed city
    if(changedCity != null) ctx.drawImage(targetImage, citiesCache[changedCity].x-100, citiesCache[changedCity].y-100, 200, 200);

    // Write city names
    cities.forEach((city) => {
        var shouldStroke = false;
        if(city.id == progress[city.id].owner) ctx.fillStyle = "white"
        else if(progressCache[city.id].length > 0) {
            ctx.strokeStyle = "black";
            ctx.lineWidth = 5;
            ctx.fillStyle = rgbToHex(city.color.r, city.color.g, city.color.b);
            shouldStroke = true;
        }
        else ctx.fillStyle = "black";
        ctx.font = '30px Montserrat';
        ctx.textAlign = 'center';
        const names = city.name.split(' ');
        names.forEach((name, index) => {
            if(shouldStroke) ctx.strokeText(name, city.x, city.y + index*30);
            ctx.fillText(name, city.x, city.y + index*30);
        });
    })

    // Save map to outputs folder
    const buff = canvas.toBuffer();
    fs.writeFileSync('outputs/map.png', buff);
}

// Upload to Facebook
async function uploadToFacebook(message) {
    const cityOwnership = getSortedCityOwnership();
    var comments = "Jajahan:";
    var count = 0;
    cityOwnership.forEach((owner) => {
        if(owner.total <= 0) return;
        const ownedCities = progressCache[owner.city.id]
            .map((cityId) => citiesCache[cityId].name )
            .join(', ');
        comments += `\n${++count}. ${owner.city.name}: ${ownedCities}`;
    })

    try {
        const imageUrl = await imgur.uploadFile("outputs/map.png")
            .then((json) => {
                console.log(json.data.link);
                return json.data.link;
            });

        FB.api(
            "/" + fbPageId + "/photos",
            "POST",
            {
                "url": imageUrl,
                "caption": message,
            },
            function (response) {
                console.log(response);
                // FB.api(
                //     "/" + response.id + "/comments",
                //     "POST",
                //     {
                //         "message": comments,
                //     },
                //     function (response) {
                //         console.log(response);
                //     }
                // )
            }
        );
    } catch (e) {
        console.log(e);
    }
}

// Save progress
function saveProgress() {
    const data = JSON.stringify({
        progress,
        time: progressTime,
    });
    fs.writeFileSync('outputs/progress.json', data, { encoding: 'utf-8' });
}

function getSortedCityOwnership() {
    var cityOwnership = [];
    for(owner in progressCache) {
        cityOwnership.push(
            {
                total: progressCache[owner].length,
                city: citiesCache[owner],
            }
        )
    }
    cityOwnership.sort((a, b) => b.total-a.total); 

    return cityOwnership;
}

function getTime(time) {
    const monthList = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const year = parseInt(time/12, 10);
    const month = time%12;

    return monthList[month] + ' ' + (year + 2050);
}

// Performs color flood fill to canvas context on x and y
function floodFill(x, y, context, r, g, b) {
    pixelStack = [[x, y]];
    const canvasWidth = 2000;
    const canvasHeight = 2000;
    const maxWidth = canvasWidth*4;
    const maxHeight = canvasHeight*4
    var imageData = context.getImageData(0, 0, canvasWidth, canvasHeight);
    var colorData = imageData.data;

    var filled = [[]];

    while(pixelStack.length)
    { 
        const current = pixelStack.pop();
        const x = current[0];
        const y = current[1];
        if(filled[x] != null && filled[x][y] != null && filled[x][y]) continue;
        if(x<0||x>=maxWidth||y<0||y>=maxHeight) continue;

        if(filled[x] == null) filled[x] = [];
        filled[x][y] = true;

        const pixelPos = (y*canvasWidth + x) * 4;
        const threshold = 10;

        if(colorData[pixelPos]>threshold && colorData[pixelPos+1]>threshold && colorData[pixelPos+2]>threshold) {
            colorData[pixelPos] = r;
            colorData[pixelPos+1] = g;
            colorData[pixelPos+2] = b;
            colorData[pixelPos+3] = 255

            for(var i=-1; i<=1; i++) {
                for(var j=-1; j<=1; j++) {
                    if(i==0&&j==0) continue;
                    pixelStack.push([x+i, y+j]);
                }
            }
        } else {
            continue;
        }
    }

    context.putImageData(imageData, 0, 0);
}

// Create random integer
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rgbToHex(r,g,b) {   
    var red = numberToHex(r);
    var green = numberToHex(g);
    var blue = numberToHex(b);
    return "#"+red+green+blue;
}

function numberToHex(number) { 
    var hex = Number(number).toString(16);
    if (hex.length < 2) {
         hex = "0" + hex;
    }
    return hex;
}