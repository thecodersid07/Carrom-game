import TitleBar from './components/TitleBar';
import GameBoard from './game/GameBoard';
import './styles/app.css';

function App() {
  return (
    <div className="app-shell">
      <TitleBar />
      <main className="app-main">
        <GameBoard />
      </main>
    </div>
  );
}

export default App;
