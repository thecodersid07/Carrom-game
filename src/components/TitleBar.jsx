import { APP_SUBTITLE, APP_TITLE } from '../utils/constants';

function TitleBar() {
  return (
    <header className="title-bar">
      <div className="title-copy">
        <p className="eyebrow">Browser Carrom</p>
        <h1>{APP_TITLE}</h1>
        <p className="subtitle">{APP_SUBTITLE}</p>
      </div>
      <div className="title-badge">
        <span className="title-badge-label">Local Match</span>
        <strong>2 Players</strong>
      </div>
    </header>
  );
}

export default TitleBar;
