import logo from '../assets/logo.svg'

function Header(): JSX.Element {
  return (
    <header className="header">
      <img className="header__logo" src={logo} alt="Celeste Downloader" />
      <div>
        <div className="header__title-row">
          <h1>Celeste Downloader</h1>
          <span className="header__version">V1.0.2</span>
        </div>
        <p className="header__subtitle">UI para librería yt-dlp de python</p>
      </div>
    </header>
  )
}

export default Header
