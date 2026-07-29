const axios = require('axios');

async function run() {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      identifier: 'faculty1@geu.ac.in', // Using a generic one, maybe it fails, let's see the error message
      password: 'wrongpassword'
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response?.status, err.response?.data);
  }
}
run();
