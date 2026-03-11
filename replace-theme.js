import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const directory = path.join(__dirname, 'src', 'components');

const mappings = {
  // Backgrounds
  "bg-slate-950": "bg-slate-50 dark:bg-slate-950",
  "bg-\\\\[#050510\\\\]": "bg-slate-50 dark:bg-[#050510]",
  "bg-slate-900": "bg-white dark:bg-slate-900",
  "bg-slate-900/10": "bg-slate-200/50 dark:bg-slate-900/10",
  "bg-slate-900/40": "bg-white/80 dark:bg-slate-900/40",
  "bg-slate-900/50": "bg-white/90 dark:bg-slate-900/50",
  "bg-slate-800": "bg-slate-100 dark:bg-slate-800",
  "bg-slate-800/80": "bg-slate-100/80 dark:bg-slate-800/80",
  "bg-slate-700": "bg-slate-200 dark:bg-slate-700",
  "bg-\\\\[#1e1e1e\\\\]": "bg-slate-50 dark:bg-[#1e1e1e]",
  "bg-\\\\[#252526\\\\]": "bg-slate-200 dark:bg-[#252526]",

  // Text
  "text-white": "text-slate-900 dark:text-white",
  "text-slate-200": "text-slate-800 dark:text-slate-200",
  "text-slate-300": "text-slate-700 dark:text-slate-300",
  "text-slate-400": "text-slate-600 dark:text-slate-400",
  "text-slate-500": "text-slate-500 dark:text-slate-500",

  // Border
  "border-slate-800": "border-slate-300 dark:border-slate-800",
  "border-slate-700": "border-slate-300 dark:border-slate-700",
  "border-slate-600": "border-slate-400 dark:border-slate-600",
  "border-white/10": "border-black/10 dark:border-white/10",
  "border-white/20": "border-black/20 dark:border-white/20",
  
  // Dividers from Resizers
  "bg-slate-700/50": "bg-slate-300 dark:bg-slate-700/50"
};

fs.readdirSync(directory).forEach(file => {
  if (file.endsWith('.tsx') && file !== 'ThemeToggle.tsx') {
    const fullPath = path.join(directory, file);
    let content = fs.readFileSync(fullPath, 'utf8');

    // Mappings loop
    for (const [key, value] of Object.entries(mappings)) {
      const regex = new RegExp(`(?<=[\\s"'\\\`])(${key})(?=[\\s"'\\\`])`, 'g');
      content = content.replace(regex, value);
    }
    
    // Convert hardcoded hex
    content = content.replace(/(?<=[\\s"'\\\`])bg-\[\#0e0e1a\](?=[\\s"'\\\`])/g, "bg-white dark:bg-[#0e0e1a]");
    content = content.replace(/border-slate-800\/50/g, "border-slate-300 dark:border-slate-800/50");
    
    fs.writeFileSync(fullPath, content);
  }
});

console.log("Done adding dark/light mode prefixes.");
