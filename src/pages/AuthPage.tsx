import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

export default function AuthPage({ session }: { session: Session | null }) {
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      supabase.from('admins').select('email').eq('email', session.user.email).single().then(({ data }) => {
        if (data) navigate('/admin');
      });
    }
  }, [session, navigate]);

  const handleGoogleLogin = async () => {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth' }
    });
    if (error) setError(error.message);
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCode === 'INDUS') {
      if (!session) {
         setError("Unexpected error: You must be signed in.");
         return;
      }
      const { error: upsertError } = await supabase.from('admins').upsert({ email: session.user.email });
      if (upsertError) {
        setError(upsertError.message);
      } else {
        navigate('/admin');
      }
    } else {
      setError('Invalid master code.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden z-[1]">
      {/* Extra decorative glow */}
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full pointer-events-none" 
           style={{ background: 'radial-gradient(circle, rgba(124,107,196,0.15) 0%, transparent 70%)', filter: 'blur(80px)' }} />

      <div className="card max-w-md w-full space-y-8 relative border-t-2 border-t-primary/50">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/15 text-primary rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
             <ShieldCheck size={32} />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Master Auth</h2>
          <p className="mt-2 text-gray-300">
            Secure access to the Admin Panel
          </p>
        </div>
        
        <div className="space-y-6 mt-8">
          {!session ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-300 text-center">Step 1: Authenticate your identity</p>
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-black/30 backdrop-blur-xl/8 border border-white/15 text-white px-6 py-3 rounded-xl font-semibold hover:bg-black/30 backdrop-blur-xl/12 hover:border-white/25 transition-all duration-300 backdrop-blur-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>
            </div>
          ) : (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="bg-blue-500/10 text-blue-400 text-sm p-3 rounded-lg mb-4 text-center border border-blue-500/20">
                Signed in as <span className="font-semibold text-white">{session.user.email}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Step 2: Admin Passcode</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-300" />
                  </div>
                  <input
                    type="password"
                    required
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    className="w-full text-sm py-2 px-3 border border-white/20 rounded-lg block w-full pl-10 pr-3"
                    placeholder="Enter secret code"
                  />
                </div>
              </div>
              <button type="submit" className="w-full btn-primary py-3 rounded-xl">Grant Access</button>
            </form>
          )}

          {error && (
            <div className="p-4 text-sm rounded-lg border bg-red-500/10 border-red-500/25 text-red-400 text-center">
              {error}
            </div>
          )}

          <div className="text-center">
            <button onClick={() => navigate('/')} className="text-sm text-gray-300 hover:text-gray-200 underline">
              Return Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
