import type { ActivityEvent } from '../../src/domain/activity'
import type { Store } from '../storage/store'

const RECENT_IDS = 5_000

/** Enregistre puis diffuse. Un événement déjà vu n'est ni réécrit, ni rediffusé. */
export class EventBus {
  private readonly recent = new Set<string>()
  private readonly listeners = new Set<(event: ActivityEvent) => void>()

  constructor(private readonly store: Store) {}

  subscribe(listener: (event: ActivityEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async publish(event: ActivityEvent): Promise<boolean> {
    if (this.recent.has(event.id)) return false
    this.remember(event.id)
    const inserted = await this.store.addEvent(event)
    if (!inserted) return false
    for (const listener of [...this.listeners]) listener(event)
    return true
  }

  private remember(id: string): void {
    this.recent.add(id)
    if (this.recent.size > RECENT_IDS) {
      const oldest = this.recent.values().next().value
      if (oldest !== undefined) this.recent.delete(oldest)
    }
  }
}
