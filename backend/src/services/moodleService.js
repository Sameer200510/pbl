const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
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

const getUserMoodleCourses = async (moodleId) => {
  try {
    const config = await getMoodleConfig();
    if (!config.MOODLE_URL || !config.MOODLE_API_TOKEN) {
      return null;
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
    
    if (!moodleUserId) {
      return null;
    }

    const courseParams = new URLSearchParams({
      wstoken: config.MOODLE_API_TOKEN,
      wsfunction: 'core_enrol_get_users_courses',
      moodlewsrestformat: 'json',
      userid: moodleUserId
    });

    const courseRes = await axios.post(`${config.MOODLE_URL}/webservice/rest/server.php`, courseParams.toString());
    
    if (Array.isArray(courseRes.data)) {
      // Return array of course IDs as strings for easy comparison
      return courseRes.data.map(course => String(course.id));
    }
    return null;
  } catch (error) {
    console.error(`[MoodleSync] Failed to fetch courses for ${moodleId}:`, error.message);
    return null;
  }
};

const countMoodleCourseUsers = async (courseId) => {
  try {
    const config = await getMoodleConfig();
    if (!config.MOODLE_URL || !config.MOODLE_API_TOKEN || !courseId) return null;

    const params = new URLSearchParams({
      wstoken: config.MOODLE_API_TOKEN,
      wsfunction: 'core_enrol_get_enrolled_users',
      moodlewsrestformat: 'json',
      courseid: courseId
    });

    const res = await axios.post(`${config.MOODLE_URL}/webservice/rest/server.php`, params.toString());
    if (Array.isArray(res.data)) {
      // Filter out teachers/admins if necessary, but returning length is a good approximation
      return res.data.length;
    }
    return null;
  } catch (err) {
    console.error(`[MoodleSync] Failed to count users for course ${courseId}:`, err.message);
    return null;
  }
};

const getMoodleCourseUsers = async (courseId) => {
  try {
    const config = await getMoodleConfig();
    if (!config.MOODLE_URL || !config.MOODLE_API_TOKEN || !courseId) return null;

    const params = new URLSearchParams({
      wstoken: config.MOODLE_API_TOKEN,
      wsfunction: 'core_enrol_get_enrolled_users',
      moodlewsrestformat: 'json',
      courseid: courseId
    });

    const res = await axios.post(`${config.MOODLE_URL}/webservice/rest/server.php`, params.toString());
    if (Array.isArray(res.data)) {
      // Return an array of usernames
      return res.data.map(user => String(user.username));
    }
    return null;
  } catch (err) {
    console.error(`[MoodleSync] Failed to fetch users for course ${courseId}:`, err.message);
    return null;
  }
};

const resolveAssignmentId = async (config, providedId) => {
  try {
    const params = new URLSearchParams({
      wstoken: config.MOODLE_API_TOKEN,
      wsfunction: 'mod_assign_get_assignments',
      moodlewsrestformat: 'json'
    });
    const res = await axios.post(`${config.MOODLE_URL}/webservice/rest/server.php`, params.toString());
    
    if (res.data && res.data.courses) {
      for (const course of res.data.courses) {
        for (const assignment of course.assignments) {
          if (assignment.id == providedId) {
            return assignment.id; // User provided the true instance ID
          }
          if (assignment.cmid == providedId) {
            console.log(`[MoodleSync] Auto-resolved CMID ${providedId} to Assignment Instance ID ${assignment.id}`);
            return assignment.id; // User provided CMID from URL, resolve it!
          }
        }
      }
    }
  } catch(e) {
    console.error('[MoodleSync] Failed to resolve assignment ID:', e.message);
  }
  return providedId; // Fallback to what was provided
};

const uploadFileToMoodle = async (moodleId, assignmentId, fileUrl) => {
  try {
    const config = await getMoodleConfig();
    
    if (!config.MOODLE_URL || !config.MOODLE_API_TOKEN || !assignmentId) {
      console.log(`[MoodleSync] Moodle not configured properly.`);
      return false;
    }

    // --- Fetch File Stream from URL ---
    console.log(`[MoodleSync] Fetching file from ${fileUrl}...`);
    const fileResponse = await axios({
      method: 'get',
      url: fileUrl,
      responseType: 'stream'
    });
    const filename = fileUrl.split('/').pop() || 'submission.pdf';

    // --- STEP 1: Upload File to Moodle Draft Area ---
    const form = new FormData();
    form.append('token', config.MOODLE_API_TOKEN);
    form.append('filearea', 'draft'); // Uploading to draft area
    form.append('itemid', 0); // 0 creates a new draft area
    form.append('file', fileResponse.data, { filename }); 

    console.log(`[MoodleSync] Uploading file to draft area...`);
    const uploadRes = await axios.post(`${config.MOODLE_URL}/webservice/upload.php`, form, {
      headers: form.getHeaders(),
    });

    if (uploadRes.data && uploadRes.data.error) {
      throw new Error(uploadRes.data.error);
    }

    // Moodle returns an array, we extract itemid
    const draftItemId = uploadRes.data[0].itemid;
    console.log(`[MoodleSync] File uploaded! Draft Item ID: ${draftItemId}`);

    // --- STEP 2: Link that Draft File to the Assignment Submission ---
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

    const trueAssignmentId = await resolveAssignmentId(config, assignmentId);

    const submitParams = new URLSearchParams({
      wstoken: config.MOODLE_API_TOKEN,
      wsfunction: 'mod_assign_save_submission',
      moodlewsrestformat: 'json',
      assignmentid: trueAssignmentId,
      'plugindata[files_filemanager]': draftItemId 
    });

    const submitRes = await axios.post(`${config.MOODLE_URL}/webservice/rest/server.php`, submitParams.toString());
    
    if (submitRes.data && submitRes.data.exception) {
      throw new Error(submitRes.data.message || submitRes.data.exception);
    }

    console.log(`[MoodleSync] Successfully submitted actual file for ${moodleId} to assignment ${trueAssignmentId}`);
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
    
    const trueAssignmentId = await resolveAssignmentId(config, assignmentId);

    const gradeParams = new URLSearchParams({
      wstoken: config.MOODLE_API_TOKEN,
      wsfunction: 'mod_assign_save_grade',
      moodlewsrestformat: 'json',
      assignmentid: trueAssignmentId,
      userid: moodleUserId,
      grade: Number(grade), // use Number instead of toFixed(2) to avoid string issues
      attemptnumber: -1,
      addattempt: 0,
      workflowstate: 'graded',
      applytoall: 0, // CRITICAL: This was missing and caused invalid_parameter_exception
      'plugindata[assignfeedbackcomments_editor][text]': feedback,
      'plugindata[assignfeedbackcomments_editor][format]': 1
    });

    // If attemptnumber: -1 fails (which it often does for users with 0 submissions), fallback to attempt 0
    let gradeRes = await axios.post(`${config.MOODLE_URL}/webservice/rest/server.php`, gradeParams.toString());
    
    if (gradeRes.data && gradeRes.data.exception) {
      if (gradeRes.data.errorcode === 'invalidparameter') {
        console.log(`[MoodleSync] attemptnumber -1 failed, trying attemptnumber 0...`);
        gradeParams.set('attemptnumber', 0);
        gradeRes = await axios.post(`${config.MOODLE_URL}/webservice/rest/server.php`, gradeParams.toString());
        if (gradeRes.data && gradeRes.data.exception) {
          throw new Error(gradeRes.data.message || gradeRes.data.exception);
        }
      } else {
        throw new Error(gradeRes.data.message || gradeRes.data.exception);
      }
    }
    console.log(`[MoodleSync] Synced grade for ${moodleId} to assignment ${trueAssignmentId}`);
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

    const response = await axios.post(`${config.MOODLE_URL}/webservice/rest/server.php`, params.toString(), {
      timeout: 10000 // 10 second timeout to prevent infinite hang
    });

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

const enrollUserInMoodleCourse = async (moodleUsername, courseId, roleName) => {
  try {
    const config = await getMoodleConfig();
    
    if (!config.MOODLE_URL || !config.MOODLE_API_TOKEN) {
      console.log(`[MoodleSync] Moodle not configured.`);
      return false;
    }

    // Role IDs (Normally these are the default IDs in Moodle)
    const roleIds = {
      student: 5,
      teacher: 3,
      admin: 1
    };
    const roleId = roleIds[roleName.toLowerCase()] || 5;

    // 1. Get internal user ID from moodleId
    const userParams = new URLSearchParams({
      wstoken: config.MOODLE_API_TOKEN,
      wsfunction: 'core_user_get_users_by_field',
      moodlewsrestformat: 'json',
      field: 'username',
      'values[0]': moodleUsername
    });
    
    const userRes = await axios.post(`${config.MOODLE_URL}/webservice/rest/server.php`, userParams.toString());
    const moodleUserId = userRes.data[0]?.id;
    
    if (!moodleUserId) {
      throw new Error(`Moodle User not found for username: ${moodleUsername}`);
    }

    // 2. Enroll user in course
    const enrolParams = new URLSearchParams({
      wstoken: config.MOODLE_API_TOKEN,
      wsfunction: 'enrol_manual_enrol_users',
      moodlewsrestformat: 'json',
      'enrolments[0][roleid]': roleId,
      'enrolments[0][userid]': moodleUserId,
      'enrolments[0][courseid]': courseId
    });

    const enrolRes = await axios.post(`${config.MOODLE_URL}/webservice/rest/server.php`, enrolParams.toString());

    if (enrolRes.data && enrolRes.data.exception) {
      throw new Error(enrolRes.data.message);
    }

    console.log(`[MoodleSync] Successfully enrolled ${moodleUsername} as ${roleName} in Course ID ${courseId}`);
    return true;

  } catch (error) {
    console.error(`[MoodleSync] Failed to enroll user:`, error.message);
    return false;
  }
};

module.exports = {
  getMoodleConfig,
  syncMoodlePassword,
  uploadFileToMoodle,
  syncGradeToMoodle,
  getMoodleAssignmentTimeline,
  authenticateMoodleUser,
  getUserMoodleCourses,
  countMoodleCourseUsers,
  getMoodleCourseUsers,
  enrollUserInMoodleCourse
};
