import logo from '../assets/logo.svg'

interface AboutPageProps {
  onBack: () => void
}

function AboutPage({ onBack }: AboutPageProps): JSX.Element {
  return (
    <div className="info-page">
      <button type="button" className="info-page__back" onClick={onBack}>
        ← Volver
      </button>

      <div className="info-page__hero">
        <img className="info-page__logo" src={logo} alt="Celeste Downloader" />
        <div>
          <h2>Celeste Downloader</h2>
          <p className="info-page__version">Versión 1.0.2</p>
        </div>
      </div>

      <section className="info-page__section">
        <h3>Qué es</h3>
        <p>
          Celeste Downloader es una aplicación de escritorio que permite descargar videos y audio
          de YouTube sin usar la terminal. Es una alternativa gráfica a <code>yt-dlp</code>,
          pensada para ser simple, rápida y transparente.
        </p>
      </section>

      <section className="info-page__section">
        <h3>Principios</h3>
        <ul>
          <li>
            <strong>Transparencia radical</strong> — sin telemetría, sin analytics, sin anuncios y
            sin conexiones ocultas. Todo lo que la app hace es visible para el usuario.
          </li>
          <li>
            <strong>Minimalismo funcional</strong> — solo se muestra lo necesario, con valores por
            defecto sensatos para no requerir configuración.
          </li>
          <li>
            <strong>Facilidad de uso</strong> — pensada para que cualquier persona pueda descargar
            su primer video en menos de 2 minutos, sin manual.
          </li>
        </ul>
      </section>

      <section className="info-page__section">
        <h3>Tecnología</h3>
        <p>
          Construida con Electron, React y TypeScript en el frontend, y Python + FastAPI en el
          backend. Las descargas se procesan con <code>yt-dlp</code> y <code>ffmpeg</code>.
        </p>
      </section>

      <section className="info-page__section">
        <h3>Licencia y créditos</h3>
        <p>
          Celeste Downloader se distribuye bajo licencia MIT. Utiliza <code>yt-dlp</code> (licencia
          GPL v3) y <code>ffmpeg</code> (licencia LGPL) como motores de descarga y conversión. El
          usuario es responsable de respetar los derechos de autor del contenido que descarga.
        </p>
        <p className="info-page__muted">Desarrollado por ATHERSoftwareLAB.</p>
      </section>
    </div>
  )
}

export default AboutPage
