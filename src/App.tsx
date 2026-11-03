import { OfficeCanvas } from './scene/OfficeCanvas'

export function App() {
  return (
    <main className="app">
      <p className="simulation-banner" role="status">
        Démonstration : données simulées. Aucun agent Hermes n'est connecté.
      </p>
      <OfficeCanvas />
      <p className="help">Flèches : se déplacer · Clic : aller à une case · + et − : zoom · 0 : ajuster</p>
    </main>
  )
}
