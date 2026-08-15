//it is only for testing the connection to google sheet and writing a dummy row to it.

// import 'dotenv/config';
// import { google } from 'googleapis';

// const SPREADSHEET_ID = '1KSnemPRAX5ocKjMCCn9jTe8qh98mXomB845jtRMUsIA';

// const auth = new google.auth.GoogleAuth({
//   keyFile: 'credentials.json',
//   scopes: ['https://www.googleapis.com/auth/spreadsheets']
// });

// const sheets = google.sheets({ version: 'v4', auth });

// async function testConnection() {
//   try {
//     console.log('⏳ Connecting to Google Sheets...');
    
//     // 1. Test fetching sheet metadata
//     const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
//     console.log('✅ Connected successfully!');
//     console.log('📄 Sheet Title:', meta.data.properties.title);
    
//     const tabs = meta.data.sheets.map(s => s.properties.title);
//     console.log('📋 Available Tab Names:', tabs);

//     // 2. Test appending a dummy row
//     const firstTab = tabs[0];
//     console.log(`⏳ Attempting to write to tab: "${firstTab}"...`);
    
//     await sheets.spreadsheets.values.append({
//       spreadsheetId: SPREADSHEET_ID,
//       range: `'${firstTab}'!A:H`,
//       valueInputOption: 'USER_ENTERED',
//       requestBody: {
//         values: [['TEST_URL', 'Test Product', 'Brand', 100, 5, 10, 'In Stock', 'ASIN123']]
//       }
//     });

//     console.log('🎉 SUCCESS! Test row added to Google Sheets!');
//   } catch (error) {
//     console.error('❌ Google API Error Details:\n', error.message);
//   }
// }

// testConnection();



import 'dotenv/config';
import { google } from 'googleapis';

const SPREADSHEET_ID = '1KSnemPRAX5ocKjMcCN9jTe8qh98mXomB845jtRMUSiA';

const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

async function testConnection() {
  try {
    console.log('⏳ Connecting using ID:', SPREADSHEET_ID);
    
    // Get client email from credentials
    const authClient = await auth.getClient();
    console.log('🔑 Authenticated as:', authClient.email);

    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    console.log('🎉 SUCCESS! Connected to Sheet Title:', meta.data.properties.title);
  } catch (error) {
    console.error('❌ Status Code:', error.code || error.status);
    console.error('❌ Full Error Message:', error.message);
  }
}

testConnection();