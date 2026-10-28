// Hermes Mock Server - Placeholder
// In a real implementation, this would serve fixtures from phase 1
// and simulate Hermes API endpoints for development and testing

import Fastify from 'fastify';
import { z } from 'zod';
import { AgentStateSchema, TeamSchema, WorldStateSchema } from '@crossing/shared';

const server = Fastify({
  logger: true
});

// Mock data
const mockAgents = [
  {
    id: 'agent_x',
    name: 'Agent X',
    profile: 'agent_x',
    role: 'lead',
    team: 'team_dev',
    state: 'working',
    since: Date.now() - 3600000,
    cause: null,
    taskId: 'task_123',
    targetAgentId: null
  }
];

const mockTeams = [
  {
    id: 'team_dev',
    name: 'Team Dev',
    color: '#30f5ff',
    managerId: 'agent_x',
    memberIds: ['agent_x']
  }
];

// Health check endpoint
server.get('/healthz', async (request, reply) => {
  return { status: 'ok', timestamp: Date.now() };
});

// World state endpoint
server.get('/api/world', async (request, reply) => {
  return {
    agents: mockAgents,
    teams: mockTeams,
    layoutSeed: 12345,
    capabilities: {
      chat: true,
      kanban: true,
      profiles: true,
      analytics: false,
      approvals: true
    }
  };
});

// Agent detail endpoint
server.get('/api/agents/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const agent = mockAgents.find(a => a.id === id);
  if (!agent) {
    return reply.status(404).send({ error: 'Agent not found' });
  }
  return agent;
});

// Kanban endpoints (simplified)
server.get('/api/kanban/boards', async (request, reply) => {
  return [
    { id: 'board_1', name: 'Development', tenant: null }
  ];
});

server.get('/api/kanban/tasks', async (request, reply) => {
  return [
    {
      id: 'task_123',
      title: 'Implement feature X',
      description: 'Description of the task',
      boardId: 'board_1',
      assigneeId: 'agent_x',
      priority: 'medium',
      status: 'todo',
      createdAt: Date.now() - 7200000,
      updatedAt: Date.now() - 3600000
    }
  ];
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8642');
    await server.listen({ port, host: '0.0.0.0' });
    server.log.info(`Hermes mock server listening on ${server.server.address()}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();