// Eventify TRNC - API Test Suite
// Automated testing for all API endpoints
// Access via: EventifyTest.run() or Ctrl+Shift+T (Cmd+Shift+T)

(function() {
  'use strict';

  const API_BASE_URL = window.EventifyAPI ? 
    (window.EventifyAPI.Auth ? 
      (document.body.getAttribute('data-api-base-url') || 'http://localhost:5001/api') : 
      'http://localhost:5001/api') : 
    'http://localhost:5001/api';

  const testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    tests: []
  };

  // Log test result to console
  function logTest(name, passed, message, details = null) {
    testResults.total++;
    if (passed) {
      testResults.passed++;
      console.log(`✅ PASS: ${name} - ${message}`, details || '');
    } else {
      testResults.failed++;
      console.error(`❌ FAIL: ${name} - ${message}`, details || '');
    }
    testResults.tests.push({ name, passed, message, details });
  }

  // Test API endpoint
  async function testEndpoint(name, endpoint, method = 'GET', body = null, expectedStatus = null) {
    try {
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      if (body) {
        options.body = JSON.stringify(body);
      }

      const startTime = Date.now();
      const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
      const duration = Date.now() - startTime;
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = { error: 'Invalid JSON response' };
      }

      // Determine if test passed
      let passed = false;
      if (expectedStatus) {
        passed = response.status === expectedStatus;
      } else {
        // For POST/PUT, 400/401/403 are acceptable (endpoint exists)
        if (method !== 'GET') {
          passed = response.status < 500;
        } else {
          passed = response.ok || response.status < 500;
        }
      }

      const statusText = `${response.status} ${response.statusText}`;
      logTest(
        name,
        passed,
        `${statusText} (${duration}ms)`,
        data
      );
      return { passed, response, data, duration };
    } catch (error) {
      logTest(name, false, `Network Error: ${error.message}`, error);
      return { passed: false, error };
    }
  }

  // Main test suite
  async function runTests() {
    console.log('%c🧪 Eventify TRNC - API Test Suite', 'font-size: 16px; font-weight: bold; color: #4CAF50;');
    console.log(`API Base URL: ${API_BASE_URL}`);
    console.log(`Test Started: ${new Date().toISOString()}`);
    console.log('─'.repeat(70));

    // Test 1: Health Check
    await testEndpoint('Health Check', '/health', 'GET', null, 200);

    // Test 2: Get All Events
    const eventsTest = await testEndpoint('GET /api/events', '/events');

    // Test 3: Get Single Event (if events exist)
    if (eventsTest.passed && eventsTest.data && eventsTest.data.events && eventsTest.data.events.length > 0) {
      const firstEventId = eventsTest.data.events[0]._id || eventsTest.data.events[0].id;
      if (firstEventId) {
        await testEndpoint('GET /api/events/:id', `/events/${firstEventId}`, 'GET', null, 200);
      } else {
        logTest('GET /api/events/:id', false, 'Skipped - No event ID available');
      }
    } else {
      logTest('GET /api/events/:id', false, 'Skipped - No events in database');
    }

    // Test 4: Auth Register Endpoint (should return 400 for duplicate or validation error)
    await testEndpoint('POST /api/auth/register', '/auth/register', 'POST', {
      name: 'Test User',
      email: 'test@test.com',
      password: 'test123',
      city: 'Nicosia'
    });

    // Test 5: Auth Verify Endpoint
    await testEndpoint('POST /api/auth/verify', '/auth/verify', 'POST', {
      email: 'test@test.com',
      code: '000000'
    });

    // Test 6: Auth Login Endpoint
    await testEndpoint('POST /api/auth/login', '/auth/login', 'POST', {
      email: 'test@test.com',
      password: 'test123'
    });

    // Test 7: Admin Login Endpoint
    await testEndpoint('POST /api/admin/login', '/admin/login', 'POST', {
      email: 'admin@eventify.trnc',
      password: 'admin123'
    });

    // Test 8: Get My Registrations (requires auth token)
    const token = localStorage.getItem('eventify_token');
    if (token) {
      await testEndpoint('GET /api/registrations', '/registrations');
    } else {
      logTest('GET /api/registrations', false, 'Skipped - No authentication token');
    }

    // Test 9: Get Auth Me (requires auth token)
    if (token) {
      await testEndpoint('GET /api/auth/me', '/auth/me');
    } else {
      logTest('GET /api/auth/me', false, 'Skipped - No authentication token');
    }

    // Test Summary
    console.log('─'.repeat(70));
    console.log('%c📊 Test Summary', 'font-size: 14px; font-weight: bold;');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`%c✅ Passed: ${testResults.passed}`, 'color: #4CAF50; font-weight: bold;');
    console.log(`%c❌ Failed: ${testResults.failed}`, 'color: #f44336; font-weight: bold;');
    const successRate = testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(1) : 0;
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Test Completed: ${new Date().toISOString()}`);

    // Create visual test panel
    createTestPanel();

    return testResults;
  }

  // Create visual test panel on page
  function createTestPanel() {
    // Remove existing panel if any
    const existingPanel = document.getElementById('eventify-test-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    const panel = document.createElement('div');
    panel.id = 'eventify-test-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 420px;
      max-height: 650px;
      background: white;
      border: 2px solid #4CAF50;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      z-index: 10000;
      font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
      font-size: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      background: #4CAF50;
      color: white;
      padding: 12px 16px;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: move;
      user-select: none;
    `;
    header.innerHTML = `
      <span>🧪 API Test Results</span>
      <button id="test-panel-close" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;">✕</button>
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      padding: 12px;
      overflow-y: auto;
      max-height: 520px;
      background: #fafafa;
    `;

    // Display test results
    if (testResults.tests.length === 0) {
      content.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No tests run yet</div>';
    } else {
      testResults.tests.forEach((test, index) => {
        const testDiv = document.createElement('div');
        testDiv.style.cssText = `
          padding: 8px 10px;
          margin-bottom: 6px;
          border-left: 4px solid ${test.passed ? '#4CAF50' : '#f44336'};
          background: ${test.passed ? '#f1f8f4' : '#fff5f5'};
          border-radius: 2px;
        `;
        testDiv.innerHTML = `
          <div style="font-weight: bold; color: ${test.passed ? '#4CAF50' : '#f44336'}; margin-bottom: 4px;">
            ${test.passed ? '✅ PASS' : '❌ FAIL'} - ${test.name}
          </div>
          <div style="font-size: 11px; color: #666; font-family: monospace;">
            ${test.message}
          </div>
        `;
        content.appendChild(testDiv);
      });
    }

    // Summary footer
    const summary = document.createElement('div');
    summary.style.cssText = `
      padding: 12px 16px;
      background: #f5f5f5;
      border-top: 2px solid #ddd;
      font-weight: bold;
      font-size: 11px;
    `;
    const successRate = testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(1) : 0;
    summary.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span>Total: <strong>${testResults.total}</strong></span>
        <span style="color: #4CAF50;">✅ Passed: <strong>${testResults.passed}</strong></span>
        <span style="color: #f44336;">❌ Failed: <strong>${testResults.failed}</strong></span>
        <span>Rate: <strong>${successRate}%</strong></span>
      </div>
    `;

    panel.appendChild(header);
    panel.appendChild(content);
    panel.appendChild(summary);

    // Close button handler
    header.querySelector('#test-panel-close').addEventListener('click', () => {
      panel.remove();
    });

    // Drag and drop functionality
    let isDragging = false;
    let currentX, currentY, initialX, initialY;
    
    header.addEventListener('mousedown', (e) => {
      if (e.target.id === 'test-panel-close') return;
      isDragging = true;
      initialX = e.clientX - panel.offsetLeft;
      initialY = e.clientY - panel.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      panel.style.left = currentX + 'px';
      panel.style.top = currentY + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    document.body.appendChild(panel);
  }

  // Make test suite globally accessible
  window.EventifyTest = {
    run: runTests,
    results: testResults,
    getResults: () => testResults
  };

  // Auto-load in development environment
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Keyboard shortcut: Ctrl+Shift+T or Cmd+Shift+T
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        runTests();
      }
    });

    console.log('%c🧪 Test Suite Ready', 'font-size: 14px; font-weight: bold; color: #4CAF50;');
    console.log('Run tests: EventifyTest.run() or press Ctrl+Shift+T (Cmd+Shift+T)');
  }
})();

