import React from 'react';
import logo from "../assets/no-bg-white-logo.png";

interface LoadingOverlayProps {
  isVisible: boolean;
  message: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible, message }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative">
        {/* Glowing background effect */}
        <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
        
        {/* Spinning logo/loader */}
        <div className="relative">
          <img 
            src={logo} 
            alt="CodeIR Loading" 
            className="w-24 h-24 object-contain animate-float drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]"
          />
          <div className="absolute inset-x-0 -bottom-8 flex justify-center">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-16 text-center space-y-2">
        <h3 className="text-xl font-bold text-white tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
          {message}
        </h3>
        <p className="text-slate-400 text-sm font-medium animate-pulse">
          This may take a moment while our local AI processes your code...
        </p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
