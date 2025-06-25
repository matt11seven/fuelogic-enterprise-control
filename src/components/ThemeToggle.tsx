
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="glass-card border-slate-200/60 dark:border-slate-700"
      >
        <div className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="glass-card border-slate-200/60 dark:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-all duration-200"
      aria-label="Alternar tema"
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-amber-500" />
      ) : (
        <Moon className="w-4 h-4 text-slate-600" />
      )}
    </Button>
  );
}
