// Maestro test report generator
// Access Sara's response via maestro.copiedText (from copyTextFrom command)

var timestamp = new Date().toISOString();
var testName = 'sign_in_and_send_message';

// maestro.copiedText contains the text from the last copyTextFrom command
var saraResponse = maestro.copiedText || 'No response captured';

// Build report object
var report = {
  test: testName,
  timestamp: timestamp,
  status: 'PASSED',
  platform: maestro.platform,
  saraResponse: saraResponse,
};

// Log report to console
console.log('');
console.log('=== MAESTRO TEST REPORT ===');
console.log('Test: ' + testName);
console.log('Time: ' + timestamp);
console.log('Platform: ' + maestro.platform);
console.log('Status: PASSED');
console.log('');
console.log('Sara Response:');
console.log(saraResponse);
console.log('');
console.log('=== JSON OUTPUT ===');
console.log(JSON.stringify(report, null, 2));
console.log('=== END REPORT ===');

// Store in output for potential use in subsequent steps
output.report = report;
output.saraResponse = saraResponse;
