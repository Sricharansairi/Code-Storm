import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowRight, Lightbulb, Download, Layers } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen selection:bg-white/20">
      {/* Navigation */}
      <nav className="bg-black/40 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center sticky top-0 z-10 gap-3">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/sri-indu-logo.jpg" alt="Logo" className="h-9 object-contain rounded-md" />
          <h1 className="text-lg sm:text-xl font-bold text-white">Code Storm 2026</h1>
        </div>
        <div className="flex flex-wrap gap-2.5 sm:gap-3 items-center">
          <button 
            onClick={() => navigate('/allocation')} 
            className="text-xs sm:text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/15 px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 backdrop-blur-md"
          >
            <Layers size={15} /> View Allocation
          </button>
          <button 
            onClick={() => navigate('/auth')} 
            className="text-xs sm:text-sm font-medium text-gray-400 hover:text-white transition-colors px-2"
          >
            Admin Auth
          </button>
          <button 
            onClick={() => navigate('/login')} 
            className="btn-secondary text-xs sm:text-sm py-2 px-3.5"
          >
            Leader Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-xl md:text-2xl font-bold text-gray-300 mb-2 tracking-widest uppercase">Code Storm 2026</h2>
        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6">
          Internal Hackathon for <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400">SIH 2026</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed">
          Welcome to Code Storm 2026. The ultimate hackathon experience. Build innovative solutions, tackle real-world problems, and showcase your skills.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-2xl mx-auto">
          <button 
            onClick={() => navigate('/allocation')} 
            className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2 text-base px-7 py-3.5 shadow-2xl font-bold"
          >
            <Layers size={18} /> View Your Batch & Day Allocation <ArrowRight size={18} />
          </button>
          
          <button 
            onClick={() => navigate('/details')} 
            className="w-full sm:w-auto btn-secondary flex items-center justify-center gap-2 text-base px-6 py-3.5"
          >
            <Download size={18} /> Event Details & PPT Format
          </button>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-4 text-xs text-gray-400">
          <button 
            onClick={() => navigate('/login')} 
            className="hover:text-white underline underline-offset-4 py-1"
          >
            Exercise Options (Team Leader Login)
          </button>
          <span className="hidden sm:inline text-gray-600">•</span>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="hover:text-white underline underline-offset-4 py-1"
          >
            View Statements (Guest)
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div id="about" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white">About Code Storm 2026</h2>
            <p className="mt-4 text-lg text-gray-300">SIIET's internal hackathon to select teams for Smart India Hackathon 2026</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="card text-center p-8 bg-white/[0.03] border border-white/10">
              <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10">
                <Trophy size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">SIH 2026 Selection</h3>
              <p className="text-gray-400 text-sm">Top performers get selected to represent SIIET at the national-level Smart India Hackathon 2026.</p>
            </div>
            
            <div className="card text-center p-8 bg-white/[0.03] border border-white/10">
              <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10">
                <Lightbulb size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Solve Real-World PS</h3>
              <p className="text-gray-400 text-sm">Work on problem statements from government ministries and industries — build solutions that make an impact.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="border-t border-white/10 py-12 bg-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-gray-500">
          <p>© 2026 Sri Indu Institute of Engineering and Technology. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
