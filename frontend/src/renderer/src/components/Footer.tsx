interface FooterProps {
  onAboutClick: () => void
  onHowToClick: () => void
}

function Footer({ onAboutClick, onHowToClick }: FooterProps): JSX.Element {
  return (
    <footer className="footer">
      Copyright ATHERSoftwareLAB 2026 ·{' '}
      <button type="button" className="footer__link" onClick={onAboutClick}>
        Acerca de
      </button>{' '}
      ·{' '}
      <button type="button" className="footer__link" onClick={onHowToClick}>
        Cómo usar
      </button>
    </footer>
  )
}

export default Footer
