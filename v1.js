const axios = require("axios");
const fs = require("fs").promises; 

const BASE_URL = "http://35.200.185.69:8000/v1/autocomplete?query=";
const RATE_LIMIT_DELAY = 600; 
const foundNames = new Set(); 
let requestCount = 0; // Track total API calls

async function fetchNames(query, page = 1) {
    try {
        requestCount++; 
        const response = await axios.get(`${BASE_URL}${query}&page=${page}`);

        console.log(`Full API response for "${query}", Page ${page}:`, response.data);

        if (response.data && Array.isArray(response.data.names)) {
            response.data.names.forEach(name => foundNames.add(name));
        } else if (response.data && response.data.error) {
            console.error(`API error for "${query}", Page ${page}:`, response.data.error);
            return;
        } else {
            console.error(`Unexpected response format for "${query}", Page ${page}:`, response.data);
            return;
        }

        if (response.data.nextPage) {
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY)); 
            await fetchNames(query, response.data.nextPage);
        }

    } catch (error) {
        console.error(`Error fetching "${query}", Page ${page}:`, error.message);
    }
}

async function discoverNames(prefix = "", depth = 3) {
    const alphabet = "abcdefghijklmnopqrstuvwxyz";

    for (let letter of alphabet) {
        let newQuery = prefix + letter;

        await fetchNames(newQuery); 

        if (depth > 1) {
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY)); 
            await discoverNames(newQuery, depth - 1); 
        }
    }
}

async function saveResultsToFile() {
    const filePath = "names.json";
    const namesArray = [...foundNames]; // Convert Set to Array

    try {
        await fs.writeFile(filePath, JSON.stringify(namesArray, null, 2));
        console.log(`Results saved to ${filePath}`);
    } catch (err) {
        console.error("Error writing to file:", err);
    }
}

async function main() {
    console.log("Starting API exploration...");
    await discoverNames("", 2); // Set depth to 2
    console.log(`Total API requests made: ${requestCount}`);
    console.log(`Extracted ${foundNames.size} unique names.`);

    await saveResultsToFile(); // Ensure results are saved before exiting
}

main();

