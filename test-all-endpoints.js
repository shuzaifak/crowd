#!/usr/bin/env node

const fetch = require('node-fetch');

const BASE_URL = 'https://crowd-web01.vercel.app';
let authToken = '';
let testUserId = '';

// Test data
const testUser = {
    email: 'test@crowdtest.com',
    firstName: 'John',
    lastName: 'Doe',
    password: 'TestPassword123!',
    isOrganizer: true
};

const testEvent = {
    title: 'Tech Conference 2025 Test',
    description: 'A test tech conference for API testing',
    category: 'Technology',
    location: 'Online',
    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    endDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(), // 31 days from now
    price: 99,
    currency: 'USD',
    maxAttendees: 100
};

const testBankAccount = {
    accountHolderName: 'John Doe',
    bankName: 'Test Bank',
    accountNumber: '1234567890',
    routingNumber: '987654321',
    accountType: 'checking',
    country: 'US',
    currency: 'USD'
};

// Helper function to make API requests
async function apiRequest(endpoint, method = 'GET', data = null, useAuth = false) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
    };
    
    if (useAuth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const config = {
        method,
        headers
    };
    
    if (data && method !== 'GET') {
        config.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, config);
        const result = await response.text();
        
        let parsedResult;
        try {
            parsedResult = JSON.parse(result);
        } catch {
            parsedResult = result;
        }
        
        return {
            status: response.status,
            ok: response.ok,
            data: parsedResult
        };
    } catch (error) {
        return {
            status: 0,
            ok: false,
            error: error.message
        };
    }
}

// Test functions
async function testBasicEndpoints() {
    console.log('\n=== TESTING BASIC ENDPOINTS ===');
    
    // Test health check
    console.log('\n1. Testing /api/health');
    const health = await apiRequest('/api/health');
    console.log('Status:', health.status);
    console.log('Response:', JSON.stringify(health.data, null, 2));
    
    // Test root endpoint
    console.log('\n2. Testing / (root)');
    const root = await apiRequest('/');
    console.log('Status:', root.status);
    if (root.ok) {
        console.log('Available endpoints:', Object.keys(root.data.endpoints || {}));
    } else {
        console.log('Error:', root.data);
    }
    
    // Test 404 handling
    console.log('\n3. Testing 404 handling');
    const notFound = await apiRequest('/api/nonexistent');
    console.log('Status:', notFound.status);
    console.log('Response:', notFound.data);
}

async function testAuthEndpoints() {
    console.log('\n=== TESTING AUTHENTICATION ENDPOINTS ===');
    
    // Test signup
    console.log('\n1. Testing /api/auth/signup');
    const signup = await apiRequest('/api/auth/signup', 'POST', testUser);
    console.log('Status:', signup.status);
    if (signup.ok) {
        console.log('✅ Signup successful');
        console.log('User ID:', signup.data.user?.id);
        testUserId = signup.data.user?.id;
    } else {
        console.log('❌ Signup failed:', signup.data);
    }
    
    // Test login
    console.log('\n2. Testing /api/auth/login');
    const login = await apiRequest('/api/auth/login', 'POST', {
        email: testUser.email,
        password: testUser.password
    });
    console.log('Status:', login.status);
    if (login.ok) {
        console.log('✅ Login successful');
        authToken = login.data.token;
        console.log('Token received:', !!authToken);
    } else {
        console.log('❌ Login failed:', login.data);
    }
    
    // Test profile (protected route)
    if (authToken) {
        console.log('\n3. Testing /api/auth/me (protected)');
        const profile = await apiRequest('/api/auth/me', 'GET', null, true);
        console.log('Status:', profile.status);
        if (profile.ok) {
            console.log('✅ Profile fetch successful');
            console.log('User:', profile.data.user?.email);
        } else {
            console.log('❌ Profile fetch failed:', profile.data);
        }
    }
}

async function testEventEndpoints() {
    console.log('\n=== TESTING EVENT ENDPOINTS ===');
    
    // Test public events
    console.log('\n1. Testing /api/events (public events)');
    const publicEvents = await apiRequest('/api/events');
    console.log('Status:', publicEvents.status);
    if (publicEvents.ok) {
        console.log('✅ Public events fetch successful');
        console.log('Events count:', publicEvents.data.length || 'N/A');
    } else {
        console.log('❌ Public events failed:', publicEvents.data);
    }
    
    // Test create event (protected)
    if (authToken) {
        console.log('\n2. Testing /api/events (create event)');
        const createEvent = await apiRequest('/api/events', 'POST', testEvent, true);
        console.log('Status:', createEvent.status);
        if (createEvent.ok) {
            console.log('✅ Event creation successful');
            console.log('Event ID:', createEvent.data.event?.id);
        } else {
            console.log('❌ Event creation failed:', createEvent.data);
        }
    }
    
    // Test event search
    console.log('\n3. Testing /api/events?search=tech');
    const searchEvents = await apiRequest('/api/events?search=tech');
    console.log('Status:', searchEvents.status);
    if (searchEvents.ok) {
        console.log('✅ Event search successful');
        console.log('Results count:', searchEvents.data.length || 'N/A');
    } else {
        console.log('❌ Event search failed:', searchEvents.data);
    }
}

async function testUserEndpoints() {
    console.log('\n=== TESTING USER ENDPOINTS ===');
    
    if (authToken) {
        // Test user profile update
        console.log('\n1. Testing /api/users/profile (update)');
        const updateProfile = await apiRequest('/api/users/profile', 'PUT', {
            bio: 'Updated bio for API testing'
        }, true);
        console.log('Status:', updateProfile.status);
        if (updateProfile.ok) {
            console.log('✅ Profile update successful');
        } else {
            console.log('❌ Profile update failed:', updateProfile.data);
        }
        
        // Test user stats
        console.log('\n2. Testing /api/users/stats');
        const userStats = await apiRequest('/api/users/stats', 'GET', null, true);
        console.log('Status:', userStats.status);
        if (userStats.ok) {
            console.log('✅ User stats fetch successful');
            console.log('Stats keys:', Object.keys(userStats.data || {}));
        } else {
            console.log('❌ User stats failed:', userStats.data);
        }
    }
}

async function testFinanceEndpoints() {
    console.log('\n=== TESTING FINANCE ENDPOINTS ===');
    
    if (authToken) {
        // Test bank accounts
        console.log('\n1. Testing /api/finance/bank-accounts');
        const bankAccounts = await apiRequest('/api/finance/bank-accounts', 'GET', null, true);
        console.log('Status:', bankAccounts.status);
        if (bankAccounts.ok) {
            console.log('✅ Bank accounts fetch successful');
            console.log('Accounts count:', bankAccounts.data?.length || 0);
        } else {
            console.log('❌ Bank accounts failed:', bankAccounts.data);
        }
        
        // Test create bank account
        console.log('\n2. Testing /api/finance/bank-accounts (create)');
        const createAccount = await apiRequest('/api/finance/bank-accounts', 'POST', testBankAccount, true);
        console.log('Status:', createAccount.status);
        if (createAccount.ok) {
            console.log('✅ Bank account creation successful');
        } else {
            console.log('❌ Bank account creation failed:', createAccount.data);
        }
        
        // Test financial summary
        console.log('\n3. Testing /api/finance/summary');
        const summary = await apiRequest('/api/finance/summary', 'GET', null, true);
        console.log('Status:', summary.status);
        if (summary.ok) {
            console.log('✅ Financial summary successful');
            console.log('Available balance:', summary.data?.availableBalance);
        } else {
            console.log('❌ Financial summary failed:', summary.data);
        }
    }
}

async function testOtherEndpoints() {
    console.log('\n=== TESTING OTHER FEATURE ENDPOINTS ===');
    
    // Test apps marketplace
    console.log('\n1. Testing /api/apps');
    const apps = await apiRequest('/api/apps');
    console.log('Status:', apps.status);
    if (apps.ok) {
        console.log('✅ Apps fetch successful');
        console.log('Apps count:', apps.data?.length || 0);
    } else {
        console.log('❌ Apps fetch failed:', apps.data);
    }
    
    if (authToken) {
        // Test dashboard
        console.log('\n2. Testing /api/dashboard/overview');
        const dashboard = await apiRequest('/api/dashboard/overview', 'GET', null, true);
        console.log('Status:', dashboard.status);
        if (dashboard.ok) {
            console.log('✅ Dashboard fetch successful');
        } else {
            console.log('❌ Dashboard fetch failed:', dashboard.data);
        }
        
        // Test analytics
        console.log('\n3. Testing /api/analytics/events');
        const analytics = await apiRequest('/api/analytics/events', 'GET', null, true);
        console.log('Status:', analytics.status);
        if (analytics.ok) {
            console.log('✅ Analytics fetch successful');
        } else {
            console.log('❌ Analytics fetch failed:', analytics.data);
        }
        
        // Test marketing
        console.log('\n4. Testing /api/marketing/campaigns');
        const marketing = await apiRequest('/api/marketing/campaigns', 'GET', null, true);
        console.log('Status:', marketing.status);
        if (marketing.ok) {
            console.log('✅ Marketing fetch successful');
        } else {
            console.log('❌ Marketing fetch failed:', marketing.data);
        }
    }
}

// Main test runner
async function runAllTests() {
    console.log('🚀 STARTING COMPREHENSIVE API TESTS');
    console.log('Base URL:', BASE_URL);
    console.log('Timestamp:', new Date().toISOString());
    
    await testBasicEndpoints();
    await testAuthEndpoints();
    await testEventEndpoints();
    await testUserEndpoints();
    await testFinanceEndpoints();
    await testOtherEndpoints();
    
    console.log('\n=== TEST SUMMARY ===');
    console.log('✅ All tests completed!');
    console.log('Auth token obtained:', !!authToken);
    console.log('Test user ID:', testUserId || 'Not created');
    console.log('\n📝 Check the detailed results above for any failures.');
}

// Run the tests
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { runAllTests, apiRequest };