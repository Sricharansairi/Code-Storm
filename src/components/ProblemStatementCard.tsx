import { Code2, CheckCircle2, Circle, ExternalLink } from 'lucide-react';

export interface ProblemStatementProps {
  id: string;
  title: string;
  sponsor: string;
  description: string;
  categories: string[];
  currentTeams: number;
  maxTeams: number;
  onSelect: (id: string) => void;
  selected: boolean;
  know_more_link?: string;
}

export default function ProblemStatementCard({
  id,
  title,
  description,
  categories,
  currentTeams,
  maxTeams,
  onSelect,
  selected,
  know_more_link
}: ProblemStatementProps) {
  const isFull = currentTeams >= maxTeams;

  return (
    <div 
      className={`card flex flex-col h-full transition-all duration-300 ${
        selected 
          ? 'border-primary/50 shadow-[0_0_30px_rgba(124,107,196,0.2)] ring-1 ring-primary/30 scale-[1.01]' 
          : 'hover:border-white/15'
      }`}
    >
      <div className="p-6 flex flex-col h-full">
        <div className="flex justify-between items-start mb-4 gap-4">
          <div className="flex items-start gap-3">
            <div className={`mt-1 flex-shrink-0 ${selected ? 'text-primary' : 'text-gray-300'}`}>
              <Code2 size={20} />
            </div>
            <div>
              <span className={`text-lg font-bold tracking-wider ${isFull && !selected ? 'text-red-400/70' : 'text-gray-200'}`}>
                {id}
              </span>
              <h3 className={`text-lg font-bold mt-1 leading-tight  ${isFull && !selected ? 'text-gray-300' : 'text-white'}`}>
                {title}
              </h3>
            </div>
          </div>
          <span className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold border ${
            isFull 
              ? 'bg-red-500/15 text-red-400 border-red-500/25' 
              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
          }`}>
            {isFull ? 'FULL' : `${maxTeams - currentTeams} Slots Left`}
          </span>
        </div>
        
        <p className={`text-sm mb-4 flex-grow  leading-relaxed ${isFull && !selected ? 'text-gray-300' : 'text-gray-300'}`}>
          {description}
        </p>

        {know_more_link && (
          <div className="mb-6">
            <a 
              href={know_more_link} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-primary hover:text-purple-400 text-sm font-semibold transition-colors inline-flex items-center gap-1 border-b border-primary/30 hover:border-purple-400/50 pb-0.5"
            >
              Know More <ExternalLink size={14} />
            </a>
          </div>
        )}

        <div className="mt-auto space-y-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat, i) => (
              <span key={i} className="px-3 py-1 text-xs font-medium bg-black/30 backdrop-blur-xl text-gray-200 rounded-full border border-white/10">
                {cat}
              </span>
            ))}
          </div>
          
          <button 
            onClick={() => onSelect(id)}
            disabled={isFull && !selected}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all duration-300 ${
              selected 
                ? 'bg-primary text-white shadow-lg shadow-primary/30 border border-primary/40' 
                : isFull 
                  ? 'bg-black/30 backdrop-blur-xl text-gray-300 cursor-not-allowed border border-gray-50' 
                  : 'bg-black/30 backdrop-blur-xl border border-white/10 text-gray-200 hover:border-primary/40 hover:text-primary hover:bg-primary/10'
            }`}
          >
            {selected ? (
              <>
                <CheckCircle2 size={18} /> Selected
              </>
            ) : isFull ? (
              'No Spots Left'
            ) : (
              <>
                <Circle size={18} className="opacity-50" /> Select Statement
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
