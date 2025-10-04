
export function LoadingScreen() {
  return (
    <>
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50 overflow-hidden">
        {/* Subtle Background: Faint Orange Grid */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(251, 146, 60, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(251, 146, 60, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Core Animation: Wavy Loading Bar */}
        <div className="relative w-96 h-24 flex items-center justify-center">
          <svg
            className="w-full h-full"
            viewBox="0 0 400 100"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
            </defs>
            {/* Background Wave Path */}
            <path
              d="M0,50 Q100,0 200,50 T400,50 L400,100 L0,100 Z"
              fill="rgba(251, 146, 60, 0.1)"
              className="animate-wave-shift"
            />
            {/* Animated Foreground Wave */}
            <path
              d="M0,50 Q100,100 200,50 T400,50 L400,100 L0,100 Z"
              fill="url(#waveGradient)"
              className="animate-wave-progress"
            />
          </svg>
        </div>

        {/* Central POS Marker */}
        <div className="absolute w-16 h-16 bg-white border-4 border-orange-400 rounded-full flex items-center justify-center text-lg font-bold text-orange-600 shadow-lg animate-pos-bob">
          POS
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes wave-shift {
              0% { transform: translateX(0); }
              100% { transform: translateX(100px); }
            }
            @keyframes wave-progress {
              0% { 
                d: path('M0,50 Q100,100 200,50 T400,50 L400,100 L0,100 Z');
                opacity: 0;
              }
              50% { 
                d: path('M0,50 Q100,0 200,50 T400,50 L400,100 L0,100 Z');
                opacity: 1;
              }
              100% { 
                d: path('M0,50 Q100,100 200,50 T400,50 L400,100 L0,100 Z');
                opacity: 0;
              }
            }
            @keyframes pos-bob {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
            .animate-wave-shift { animation: wave-shift 4s linear infinite; }
            .animate-wave-progress { animation: wave-progress 2s ease-in-out infinite; }
            .animate-pos-bob { animation: pos-bob 1.5s ease-in-out infinite; }
          `
        }}
      />
    </>
  );
}