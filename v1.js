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
          console.log(`Rate limited. Backing off for ${this.retryDelay/1000}s`);
          await this.delay(this.retryDelay);
          this.retryDelay *= 2; 
          this.rateLimitDelay *= 1.5; 
          continue;
        }
        
        
        this.retryDelay = 1000;
        return response;
      } catch (e) {
        if (e.response && e.response.status === 429) {
          console.log(`Rate limited. Backing off for ${this.retryDelay/1000}s`);
          await this.delay(this.retryDelay);
          this.retryDelay *= 2; 
          this.rateLimitDelay *= 1.5; 
          continue;
        }
        
        console.log(`Request error: ${e.message}. Retrying in ${this.retryDelay/1000}s`);
        await this.delay(this.retryDelay);
        this.retryDelay *= 2; 
      }
    }
    
    throw new Error(`Failed to get response after ${this.maxRetries} attempts`);
  }

  async testEndpoint() {
    try {
      console.log(`Testing endpoint: ${this.baseUrl}${this.endpoint}?${this.paramName}=a`);
      const response = await this.makeRequest('a');
      console.log(`Endpoint test successful. Status: ${response.status}`);
      console.log(`Response data:`, response.data);
      
      
      this.analyzeResponseStructure(response.data);
      
      return true;
    } catch (e) {
      console.log(`Endpoint test failed: ${e.message}`);
      return false;
    }
  }

  analyzeResponseStructure(data) {
    console.log(`\nAnalyzing response structure:`);
    if (Array.isArray(data)) {
      console.log(`- Response is an array with ${data.length} items`);
      if (data.length > 0) {
        console.log(`- First item: ${JSON.stringify(data[0])}`);
        console.log(`- Item type: ${typeof data[0]}`);
      }
    } else if (typeof data === 'object' && data !== null) {
      console.log(`- Response is an object with keys: ${Object.keys(data).join(', ')}`);
      
      
      const resultKeys = ['results', 'suggestions', 'completions', 'data', 'items'];
      for (const key of resultKeys) {
        if (data[key]) {
          console.log(`- Found results in '${key}' field`);
          if (Array.isArray(data[key])) {
            console.log(`- ${key} is an array with ${data[key].length} items`);
            if (data[key].length > 0) {
              console.log(`- First item: ${JSON.stringify(data[key][0])}`);
            }
          }
        }
      }
    } else {
      console.log(`- Response is of type ${typeof data}`);
    }
    console.log();
  }

  extractResults(responseData) {
    
    if (Array.isArray(responseData)) {
      
      return responseData.map(item => 
        typeof item === 'string' ? item : (item.name || item.value || item.text || item)
      );
    } else if (typeof responseData === 'object' && responseData !== null) {
      
      const resultFields = ['results', 'suggestions', 'completions', 'data', 'items'];
      for (const field of resultFields) {
        if (responseData[field] && Array.isArray(responseData[field])) {
          return responseData[field].map(item => 
            typeof item === 'string' ? item : (item.name || item.value || item.text || item)
          );
        }
      }
     
      return Object.values(responseData);
    }
    return [];
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
          const results = this.extractResults(response.data);
          
          
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
            console.log(`Found ${this.discoveredNames.size} names, made ${this.requestCount} requests (${(this.requestCount/elapsed).toFixed(2)} req/s)`);
          }
        }
      } catch (e) {
        console.log(`Error processing prefix '${prefix}': ${e.message}`);
      }
    }
    
    return this.discoveredNames;
  }

  async extractWithCombinationStrategy() {
    console.log(`\n===== EXTRACTING NAMES WITH OPTIMIZED STRATEGY =====`);
    
    
    let lastReportTime = Date.now();
    const reportInterval = 5000; 
    
    
    const commonPrefixes = [];
    
    
    for (let i = 97; i <= 122; i++) {
      commonPrefixes.push(String.fromCharCode(i));
    }
    
    
    const commonLetterPairs = ['th', 'he', 'an', 're', 'er', 'in', 'on', 'at', 'nd', 'st', 
                              'en', 'es', 'of', 'te', 'ed', 'or', 'ti', 'hi', 'as', 'to'];
    commonPrefixes.push(...commonLetterPairs);
    
    
    for (const prefix of commonPrefixes) {
      try {
        const response = await this.makeRequest(prefix);
        
        if (response.status === 200) {
          const results = this.extractResults(response.data);
          
          
          for (const name of results) {
            this.discoveredNames.add(name);
          }
          
          
          const now = Date.now();
          if (now - lastReportTime > reportInterval) {
            const elapsed = (now - this.startTime) / 1000;
            console.log(`Processed prefix '${prefix}' - Found ${this.discoveredNames.size} names, made ${this.requestCount} requests (${(this.requestCount/elapsed).toFixed(2)} req/s)`);
            lastReportTime = now;
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
    console.log(`Request rate: ${(this.requestCount/elapsed).toFixed(2)} requests/second`);
  }
}


async function main() {
  const extractor = new AutocompleteExtractor();
  
  
  const endpointWorks = await extractor.testEndpoint();
  
  if (endpointWorks) {
    
    await extractor.extractAllNames();
   
    extractor.saveResults();
    
    
    extractor.printSummary();
  } else {
    console.log("Failed to access the autocomplete endpoint. Please check the URL and parameters.");
  }
}

// Run the extraction
main().catch(error => {
  console.error("Error in main execution:", error);
});