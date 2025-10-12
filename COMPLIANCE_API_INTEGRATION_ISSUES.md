# Compliance Agent - External APIs Integration Issues

## 📋 Table of Contents
1. [Problem Overview](#problem-overview)
2. [Technical Analysis](#technical-analysis)
3. [Current Implementation](#current-implementation)
4. [Identified Issues](#identified-issues)
5. [Proposed Solutions](#proposed-solutions)
6. [Code Files to Review](#code-files-to-review)
7. [Testing Scenarios](#testing-scenarios)

---

## 🔴 Problem Overview

### Symptoms
When the Compliance Agent attempts to search for companies using external sanctions APIs, all three API calls fail with the following errors:

```
❌ [COMPLIANCE] OpenSanctions search failed: unable to get local issuer certificate
❌ [COMPLIANCE] OFAC search failed: getaddrinfo ENOTFOUND api.treasury.gov
❌ [COMPLIANCE] EU/UK search failed: unable to get local issuer certificate
```

### Impact
- External sanctions APIs are not accessible
- System falls back to demo/mock data
- Real-time sanctions checking is not functioning
- Demo presentation relies on fallback data only

---

## 🔍 Technical Analysis

### Issue #1: SSL Certificate Validation Errors

**Error Message:**
```
unable to get local issuer certificate
```

**Root Cause:**
Node.js (axios) is unable to verify the SSL/TLS certificate chain of the external APIs. This happens when:

1. **Self-Signed Certificates**: The API uses a self-signed certificate
2. **Missing CA Certificates**: The system doesn't have the required Certificate Authority (CA) certificates
3. **Corporate Proxy/Firewall**: Network security is intercepting HTTPS connections
4. **Outdated Node.js**: Old Node.js versions may have outdated CA certificate bundles

**Affected APIs:**
- OpenSanctions API: `https://data.opensanctions.org/entities`
- EU Sanctions API: `https://webgate.ec.europa.eu/fsd/fsf/public/files/csvFullSanctionsList/content`

---

### Issue #2: DNS Resolution Failure (OFAC API)

**Error Message:**
```
getaddrinfo ENOTFOUND api.treasury.gov
```

**Root Cause:**
The hostname `api.treasury.gov` does not exist in DNS. This is a **configuration error** in our code.

**Current (Wrong) URL:**
```javascript
OFAC: {
  url: 'https://www.treasury.gov/ofac/downloads/sdn.xml',
  timeout: 20000
}
```

**Issue:** The code is trying to use `api.treasury.gov` somewhere instead of `www.treasury.gov`.

---

### Issue #3: API Endpoint Correctness

Even after fixing SSL and DNS issues, we need to verify that the API endpoints are correct and publicly accessible.

**API Documentation Research Needed:**
1. **OpenSanctions**: Verify the correct endpoint structure
2. **OFAC**: Confirm the XML file download URL
3. **EU Sanctions**: Verify the CSV file download URL and access requirements

---

## 📝 Current Implementation

### File: `api/better-sqlite-server.js`

#### API Configuration (Lines 19-33)

```javascript
// External APIs Configuration
const EXTERNAL_APIS = {
  OPENSANCTIONS: {
    url: 'https://data.opensanctions.org/entities',
    timeout: 15000
  },
  OFAC: {
    url: 'https://www.treasury.gov/ofac/downloads/sdn.xml',
    timeout: 20000
  },
  EU_UK: {
    url: 'https://webgate.ec.europa.eu/fsd/fsf/public/files/csvFullSanctionsList/content',
    timeout: 15000
  }
};
```

#### OpenSanctions Search (Lines 6911-6940)

```javascript
// Search OpenSanctions
if (EXTERNAL_APIS.OPENSANCTIONS.url) {
  try {
    const openSanctionsUrl = `${EXTERNAL_APIS.OPENSANCTIONS.url}?q=${encodeURIComponent(searchCriteria.companyName)}&limit=10`;
    const openSanctionsResponse = await axios.get(openSanctionsUrl, {
      timeout: EXTERNAL_APIS.OPENSANCTIONS.timeout,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Compliance-Agent/1.0'
      }
    });
    
    if (openSanctionsResponse.data && openSanctionsResponse.data.results) {
      results.openSanctions = openSanctionsResponse.data.results.slice(0, 5).map(item => ({
        source: 'OpenSanctions',
        name: item.properties?.name?.[0] || 'Unknown',
        description: item.properties?.description?.[0] || 'No description',
        riskLevel: item.properties?.topics?.includes('sanction') ? 'High' : 'Medium',
        confidence: 85
      }));
    } else {
      // Fallback to demo data
      results.openSanctions = getDemoOpenSanctionsData(searchCriteria.companyName);
    }
    console.log('✅ [COMPLIANCE] OpenSanctions results:', results.openSanctions.length);
  } catch (error) {
    console.error('❌ [COMPLIANCE] OpenSanctions search failed:', error.message);
    // Fallback to demo data
    results.openSanctions = getDemoOpenSanctionsData(searchCriteria.companyName);
  }
}
```

#### OFAC Search (Lines 6942-6976)

```javascript
// Search OFAC
if (EXTERNAL_APIS.OFAC.url) {
  try {
    const ofacResponse = await axios.get(EXTERNAL_APIS.OFAC.url, {
      timeout: EXTERNAL_APIS.OFAC.timeout,
      headers: {
        'Accept': 'application/xml'
      }
    });
    
    // Parse XML response for OFAC data
    if (ofacResponse.data && ofacResponse.data.includes('<sdnEntry')) {
      const entries = ofacResponse.data.match(/<sdnEntry[^>]*>[\s\S]*?<\/sdnEntry>/g) || [];
      results.ofac = entries.slice(0, 3).map((entry, index) => {
        const nameMatch = entry.match(/<firstName>([^<]*)<\/firstName>/) || entry.match(/<lastName>([^<]*)<\/lastName>/);
        const name = nameMatch ? nameMatch[1] : `OFAC Entry ${index + 1}`;
        return {
          source: 'OFAC',
          name: name,
          description: 'US Treasury OFAC Sanctions List Entry',
          riskLevel: 'High',
          confidence: 95
        };
      });
    } else {
      // Fallback to demo data
      results.ofac = getDemoOFACData(searchCriteria.companyName);
    }
    console.log('✅ [COMPLIANCE] OFAC results:', results.ofac.length);
  } catch (error) {
    console.error('❌ [COMPLIANCE] OFAC search failed:', error.message);
    // Fallback to demo data
    results.ofac = getDemoOFACData(searchCriteria.companyName);
  }
}
```

#### EU/UK Search (Lines 6978-7011)

```javascript
// Search EU/UK
if (EXTERNAL_APIS.EU_UK.url) {
  try {
    const euUkResponse = await axios.get(EXTERNAL_APIS.EU_UK.url, {
      timeout: EXTERNAL_APIS.EU_UK.timeout,
      headers: {
        'Accept': 'text/csv, application/json'
      }
    });
    
    // Parse CSV response for EU data
    if (euUkResponse.data) {
      const lines = euUkResponse.data.split('\n').slice(0, 5);
      results.euUk = lines.map((line, index) => {
        const parts = line.split(',');
        return {
          source: 'EU Sanctions',
          name: parts[0] || `EU Entry ${index + 1}`,
          description: 'EU Sanctions List Entry',
          riskLevel: 'Medium',
          confidence: 88
        };
      });
    } else {
      // Fallback to demo data
      results.euUk = getDemoEUData(searchCriteria.companyName);
    }
    console.log('✅ [COMPLIANCE] EU/UK results:', results.euUk.length);
  } catch (error) {
    console.error('❌ [COMPLIANCE] EU/UK search failed:', error.message);
    // Fallback to demo data
    results.euUk = getDemoEUData(searchCriteria.companyName);
  }
}
```

---

## 🔧 Identified Issues

### 1. **No SSL Certificate Handling**
- Current implementation doesn't handle SSL certificate validation
- No option to disable certificate validation for development
- No custom CA certificate configuration

### 2. **Incorrect API URLs**
- OFAC URL might be incorrect or inaccessible
- Need to verify if these endpoints are publicly accessible
- May require API keys or authentication

### 3. **No Retry Logic**
- Single attempt per API
- No exponential backoff
- Network timeouts are set but not optimized

### 4. **Limited Error Information**
- Only logging `error.message`
- Not logging full error details for debugging
- No distinction between different error types (SSL, DNS, Timeout, etc.)

### 5. **XML/CSV Parsing**
- Naive XML parsing using regex (not reliable)
- CSV parsing doesn't handle quoted fields or special characters
- No validation of parsed data structure

### 6. **API Response Structure Unknown**
- OpenSanctions API structure is assumed, not verified
- OFAC XML structure might have changed
- EU API might require authentication or tokens

---

## 💡 Proposed Solutions

### Solution 1: SSL Certificate Handling (Development Only)

**⚠️ WARNING: Only use for development/testing. Never in production!**

```javascript
// At the top of better-sqlite-server.js
const axios = require('axios');
const https = require('https');

// Create axios instance with SSL verification disabled (DEV ONLY!)
const isDevelopment = process.env.NODE_ENV === 'development';

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: !isDevelopment // Disable SSL verification in dev
  }),
  timeout: 30000
});

// Use axiosInstance instead of axios for API calls
```

### Solution 2: Proper SSL Certificate Handling (Production)

```javascript
// Install required CA certificates
// Option 1: Update Node.js to latest version
// Option 2: Use environment variable to specify CA bundle
// Option 3: Install specific CA certificates

const https = require('https');
const fs = require('fs');

// Load custom CA certificates if needed
let httpsAgent;
if (process.env.CA_CERT_PATH) {
  httpsAgent = new https.Agent({
    ca: fs.readFileSync(process.env.CA_CERT_PATH)
  });
}

const axiosInstance = axios.create({
  httpsAgent,
  timeout: 30000
});
```

### Solution 3: Correct API Endpoints

**Need to verify and update:**

```javascript
const EXTERNAL_APIS = {
  OPENSANCTIONS: {
    // Check: https://www.opensanctions.org/docs/api/
    url: 'https://api.opensanctions.org/search/default',
    method: 'GET',
    requiresAuth: false,
    timeout: 15000
  },
  OFAC: {
    // Verify: https://www.treasury.gov/resource-center/sanctions/SDN-List/Pages/default.aspx
    url: 'https://www.treasury.gov/ofac/downloads/sdn.xml',
    method: 'GET',
    requiresAuth: false,
    timeout: 20000
  },
  EU_UK: {
    // Verify: https://webgate.ec.europa.eu/fsd/fsf
    // This might require a token parameter
    url: 'https://webgate.ec.europa.eu/fsd/fsf/public/files/csvFullSanctionsList/content?token=dG9rZW4tMjAxNw',
    method: 'GET',
    requiresAuth: false,
    timeout: 15000
  }
};
```

### Solution 4: Enhanced Error Handling

```javascript
async function searchExternalAPIs(searchCriteria) {
  const results = {
    openSanctions: [],
    ofac: [],
    euUk: []
  };
  
  // Enhanced error logging
  const logError = (apiName, error) => {
    console.error(`❌ [COMPLIANCE] ${apiName} failed:`, {
      message: error.message,
      code: error.code,
      response: error.response?.status,
      url: error.config?.url
    });
  };
  
  // Try OpenSanctions
  try {
    const response = await axiosInstance.get(/* ... */);
    // Process results
  } catch (error) {
    logError('OpenSanctions', error);
    
    // Different handling based on error type
    if (error.code === 'CERT_HAS_EXPIRED') {
      console.error('⚠️ SSL certificate expired');
    } else if (error.code === 'ENOTFOUND') {
      console.error('⚠️ DNS resolution failed');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('⚠️ Connection refused');
    }
    
    results.openSanctions = getDemoOpenSanctionsData(searchCriteria.companyName);
  }
  
  return results;
}
```

### Solution 5: Use Proper XML Parser

```javascript
// Install xml2js
// npm install xml2js

const xml2js = require('xml2js');

// In OFAC search
try {
  const ofacResponse = await axiosInstance.get(EXTERNAL_APIS.OFAC.url, {
    timeout: EXTERNAL_APIS.OFAC.timeout,
    headers: { 'Accept': 'application/xml' }
  });
  
  // Parse XML properly
  const parser = new xml2js.Parser();
  const parsedData = await parser.parseStringPromise(ofacResponse.data);
  
  // Extract SDN entries
  const sdnList = parsedData?.sdnList?.sdnEntry || [];
  results.ofac = sdnList.slice(0, 5).map(entry => ({
    source: 'OFAC',
    name: `${entry.firstName?.[0] || ''} ${entry.lastName?.[0] || ''}`.trim(),
    description: 'US Treasury OFAC Sanctions List Entry',
    riskLevel: 'High',
    confidence: 95,
    rawData: entry
  }));
  
} catch (error) {
  logError('OFAC', error);
  results.ofac = getDemoOFACData(searchCriteria.companyName);
}
```

### Solution 6: Alternative Approach - Use Demo Data Primarily

For a reliable demo, consider using the demo data as the primary source:

```javascript
// In better-sqlite-server.js
const USE_REAL_APIS = process.env.USE_REAL_SANCTIONS_APIS === 'true';

async function searchExternalAPIs(searchCriteria) {
  // If not configured to use real APIs, return demo data immediately
  if (!USE_REAL_APIS) {
    console.log('ℹ️ [COMPLIANCE] Using demo data (real APIs disabled)');
    return {
      openSanctions: getDemoOpenSanctionsData(searchCriteria.companyName),
      ofac: getDemoOFACData(searchCriteria.companyName),
      euUk: getDemoEUData(searchCriteria.companyName)
    };
  }
  
  // Otherwise, try real APIs with fallback
  // ... existing implementation
}
```

---

## 📂 Code Files to Review

### Priority 1 - Backend API Integration
1. **`api/better-sqlite-server.js`** (Lines 19-7055)
   - External API configuration
   - `searchExternalAPIs()` function
   - Error handling and fallback logic

### Priority 2 - Demo Data
2. **`api/demo-sanctions-data.js`** (Complete file)
   - Demo company data
   - Sanctions information structure
   - Verify data completeness

### Priority 3 - Frontend Service
3. **`src/app/compliance-agent/services/compliance.service.ts`** (Complete file)
   - API call methods
   - Error handling
   - Response processing

### Priority 4 - Component Logic
4. **`src/app/compliance-agent/compliance-agent.component.ts`** (Complete file)
   - Search flow
   - Result display
   - Demo data insertion

---

## 🧪 Testing Scenarios

### Test Case 1: Verify API Endpoints Manually

```bash
# Test OpenSanctions
curl -v "https://data.opensanctions.org/entities?q=test&limit=1"

# Test OFAC (should download XML)
curl -v -o ofac_test.xml "https://www.treasury.gov/ofac/downloads/sdn.xml"

# Test EU Sanctions
curl -v "https://webgate.ec.europa.eu/fsd/fsf/public/files/csvFullSanctionsList/content?token=dG9rZW4tMjAxNw"
```

### Test Case 2: Test with SSL Verification Disabled (Dev Only)

```javascript
// Add to better-sqlite-server.js temporarily
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // DEV ONLY!
```

### Test Case 3: Test DNS Resolution

```bash
# Check if domains resolve
nslookup data.opensanctions.org
nslookup www.treasury.gov
nslookup webgate.ec.europa.eu
```

### Test Case 4: Test with Postman/Insomnia
- Import API endpoints
- Test with different headers
- Check response formats
- Verify SSL certificates

---

## 📊 Recommended Approach for Demo

Given the SSL and API access challenges, here's the recommended approach:

### Phase 1: Demo-Ready (Immediate)
✅ Use demo data exclusively for the demo
✅ Add environment variable to toggle real APIs
✅ Ensure fallback logic works perfectly
✅ Add "Insert Demo Data" button (already implemented)

### Phase 2: Development (After Demo)
🔧 Research correct API endpoints and documentation
🔧 Install proper XML/CSV parsers
🔧 Fix SSL certificate issues
🔧 Add comprehensive error handling
🔧 Implement retry logic

### Phase 3: Production (Future)
🚀 Use official API clients if available
🚀 Implement caching to reduce API calls
🚀 Add rate limiting
🚀 Monitor API health and uptime
🚀 Set up alerts for API failures

---

## 🎯 Immediate Action Items for Claude

### Task 1: Add Environment Variable for API Toggle
```javascript
// In better-sqlite-server.js
const USE_REAL_APIS = process.env.USE_REAL_SANCTIONS_APIS === 'true';
```

### Task 2: Enhanced Error Logging
```javascript
// Better error logging
catch (error) {
  console.error('❌ [COMPLIANCE] API Error:', {
    api: 'OpenSanctions',
    message: error.message,
    code: error.code,
    errno: error.errno,
    syscall: error.syscall,
    hostname: error.hostname,
    url: error.config?.url,
    status: error.response?.status
  });
}
```

### Task 3: Verify and Document Demo Data
- Review `demo-sanctions-data.js`
- Ensure all 11 companies have complete data
- Verify sanctions structure matches frontend expectations

### Task 4: Add API Documentation Comments
- Document expected API response formats
- Document fallback behavior
- Document error scenarios

---

## 📚 Additional Resources

### OpenSanctions API
- Documentation: https://www.opensanctions.org/docs/api/
- GitHub: https://github.com/opensanctions/opensanctions

### OFAC SDN List
- Main Page: https://www.treasury.gov/resource-center/sanctions/SDN-List/Pages/default.aspx
- Download: https://www.treasury.gov/ofac/downloads/sdn.xml

### EU Sanctions
- Main Portal: https://webgate.ec.europa.eu/fsd/fsf
- Documentation: May require registration

### Node.js SSL Issues
- Node.js TLS: https://nodejs.org/api/tls.html
- Axios SSL: https://github.com/axios/axios#request-config

---

## 🔒 Security Considerations

1. **Never disable SSL verification in production**
2. **Validate all external API responses**
3. **Sanitize data before storing in database**
4. **Rate limit API calls to prevent abuse**
5. **Log security-relevant events**
6. **Use environment variables for sensitive configuration**

---

## ✅ Summary

The Compliance Agent's external API integration is currently non-functional due to:
1. SSL certificate validation issues
2. Incorrect or inaccessible API endpoints
3. Lack of proper XML/CSV parsing
4. Limited error handling

**For the demo**, the fallback to demo data is working correctly and provides a good user experience.

**For production**, significant refactoring is needed to integrate with real APIs reliably.

The recommended immediate approach is to **embrace the demo data** for presentation purposes and schedule proper API integration as a post-demo enhancement.


