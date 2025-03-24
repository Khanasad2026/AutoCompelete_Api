Autocomplete API Name Extraction

Overview
This project explores an autocomplete API by making systematic queries to extract all possible names. 
Various strategies were implemented to efficiently retrieve data while handling constraints like rate limiting and pagination.

Approaches Used

1. Initial Depth-First Search (DFS) Approach

I used recursive search with a different depths.

Sent requests with increasing prefix lengths (e.g., a, aa, ab,aabc etc.).

Added a delay between requests to avoid hitting API limits.

Extracted unique names from API responses.

Handled pagination by checking nextPage field in responses.

Findings:

Extracted a significant number of names.

I used this dfs approach which is brute force which helps me getting the strings which gives the 429 error which means there is to many requests in the server and then i used this strings as 
value for query of autocomplete api and get the maximum permissible requests in one minute this helps me to find the Rate limit delay;
For version1(v1) i observed that maximum 100 requests per minute is allowed, so this helps me to find Rate_LIMIT_Delay for v1 (60000/100)=600msec,
similarly for v2 i observed that maximum 50 requests per minute is allowed, so Rate_LIMIT_Delay for v2 (60000/50)=1200msec,
similarly for v3 i observed that maximum 80 requests per minute is allowed, so Rate_LIMIT_Delay for v2 (60000/80)=750msec,

Many queries returned redundant or empty results.

*********************************************************************************************************************************************************************************************************************

2. Optimized Breadth-First Search (BFS) Approach

Implemented BFS instead of DFS to prioritize shorter prefixes.

Used a queue to systematically explore prefixes.

Dynamically adjusted rate limits based on response status (e.g., exponential backoff for 429 errors).

Optimized request scheduling by prioritizing commonly used letter combinations (e.g., th, he, an).

Avoided duplicate queries by maintaining a visited set.

Findings:

Improved efficiency by prioritizing more promising prefixes.

Reduced redundant queries, leading to faster name extraction.

Handled API rate limiting more effectively with adaptive delays.

Extracted more unique names compared to the DFS approach.

How to Use:

Install dependencies:

npm install axios fs

Run the extraction script:

node script.js

The extracted names will be saved in extracted_names.json.

Summary

The optimized BFS approach significantly improved name extraction efficiency.

Adaptive rate limiting helped avoid unnecessary API failures.

The project successfully extracted many unique names from the API.

*********************************************************************************************************************************************************************************************************************

===== EXTRACTION SUMMARY =====
for v1{
Total names found: 260
Total requests made: 53
}
for v2{
Total names found: 364
Total requests made: 139
}

for v3{
Total names found: 427
Total requests made: 150
}
