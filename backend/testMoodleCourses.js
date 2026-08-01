require('dotenv').config();
const { getMoodleConfig } = require('./src/services/moodleService');
const axios = require('axios');

async function test() {
  const config = {
    MOODLE_URL: process.env.MOODLE_URL,
    MOODLE_API_TOKEN: process.env.MOODLE_API_TOKEN
  };
  
  if (!config.MOODLE_URL) {
    console.log("No moodle url");
    return;
  }
  
  // mock user id: admin
  const userParams = new URLSearchParams({
    wstoken: config.MOODLE_API_TOKEN,
    wsfunction: 'core_user_get_users_by_field',
    moodlewsrestformat: 'json',
    field: 'username',
    'values[0]': 'admin'
  });

  const userRes = await axios.post(`${config.MOODLE_URL}/webservice/rest/server.php`, userParams.toString());
  const moodleUserId = userRes.data[0]?.id;
  console.log("Moodle User ID:", moodleUserId);

  if (moodleUserId) {
    const courseParams = new URLSearchParams({
      wstoken: config.MOODLE_API_TOKEN,
      wsfunction: 'core_enrol_get_users_courses',
      moodlewsrestformat: 'json',
      userid: moodleUserId
    });
    const courseRes = await axios.post(`${config.MOODLE_URL}/webservice/rest/server.php`, courseParams.toString());
    console.log("Courses:", courseRes.data);
  }
}
test().catch(console.error);
