import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RedisService } from '@app/infra/redis';
import { WsAuthService } from './ws-auth.service';

interface ConnectedClient {
  userId: string;
  tenantId: string;
  activityIds: Set<string>;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class SeatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(SeatGateway.name);
  private clients = new Map<string, ConnectedClient>();

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly redis: RedisService,
    private readonly wsAuth: WsAuthService,
  ) {
    // Subscribe to Redis seat update events
    this.subscribeToSeatUpdates();
  }

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    if (!token) {
      client.disconnect();
      return;
    }

    const payload = this.wsAuth.verifyToken(token as string);
    if (!payload) {
      client.disconnect();
      return;
    }

    this.clients.set(client.id, {
      userId: payload.sub || payload.id,
      tenantId: payload.tenantId,
      activityIds: new Set(),
    });

    this.logger.log(`Client connected: ${client.id} (user=${payload.sub})`);
  }

  handleDisconnect(client: Socket) {
    this.clients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:activity')
  handleJoinActivity(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activityId: string },
  ) {
    const info = this.clients.get(client.id);
    if (!info) return;

    const room = `activity:${data.activityId}`;
    client.join(room);
    info.activityIds.add(data.activityId);

    this.logger.log(`Client ${client.id} joined activity room: ${data.activityId}`);
    return { event: 'joined', data: { activityId: data.activityId } };
  }

  @SubscribeMessage('leave:activity')
  handleLeaveActivity(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activityId: string },
  ) {
    const info = this.clients.get(client.id);
    if (!info) return;

    const room = `activity:${data.activityId}`;
    client.leave(room);
    info.activityIds.delete(data.activityId);

    return { event: 'left', data: { activityId: data.activityId } };
  }

  /**
   * Broadcast seat count update to all clients watching an activity
   */
  async broadcastSeatUpdate(activityId: string, data: { join_count: number; capacity: number; waitlist_count?: number }) {
    const room = `activity:${activityId}`;
    this.server.to(room).emit('seat:update', {
      activityId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast activity status change
   */
  broadcastActivityStatus(activityId: string, status: string) {
    const room = `activity:${activityId}`;
    this.server.to(room).emit('activity:status', {
      activityId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send notification to a specific user across all their connections
   */
  broadcastToUser(userId: string, event: string, data: any) {
    for (const [clientId, info] of this.clients.entries()) {
      if (info.userId === userId) {
        this.server.to(clientId).emit(event, data);
      }
    }
  }

  private async subscribeToSeatUpdates() {
    // Polling-based approach for Redis pub/sub alternative
    // In production, use Redis SUBSCRIBE on 'seat:update' channel
    setInterval(async () => {
      try {
        const message = await this.redis.get('ws:seat:update:queue');
        if (message) {
          const updates = JSON.parse(message);
          for (const update of updates) {
            await this.broadcastSeatUpdate(update.activityId, update);
          }
          await this.redis.del('ws:seat:update:queue');
        }
      } catch {
        // Silent fail for polling
      }
    }, 1000); // Check every second
  }
}
