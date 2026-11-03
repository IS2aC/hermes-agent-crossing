import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { ActivityEvent, LocalTask, LocalTaskStatus } from '../domain/activity'
import type { RegistryView } from '../domain/registry'
import { api } from './api'
import { formatDate } from './labels'

const STATUS_LABELS: Record<LocalTaskStatus, string> = { todo: 'À faire', 'in-progress': 'En cours', done: 'Terminée' }

export function TasksPanel({ registry }: { registry: RegistryView }) {
  const [tasks, setTasks] = useState<LocalTask[]>([])
  const [title, setTitle] = useState('')
  const [filter, setFilter] = useState<'' | LocalTaskStatus>('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [history, setHistory] = useState<ActivityEvent[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setTasks(await api<LocalTask[]>('/tasks'))
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Tâches indisponibles')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!openId) return
    api<ActivityEvent[]>(`/events?taskId=${encodeURIComponent(openId)}&limit=50`).then(setHistory, () => setHistory([]))
  }, [openId, tasks])

  const run = async (action: () => Promise<unknown>) => {
    setError(null)
    try {
      await action()
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Action impossible')
    }
  }

  const create = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    void run(async () => {
      await api('/tasks', { method: 'POST', body: { title } })
      setTitle('')
    })
  }

  const visible = tasks.filter((task) => (!filter || task.status === filter) && (!assigneeFilter || task.assigneeId === assigneeFilter))

  return (
    <section aria-label="Tâches" data-testid="tasks">
      <h2>Tâches locales</h2>
      <p className="muted">Créées et suivies ici. Une tâche ne donne aucun ordre à un agent, et son état ne vient pas de Hermes.</p>
      <form className="chat-form" onSubmit={create}>
        <label htmlFor="task-title">Nouvelle tâche</label>
        <input id="task-title" maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} />
        <div className="approval-actions">
          <button type="submit" className="action" disabled={!title.trim()}>Ajouter</button>
        </div>
      </form>
      <div className="filters">
        <label>
          État
          <select value={filter} onChange={(event) => setFilter(event.target.value as '' | LocalTaskStatus)}>
            <option value="">Tous</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          Personnage
          <select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}>
            <option value="">Tous</option>
            {registry.characters.map((entry) => <option key={entry.profile.id} value={entry.profile.id}>{entry.profile.displayName}</option>)}
          </select>
        </label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {visible.length === 0 && !error && <p className="muted">Aucune tâche.</p>}
      <ul className="entries">
        {visible.map((task) => (
          <li key={task.id} data-testid="task">
            <button type="button" className="link" onClick={() => setOpenId(openId === task.id ? null : task.id)}>{task.title}</button>
            <span className="chip chip-source-application">Application</span>
            <label>
              État
              <select value={task.status} onChange={(event) => void run(() => api(`/tasks/${task.id}`, { method: 'PATCH', body: { status: event.target.value } }))}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              Personnage
              <select value={task.assigneeId ?? ''} onChange={(event) => void run(() => api(`/tasks/${task.id}`, { method: 'PATCH', body: { assigneeId: event.target.value || null } }))}>
                <option value="">Aucun</option>
                {registry.characters.map((entry) => <option key={entry.profile.id} value={entry.profile.id}>{entry.profile.displayName}</option>)}
              </select>
            </label>
            {openId === task.id && (
              <div data-testid="task-details">
                <p className="muted">Créée le {formatDate(task.createdAt)}, modifiée le {formatDate(task.updatedAt)}.</p>
                <ul className="task-history">
                  {history.map((event) => <li key={event.id}>{formatDate(event.occurredAt)} : {event.summary}</li>)}
                </ul>
                <button type="button" className="action" onClick={() => void run(() => api(`/tasks/${task.id}`, { method: 'DELETE' }))}>Supprimer</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
