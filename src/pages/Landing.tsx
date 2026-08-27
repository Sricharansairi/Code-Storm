import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowRight, Globe, Lightbulb, Download } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-black/40 backdrop-blur-xl border-b border-white/20 px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center sticky top-0 z-10 gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg sm:text-xl font-bold text-white">Code Storm 2026</h1>
        </div>
        <div className="flex gap-3 sm:gap-4 items-center">
          <button 
            onClick={() => navigate('/auth')} 
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Admin Auth
          </button>
          <button 
            onClick={() => navigate('/login')} 
            className="btn-secondary text-sm py-2 px-4"
          >
            Participant Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-xl md:text-2xl font-bold text-primary mb-2 tracking-widest uppercase">Code Storm 2026</h2>
        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6">
          Internal Hackathon for <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">SIH 2026</span>
        </h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed">
          Welcome to Code Storm 2026. The ultimate hackathon experience. Build innovative solutions, tackle real-world problems, and showcase your skills.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={() => navigate('/login')} 
              className="btn-primary flex items-center justify-center gap-2 text-lg px-8 py-4"
            >
              Exercise Options (Select PS) <ArrowRight size={20} />
            </button>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="btn-secondary flex items-center justify-center gap-2 text-lg px-8 py-4"
          >
            View Statements (Guest)
          </button>
        </div>
        <div className="flex justify-center mt-6">
          <button
            onClick={() => navigate('/details')}
            className="flex items-center justify-center gap-2 btn-secondary px-6 py-3"
          >
            <Download size={20} />
            Event Details & PPT Format
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            <div className="card text-center p-8">
              <div className="w-16 h-16 bg-purple-500/15 text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3 hover:rotate-6 transition-transform border border-purple-500/20">
                <Trophy size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">SIH 2026 Selection</h3>
              <p className="text-gray-300">Top performers get selected to represent SIIET at the national-level Smart India Hackathon 2026.</p>
            </div>
            
            <div className="card text-center p-8">
              <div className="w-16 h-16 bg-blue-500/15 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6 transform -rotate-3 hover:-rotate-6 transition-transform border border-blue-500/20">
                <Lightbulb size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Solve Real-World PS</h3>
              <p className="text-gray-300">Work on problem statements from government ministries and industries — build solutions that make an impact.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="border-t border-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            {/* Brand Section */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">Code Storm</h3>
                  <p className="text-gray-300 text-sm">By SIIET</p>
                </div>
              </div>
              <div className="flex gap-3 mb-10">
                <a
                  href="https://youtube.com/@sriinduinstitutions?si=uUWV936bB9_3Lby3"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-black/30 backdrop-blur-xl/[0.06] hover:bg-black/30 backdrop-blur-xl/[0.12] rounded-full flex items-center justify-center transition-colors border border-white/10"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>
                </a>
                <a
                  href="https://www.instagram.com/sri_indu_institutions?igsh=MWlseGx3dW5wMnBzZw=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-black/30 backdrop-blur-xl/[0.06] hover:bg-black/30 backdrop-blur-xl/[0.12] rounded-full flex items-center justify-center transition-colors border border-white/10"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                </a>
                <a
                  href="https://www.linkedin.com/company/sri-indu-institutions/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-black/30 backdrop-blur-xl/[0.06] hover:bg-black/30 backdrop-blur-xl/[0.12] rounded-full flex items-center justify-center transition-colors border border-white/10"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
                </a>
                <a
                  href="https://www.siiet.ac.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-black/30 backdrop-blur-xl/[0.06] hover:bg-black/30 backdrop-blur-xl/[0.12] rounded-full flex items-center justify-center transition-colors border border-white/10"
                >
                  <Globe size={18} className="text-gray-300" />
                </a>
              </div>

              {/* College Branding */}
              <div className="border-t border-gray-50 pt-8">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black tracking-tight" style={{color: '#e53e3e'}}>Sri Indu</h3>
                    <h4 className="text-base md:text-lg font-bold" style={{color: '#63b3ed'}}>Institute of Engineering &amp; Technology</h4>
                    <p className="text-sm font-semibold" style={{color: '#d69e2e'}}>UGC Autonomous Institution</p>
                    <p className="text-xs text-gray-300 mt-1">Approved by AICTE · Affiliated to JNTUH</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-3">
                <li><a href="#about" className="text-gray-300 hover:text-white transition-colors">About</a></li>
                <li><button onClick={() => navigate('/login')} className="text-gray-300 hover:text-white transition-colors">Problem Statements</button></li>
                <li><button onClick={() => navigate('/login')} className="text-gray-300 hover:text-white transition-colors">Register</button></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-3">
                <li><a href="mailto:codestorm@sriinduinstitute.com" className="text-gray-300 hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-50 pt-8">
            <p className="text-gray-300 text-sm text-left">
              © 2026 Code Storm — Sri Indu Institute of Engineering &amp; Technology. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
