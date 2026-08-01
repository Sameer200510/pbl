import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import AdminDashboard from './pages/AdminDashboard';
import AdminPblManagement from './pages/AdminPblManagement';
import AdminReports from './pages/AdminReports';
import AdminTeamManagement from './pages/AdminTeamManagement';
import AdminFacultyAllocation from './pages/AdminFacultyAllocation';
import AdminUserManagement from './pages/AdminUserManagement';
import AdminPhaseConfig from './pages/AdminPhaseConfig';
import AdminResult from './pages/AdminResult';
import AdminReevaluation from './pages/AdminReevaluation';
import AdminMicroMentor from './pages/AdminMicroMentor';
import AdminLayout from './components/AdminLayout';
import StudentLayout from './components/StudentLayout';
import StudentDashboard from './pages/StudentDashboard';
import StudentPhaseSubmission from './pages/StudentPhaseSubmission';
import StudentPeerReviews from './pages/StudentPeerReviews';
import FacultyLayout from './components/FacultyLayout';
import FacultyDashboard from './pages/FacultyDashboard';
import FacultyMentorTeams from './pages/FacultyMentorTeams';
import FacultyEvaluatorTeams from './pages/FacultyEvaluatorTeams';

import SuperAdminLayout from './components/SuperAdminLayout';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SuperAdminSettings from './pages/SuperAdminSettings';

import DeveloperInfo from './components/DeveloperInfo';

function App() {
  return (
    <Router>
      <DeveloperInfo />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/change-password" element={<ChangePassword />} />

        {/* Super Admin Routes */}
        <Route path="/super-admin" element={<SuperAdminLayout />}>
          <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="settings" element={<SuperAdminSettings />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="pbls" element={<AdminPblManagement />} />
          <Route path="teams" element={<AdminTeamManagement />} />
          <Route path="users" element={<AdminUserManagement />} />
          <Route path="faculty" element={<AdminFacultyAllocation />} />
          <Route path="phase-config" element={<AdminPhaseConfig />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="results" element={<AdminResult />} />
          <Route path="reevaluation" element={<AdminReevaluation />} />
          <Route path="micro-mentor" element={<AdminMicroMentor />} />
        </Route>
        
        {/* Student Routes */}
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<Navigate to="/student/dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="phase/:phaseId" element={<StudentPhaseSubmission />} />
          <Route path="peer-reviews" element={<StudentPeerReviews />} />
        </Route>
        
        {/* Faculty Routes */}
        <Route path="/faculty" element={<FacultyLayout />}>
          <Route index element={<Navigate to="/faculty/dashboard" replace />} />
          <Route path="dashboard" element={<FacultyDashboard />} />
          <Route path="mentor" element={<FacultyMentorTeams />} />
          <Route path="evaluator" element={<FacultyEvaluatorTeams />} />
        </Route>
        
        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
