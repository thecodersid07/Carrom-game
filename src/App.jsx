import { useEffect, useState } from "react";
import TitleBar from "./components/TitleBar";
import GameBoard from "./game/GameBoard";
import "./styles/app.css";

function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    return window.localStorage.getItem("carrom-theme") ?? "light";
  });

  useEffect(() => {
    window.localStorage.setItem("carrom-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
  };

  return (
    <div className={`app-shell app-shell-${theme}`}>
      <div className="app-topbar">
        <TitleBar />
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? "Dark Mode" : "Light Mode"}
        </button>
      </div>
      <main className="app-main">
        <GameBoard />
      </main>
    </div>
  );
}

export default App;
