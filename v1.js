const axios = require('axios');
const fs = require('fs');

class AutocompleteExtractor {
  constructor(baseUrl = 'http://35.200.185.69:8000') {
    this.baseUrl = baseUrl;
    this.endpoint = '/v1/autocomplete';
    this.paramName = 'query';
    this.discoveredNames = new Set();
    this.requestCount = 0;
    this.startTime = Date.now();
    this.rateLimitDelay = 600;
    this.retryDelay = 1000;
    this.maxRetries = 5;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest(prefix) {
    const url = `${this.baseUrl}${this.endpoint}`;
    const params = { [this.paramName]: prefix };
    this.requestCount++;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        await this.delay(this.rateLimitDelay);
        
        const response = await axios.get(url, { params });
        
        if (response.status === 429) {
          console.log(`Rate limited. Backing off for ${this.retryDelay / 1000}s`);
          await this.delay(this.retryDelay);
          this.retryDelay *= 2;
          this.rateLimitDelay *= 1.5;
          continue;
        }
        
        this.retryDelay = 1000;
        return response;
      } catch (e) {
        if (e.response && e.response.status === 429) {
          console.log(`Rate limited. Backing off for ${this.retryDelay / 1000}s`);
          await this.delay(this.retryDelay);
          this.retryDelay *= 2;
          this.rateLimitDelay *= 1.5;
          continue;
        }
        
        console.log(`Request error: ${e.message}. Retrying in ${this.retryDelay / 1000}s`);
        await this.delay(this.retryDelay);
        this.retryDelay *= 2;
      }
    }
    
    throw new Error(`Failed to get response after ${this.maxRetries} attempts`);
  }

  async extractAllNames() {
    console.log(`\n===== EXTRACTING NAMES =====`);
    
    const queue = [];
    for (let i = 97; i <= 122; i++) {
      queue.push(String.fromCharCode(i));
    }
    
    const visitedPrefixes = new Set(queue);
    
    while (queue.length > 0) {
      const prefix = queue.shift();
      
      try {
        const response = await this.makeRequest(prefix);
        
        if (response.status === 200) {
          const results = response.data;
          
          for (const name of results) {
            if (!this.discoveredNames.has(name)) {
              this.discoveredNames.add(name);
              
              if (typeof name === 'string' && name.startsWith(prefix) && name.length > prefix.length) {
                for (let i = 97; i <= 122; i++) {
                  const newPrefix = name.substring(0, prefix.length + 1);
                  if (!visitedPrefixes.has(newPrefix)) {
                    visitedPrefixes.add(newPrefix);
                    queue.push(newPrefix);
                  }
                }
              }
            }
          }
          
          if (this.discoveredNames.size % 10 === 0) {
            const elapsed = (Date.now() - this.startTime) / 1000;
            console.log(`Found ${this.discoveredNames.size} names, made ${this.requestCount} requests (${(this.requestCount / elapsed).toFixed(2)} req/s)`);
          }
        }
      } catch (e) {
        console.log(`Error processing prefix '${prefix}': ${e.message}`);
      }
    }
    
    return this.discoveredNames;
  }

  saveResults(filename = "extracted_namesv1.json") {
    fs.writeFileSync(
      filename, 
      JSON.stringify(Array.from(this.discoveredNames), null, 2)
    );
    console.log(`Saved ${this.discoveredNames.size} names to ${filename}`);
  }

  printSummary() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    console.log(`\n===== EXTRACTION SUMMARY =====`);
    console.log(`Total names found: ${this.discoveredNames.size}`);
    console.log(`Total requests made: ${this.requestCount}`);
    console.log(`Time elapsed: ${elapsed.toFixed(2)} seconds`);
    console.log(`Request rate: ${(this.requestCount / elapsed).toFixed(2)} requests/second`);
  }
}

async function main() {
  const extractor = new AutocompleteExtractor();
  await extractor.extractAllNames();
  extractor.saveResults();
  extractor.printSummary();
}

main().catch(error => {
  console.error("Error in main execution:", error);
});
