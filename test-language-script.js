// Test script to verify language switching functionality
const puppeteer = require('puppeteer');

async function testLanguageSwitching() {
    console.log('🚀 Starting language switching test...');
    
    const browser = await puppeteer.launch({ 
        headless: false, // Set to true for headless testing
        devtools: true 
    });
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            console.log('Browser Console:', msg.text());
        });
        
        console.log('📱 Opening main application...');
        await page.goto('http://localhost:3000');
        
        // Wait for app to load
        await page.waitForSelector('.app-container', { timeout: 10000 });
        console.log('✅ App loaded successfully');
        
        // Check if we're on welcome screen or dashboard
        const welcomeScreen = await page.$('#welcome-screen.active');
        const dashboardScreen = await page.$('#dashboard-screen.active');
        
        if (welcomeScreen) {
            console.log('📋 On welcome screen - testing language selection...');
            
            // Test language selection on welcome screen
            await page.click('[data-lang="te"]'); // Select Telugu
            await page.waitForTimeout(1000);
            
            // Check if UI updated
            const appTitle = await page.$eval('.app-title', el => el.textContent);
            console.log('App title after Telugu selection:', appTitle);
            
            // Select a role to proceed
            await page.click('[data-role="vendor"]');
            await page.waitForTimeout(500);
            
            // Click continue
            await page.click('#continue-btn');
            await page.waitForTimeout(2000);
            
            console.log('✅ Completed onboarding');
        }
        
        if (dashboardScreen || await page.$('#dashboard-screen.active')) {
            console.log('🏠 On dashboard - testing language modal...');
            
            // Click language selector to open modal
            await page.click('#language-selector');
            await page.waitForTimeout(500);
            
            // Select Tamil in modal
            await page.click('.modal .language-btn[data-lang="ta"]');
            await page.waitForTimeout(500);
            
            // Click change button
            await page.click('.modal .btn-primary');
            await page.waitForTimeout(2000);
            
            // Check if language changed
            const appTitle = await page.$eval('.app-title', el => el.textContent);
            console.log('App title after Tamil change:', appTitle);
            
            // Test persistence by refreshing
            console.log('🔄 Testing persistence by refreshing...');
            await page.reload();
            await page.waitForTimeout(3000);
            
            const titleAfterRefresh = await page.$eval('.app-title', el => el.textContent);
            console.log('App title after refresh:', titleAfterRefresh);
            
            if (titleAfterRefresh === appTitle) {
                console.log('✅ Language persistence test PASSED');
            } else {
                console.log('❌ Language persistence test FAILED');
                console.log(`Expected: ${appTitle}, Got: ${titleAfterRefresh}`);
            }
        }
        
        console.log('🎉 Language switching test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await browser.close();
    }
}

// Run the test if puppeteer is available
if (typeof require !== 'undefined') {
    try {
        testLanguageSwitching().catch(console.error);
    } catch (error) {
        console.log('⚠️ Puppeteer not available - manual testing required');
        console.log('📋 Manual test steps:');
        console.log('1. Open http://localhost:3000');
        console.log('2. Select a language on welcome screen');
        console.log('3. Complete onboarding');
        console.log('4. Use language selector in header to change language');
        console.log('5. Refresh page to test persistence');
        console.log('6. Verify language does not revert back');
    }
} else {
    console.log('📋 Manual test steps:');
    console.log('1. Open http://localhost:3000');
    console.log('2. Select a language on welcome screen');
    console.log('3. Complete onboarding');
    console.log('4. Use language selector in header to change language');
    console.log('5. Refresh page to test persistence');
    console.log('6. Verify language does not revert back');
}

module.exports = { testLanguageSwitching };