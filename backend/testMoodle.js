require('dotenv').config();
const { getMoodleConfig } = require('./src/services/moodleService');
const axios = require('axios');

async function run() {
  const config = await getMoodleConfig();
  
  const params = new URLSearchParams();
  params.append('wstoken', config.MOODLE_API_TOKEN);
  params.append('wsfunction', 'core_user_get_users');
  params.append('moodlewsrestformat', 'json');
  params.append('criteria[0][key]', 'username');
  params.append('criteria[0][value]', '2510380298');

  try {
    const res = await axios.post(`${config.MOODLE_URL}/webservice/rest/server.php`, params.toString());
    console.log('User Lookup:', res.data);
  } catch (err) {
    console.error(err);
  }
}
run();
