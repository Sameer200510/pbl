const axios = require('axios');
const prisma = require('../config/db');

const getMoodleConfig = async () => {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ['MOODLE_URL', 'MOODLE_API_TOKEN'] } }
  });

  const config = {};
  settings.forEach(s => config[s.key] = s.value);
  
  if (!config.MOODLE_URL) config.MOODLE_URL = process.env.MOODLE_URL;
  if (!config.MOODLE_API_TOKEN) config.MOODLE_API_TOKEN = process.env.MOODLE_API_TOKEN;
  
  return config;
};

const syncMoodlePassword = async (moodleId, newPassword) => {
  try {
    const config = await getMoodleConfig();

    // If Moodle isn't configured, mock the behavior for testing
    if (!config.MOODLE_URL || !config.MOODLE_API_TOKEN) {
      console.log(`[MoodleSync MOCK] Skipped real password sync for ${moodleId}: Moodle not configured. Returning success.`);
      return true;
    }

    // Moodle Web Services API expects parameters in a specific format for update_users
    // IMPORTANT: core_user_update_users REQUIRES the internal Moodle ID (integer), not the username.

    // 1. First get Moodle Internal User ID
    const userParams = new URLSearchParams({
      wstoken: config.MOODLE_API_TOKEN,
      wsfunction: 'core_user_get_users_by_field',
      moodlewsrestformat: 'json',
      field: 'username',
      'values[0]': moodleId
    });

    const userRes = await axios.post(`${config.MOODLE_URL}/webservice/rest/server.php`, userParams.toString());
    const moodleUserId = userRes.data[0]?.id;
    
    if (!moodleUserId) {
      console.error(`[MoodleSync] Error: Could not find internal Moodle ID for username: ${moodleId}`);
      return false;
    }

    // 2. Now update the password using the internal ID
    const params = new URLSearchParams();
    params.append('wstoken', config.MOODLE_API_TOKEN);
    params.append('wsfunction', 'core_user_update_users');
    params.append('moodlewsrestformat', 'json');
    params.append('users[0][id]', moodleUserId);
    params.append('users[0][password]', newPassword);

    const response = await axios.post(`${config.MOODLE_URL}/webservice/rest/server.php`, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.data && response.data.exception) {
      console.error(`[MoodleSync] Error syncing password for ${moodleId}:`, JSON.stringify(response.data));
      return false;
    }

    console.log(`[MoodleSync] Successfully synced password for ${moodleId}`);
    return true;

  } catch (error) {
    console.error(`[MoodleSync] Failed to sync password for ${moodleId}:`, error.message);
    return false;
  }
};

const uploadFileToMoodle = async (moodleId, assignmentId, fileUrl) => {
  try {
    const config = await getMoodleConfig();
    if (!config.MOODLE_URL || !config.MOODLE_API_TOKEN || !assignmentId) {
      console.log(`[MoodleSync MOCK] Mocked file upload for ${moodleId}`);
      return true;
    }

    // First get Moodle Internal User ID
    const userParams = new URLSearchParams({
      wstoken: config.MOODLE_API_TOKEN,
      wsfunction: 'core_user_get_users_by_field',
      moodlewsrestformat: 'json',
      field: 'username',
      'values[0]': moodleId
    });

    const userRes = await axios.post(`${config.MOODLE_URL}/webservice/rest/server.php`, userParams.toString());
    const moodleUserId = userRes.data[0]?.id;
    if (!moodleUserId) throw new Error('Moodle User not found');

    // Simulate file upload to draft area & save submission (In a real system, requires multipart/form-data upload to core_files_upload)
    const submitParams = new URLSearchParams({
      wstoken: config.MOODLE_API_TOKEN,
      wsfunction: 'mod_assign_save_submission',
      moodlewsrestformat: 'json',
      assignmentid: assignmentId,
      'plugindata[onlinetext_editor][text]': `File uploaded via PBL Portal: ${fileUrl}`,
      'plugindata[onlinetext_editor][format]': 1,
      'plugindata[onlinetext_editor][itemid]': 0 // Usually draft item ID goes here
    });

    await axios.post(`${config.MOODLE_URL}/webservice/rest/server.php`, submitParams.toString());

    console.log(`[MoodleSync] Submitted file for ${moodleId} to assignment ${assignmentId}`);
    return true;
  } catch (error) {
    console.error(`[MoodleSync] Failed submission sync:`, error.message);
    return false;
  }
};

const syncGradeToMoodle = async (moodleId, assignmentId, grade, feedback) => {
  try {
    const config = await getMoodleConfig();
    if (!config.MOODLE_URL || !config.MOODLE_API_TOKEN || !assignmentId) {
      console.log(`[MoodleSync MOCK] Mocked grade sync for ${moodleId} (Grade: ${grade})`);
      return true;
    }

    const userParams = new URLSearchParams({
      wstoken: config.MOODLE_API_TOKEN,
      wsfunction: 'core_user_get_users_by_field',
      moodlewsrestformat: 'json',
      field: 'username',
      'values[0]': moodleId
    });

    const userRes = await axios.post(`${config.MOODLE_URL}/webservice/rest/server.php`, userParams.toString());
    const moodleUserId = userRes.data[0]?.id;
    if (!moodleUserId) throw new Error('Moodle User not found');

    const gradeParams = new URLSearchParams({
      wstoken: config.MOODLE_API_TOKEN,
      wsfunction: 'mod_assign_save_grade',
      moodlewsrestformat: 'json',
      assignmentid: assignmentId,
      userid: moodleUserId,
      grade: grade,
      attemptnumber: -1,
      addattempt: 0,
      workflowstate: 'graded',
      applytoall: 1,
      'plugindata[assignfeedbackcomments_editor][text]': feedback,
      'plugindata[assignfeedbackcomments_editor][format]': 1
    });

    await axios.post(`${config.MOODLE_URL}/webservice/rest/server.php`, gradeParams.toString());
    console.log(`[MoodleSync] Synced grade for ${moodleId} to assignment ${assignmentId}`);
    return true;
  } catch (error) {
    console.error(`[MoodleSync] Failed grade sync:`, error.message);
    return false;
  }
};

const getMoodleAssignmentTimeline = async (assignmentId) => {
  try {
    const config = await getMoodleConfig();
    if (!config.MOODLE_URL || !config.MOODLE_API_TOKEN || !assignmentId) {
      console.log(`[MoodleSync MOCK] Mocked timeline for assignment ${assignmentId}`);
      return { 
        startDate: new Date(Date.now() - 86400000), // yesterday
        dueDate: new Date(Date.now() + 86400000 * 7) // next week
      };
    }

    const params = new URLSearchParams({
      wstoken: config.MOODLE_API_TOKEN,
      wsfunction: 'mod_assign_get_assignments',
      moodlewsrestformat: 'json',
      'assignmentids[0]': assignmentId
    });

    const response = await axios.post(`${config.MOODLE_URL}/webservice/rest/server.php`, params.toString());

    // Moodle returns { courses: [ { assignments: [ { id, allowsubmissionsfromdate, duedate, ... } ] } ] }
    if (response.data && response.data.courses && response.data.courses.length > 0) {
      const course = response.data.courses[0];
      if (course.assignments && course.assignments.length > 0) {
        const assign = course.assignments[0];

        // Moodle dates are Unix timestamps (seconds). Convert to standard JS Date.
        const startDate = assign.allowsubmissionsfromdate ? new Date(assign.allowsubmissionsfromdate * 1000) : null;
        const dueDate = assign.duedate ? new Date(assign.duedate * 1000) : null;

        console.log(`[MoodleSync] Fetched timeline for assignment ${assignmentId}`);
        return { startDate, dueDate };
      }
    }

    return null;
  } catch (error) {
    console.error(`[MoodleSync] Failed to fetch assignment timeline:`, error.message);
    return null;
  }
};

const authenticateMoodleUser = async (username, password) => {
  try {
    const config = await getMoodleConfig();

    if (!config.MOODLE_URL) {
      console.log(`[MoodleAuth] Skipped Moodle Auth for ${username}: Moodle URL not configured.`);
      return { success: false, reason: 'not_configured' };
    }

    // Call Moodle's token.php to verify credentials
    // Note: 'moodle_mobile_app' is a standard Moodle service that is usually enabled by default
    const response = await axios.post(`${config.MOODLE_URL}/login/token.php`, null, {
      params: {
        username: username,
        password: password,
        service: 'moodle_mobile_app'
      }
    });

    if (response.data && response.data.token) {
      console.log(`[MoodleAuth] User ${username} successfully authenticated via Moodle API.`);
      return { success: true, token: response.data.token };
    } else {
      console.log(`[MoodleAuth] Moodle authentication failed for ${username}:`, response.data.error);
      return { success: false, reason: 'invalid_credentials' };
    }
  } catch (error) {
    console.error(`[MoodleAuth] API Error during authentication:`, error.message);
    return { success: false, reason: 'api_error' };
  }
};

module.exports = {
  getMoodleConfig,
  syncMoodlePassword,
  uploadFileToMoodle,
  syncGradeToMoodle,
  getMoodleAssignmentTimeline,
  authenticateMoodleUser
};
