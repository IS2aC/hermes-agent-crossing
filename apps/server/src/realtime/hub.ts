interface SocketLike { readyState: number; send(data: string): void; on(event: 'close', listener: () => void): void }
export class RealtimeHub {
  #clients = new Set<SocketLike>();
  #snapshot: unknown = { agents: [], world: {} };
  add(client: SocketLike): void {
    this.#clients.add(client);
    client.send(JSON.stringify({ type: 'snapshot', data: this.#snapshot, timestamp: new Date().toISOString() }));
    client.on('close', () => this.#clients.delete(client));
  }
  setSnapshot(snapshot: unknown): void { this.#snapshot = snapshot; }
  publish(type: string, data: unknown): void {
    const event = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
    for (const client of this.#clients) if (client.readyState === 1) client.send(event);
  }
  get size(): number { return this.#clients.size; }
}
