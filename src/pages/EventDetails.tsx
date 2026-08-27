import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Download, FileText } from 'lucide-react';

export default function EventDetails() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-20">
      {/* Navigation */}
      <nav className="bg-black/40 backdrop-blur-xl border-b border-white/20 px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center sticky top-0 z-10 gap-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Back to Home
          </button>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-lg sm:text-xl font-bold text-white">Code Storm 2026</h1>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-12">
        
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Event <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">Details</span>
          </h2>
          <p className="text-lg text-gray-300">
            Internal Hackathon for Smart India Hackathon 2026
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Dates Card */}
          <div className="card p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-500/15 text-blue-400 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20">
              <Calendar size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Important Dates</h3>
            <div className="space-y-3 w-full">
              <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10 flex flex-col items-center justify-center gap-2 h-full">
                <span className="text-white font-bold text-lg md:text-xl text-center">31st Aug, 1st and 2nd September</span>
              </div>
            </div>
          </div>

          {/* Resources Card */}
          <div className="card p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-purple-500/15 text-purple-400 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/20">
              <FileText size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Resources</h3>
            <p className="text-gray-300 mb-8">
              Download the official Idea Presentation format required for the internal hackathon pitching round.
            </p>
            <a
              href="/SIH2026-IDEA-Presentation-Format.pptx"
              download
              className="btn-primary w-full flex items-center justify-center gap-2 text-lg py-4"
            >
              <Download size={24} />
              Download PPT Format
            </a>
          </div>

        </div>

      </div>
      
    </div>
  );
}
