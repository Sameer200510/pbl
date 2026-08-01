require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');

async function test() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const res = await pool.query('SELECT * FROM "SystemSettings" LIMIT 1');
    if (!res.rows.length) {
      console.log('No settings found');
      return;
    }
    
    const settings = res.rows[0];
    const MOODLE_URL = settings.moodleUrl;
    const MOODLE_API_TOKEN = settings.moodleApiToken;
    console.log("Using Moodle URL:", MOODLE_URL);
    
    console.log("Fetching user...");
    const userParams = new URLSearchParams({
      wstoken: MOODLE_API_TOKEN,
      wsfunction: 'core_user_get_users_by_field',
      moodlewsrestformat: 'json',
      field: 'username',
      'values[0]': 'stest36'
    });
    
    const userRes = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, userParams.toString());
    const moodleUserId = userRes.data[0]?.id;
    console.log('Moodle User ID:', moodleUserId);

    if (!moodleUserId) {
      console.log("User not found!");
      return;
    }

    const assignmentId = 28286;

    // Test 1: attemptnumber = -1
    console.log("Test 1: attemptnumber = -1, addattempt = 0");
    const p1 = new URLSearchParams({
      wstoken: MOODLE_API_TOKEN,
      wsfunction: 'mod_assign_save_grade',
      moodlewsrestformat: 'json',
      assignmentid: assignmentId,
      userid: moodleUserId,
      grade: 1.0,
      attemptnumber: -1,
      addattempt: 0,
      'plugindata[assignfeedbackcomments_editor][text]': 'Test feedback link',
      'plugindata[assignfeedbackcomments_editor][format]': 1
    });
    let res1 = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, p1.toString());
    console.log('Res 1:', res1.data);

    // Test 2: attemptnumber = 0
    console.log("Test 2: attemptnumber = 0, addattempt = 0");
    const p2 = new URLSearchParams({
      wstoken: MOODLE_API_TOKEN,
      wsfunction: 'mod_assign_save_grade',
      moodlewsrestformat: 'json',
      assignmentid: assignmentId,
      userid: moodleUserId,
      grade: 1.0,
      attemptnumber: 0,
      addattempt: 0,
      'plugindata[assignfeedbackcomments_editor][text]': 'Test feedback link 2',
      'plugindata[assignfeedbackcomments_editor][format]': 1
    });
    let res2 = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, p2.toString());
    console.log('Res 2:', res2.data);

    // Test 3: no plugindata
    console.log("Test 3: No plugindata, attemptnumber = -1");
    const p3 = new URLSearchParams({
      wstoken: MOODLE_API_TOKEN,
      wsfunction: 'mod_assign_save_grade',
      moodlewsrestformat: 'json',
      assignmentid: assignmentId,
      userid: moodleUserId,
      grade: 1.0,
      attemptnumber: -1,
      addattempt: 0
    });
    let res3 = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, p3.toString());
    console.log('Res 3:', res3.data);

  } catch(e) {
    console.log('Exception:', e.message);
  } finally {
    pool.end();
  }
}
test();
