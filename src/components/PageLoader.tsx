const PageLoader = ({ message = "Loading..." }: { message?: string }) => {
  return (
    <div className="flex items-center justify-center h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
        <p className="text-emerald-400/80 tracking-widest text-sm font-bold uppercase">
          {message}
        </p>
      </div>
    </div>
  );
};

export default PageLoader;
