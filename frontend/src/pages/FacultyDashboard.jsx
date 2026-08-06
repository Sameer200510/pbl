import { Link } from 'react-router-dom';

const FacultyDashboard = () => {
  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    window.location.href = '/login';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] w-full font-sans fade-in relative px-3 py-6">
      <div className="text-center mb-8 sm:mb-12 mt-4 sm:mt-10">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1c1f58] tracking-tight mb-2 sm:mb-4">Faculty Role Selection</h1>
        <p className="text-sm sm:text-lg text-gray-600">Please select how you want to continue today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 max-w-4xl w-full px-2 sm:px-6">
        {/* Mentor Card */}
        <Link to="/faculty/mentor" className="group bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-lg sm:shadow-xl border border-gray-100 hover:shadow-2xl hover:scale-[1.02] sm:hover:scale-105 transition-all duration-300">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white mb-4 sm:mb-6 shadow-md group-hover:rotate-6 transition-transform">
            <svg className="w-7 h-7 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">Login as Mentor</h2>
          <p className="text-gray-500 text-sm sm:text-base">View your assigned teams, chat with students, and provide guidance for their PBL projects.</p>
        </Link>

        {/* Evaluator Card */}
        <Link to="/faculty/evaluator" className="group bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-lg sm:shadow-xl border border-gray-100 hover:shadow-2xl hover:scale-[1.02] sm:hover:scale-105 transition-all duration-300">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 text-white mb-4 sm:mb-6 shadow-md group-hover:rotate-6 transition-transform">
            <svg className="w-7 h-7 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
          </div>
          <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">Login as Evaluator</h2>
          <p className="text-gray-500 text-sm sm:text-base">Review phase submissions, grade reports, and finalize scores for teams across the university.</p>
        </Link>
      </div>
    </div>
  );
};

export default FacultyDashboard;
