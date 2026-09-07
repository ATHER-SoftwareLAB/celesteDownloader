interface HowToPageProps {
  onBack: () => void
}

function HowToPage({ onBack }: HowToPageProps): JSX.Element {
  return (
    <div className="info-page">
      <button type="button" className="info-page__back" onClick={onBack}>
        ← Volver
      </button>

      <h2>Cómo usar Celeste Downloader</h2>

      <section className="info-page__section">
        <h3>1. Pega la URL del video</h3>
        <p>
          Copia el enlace de un video de YouTube y pégalo en el campo de texto de la parte
          superior. Celeste obtiene automáticamente la miniatura, el título, el autor y la
          duración para que confirmes que es el video correcto.
        </p>
      </section>

      <section className="info-page__section">
        <h3>2. Elige el modo de descarga</h3>
        <p>
          <strong>Sencilla</strong> descarga con los valores recomendados: video en 1080p (o la
          mejor calidad disponible) o audio en la mejor calidad, sin opciones adicionales.
        </p>
        <p>
          <strong>Avanzada</strong> te deja elegir la calidad del video manualmente (1080p, 720p o
          480p) además del formato.
        </p>
      </section>

      <section className="info-page__section">
        <h3>3. Elige formato: Video o Audio</h3>
        <p>
          Selecciona si quieres guardar el video completo (MP4) o solo el audio (MP3). En modo
          avanzado también puedes ajustar la calidad del video.
        </p>
      </section>

      <section className="info-page__section">
        <h3>4. Confirma la carpeta de destino</h3>
        <p>
          La ruta de descarga se muestra debajo del preview. Usa el ícono de carpeta para elegir
          otra ubicación; Celeste recuerda tu elección para las próximas descargas.
        </p>
      </section>

      <section className="info-page__section">
        <h3>5. Descarga</h3>
        <p>
          Presiona <strong>Descargar</strong> y sigue el progreso en la barra. Puedes pegar otra
          URL mientras una descarga está en curso: se añadirá a la cola y se procesará en cuanto
          termine la actual.
        </p>
      </section>

      <section className="info-page__section">
        <h3>6. Cola de descargas</h3>
        <p>
          Las descargas se procesan una por una, en el orden en que se agregan. Puedes pausar y
          reanudar la cola en cualquier momento desde la sección de cola, sin perder tu lugar.
        </p>
      </section>

      <section className="info-page__section">
        <h3>7. Historial</h3>
        <p>
          Al finalizar cada descarga, aparece en la sección de historial con su título, formato y
          carpeta de destino. Este historial es solo de la sesión actual: se limpia al cerrar la
          aplicación.
        </p>
      </section>

      <section className="info-page__section">
        <h3>Consejos</h3>
        <ul>
          <li>Si un video falla, Celeste reintenta automáticamente antes de mostrar error.</li>
          <li>Los mensajes de error indican la causa (URL inválida, sin conexión, etc.).</li>
          <li>No se necesita cuenta ni conexión a servidores externos más allá de YouTube.</li>
        </ul>
      </section>
    </div>
  )
}

export default HowToPage
