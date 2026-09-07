import { FormEvent, useState } from 'react'

interface UrlInputProps {
  onSubmit: (url: string) => void
  loading: boolean
}

function UrlInput({ onSubmit, loading }: UrlInputProps): JSX.Element {
  const [url, setUrl] = useState('')

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault()
    if (url.trim()) onSubmit(url.trim())
  }

  return (
    <form className="url-input" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Pega un enlace de YouTube..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={loading}
      />
      <button type="submit" disabled={loading || !url.trim()}>
        {loading ? 'Buscando...' : 'Obtener info'}
      </button>
    </form>
  )
}

export default UrlInput
