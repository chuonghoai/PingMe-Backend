import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WebsocketsService } from '../websockets/websockets.service';
import { UsersService } from '../users/users.service';

/*  Function:
    - Request call: call_user
    - Response call: call_response
    - Exchange SDP Offer: webrtc_offer
    - Exchange SDP Answer: webrtc_answer
    - Exchange ICE Candidates: webrtc_ice_candidate
    - End call: end_call
*/
@WebSocketGateway({ cors: { origin: '*' } })
export class CallsGateway {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly websocketsService: WebsocketsService,
        private readonly usersService: UsersService,
    ) { }

    @SubscribeMessage('call_user')
    async handleCallUser(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { targetUserId: string; isVideoCall: boolean },
    ) {
        const callerId = client.data.userId;
        const targetSocketId = this.websocketsService.getSocketId(payload.targetUserId);

        if (targetSocketId) {
            const callerInfo = await this.usersService.findById(callerId);

            this.server.to(targetSocketId).emit('incoming_call', {
                callerId: callerId,
                fullname: callerInfo?.fullname || 'Người dùng ẩn danh',
                avatarUrl: callerInfo?.avatarUrl || '',
                isVideoCall: payload.isVideoCall,
            });
            console.log(`[Call/WebRTC] ${callerId} đang gọi cho ${payload.targetUserId} (Video: ${payload.isVideoCall})`);
        } else {
            client.emit('call_error', { message: 'Người dùng hiện không trực tuyến' });
        }
    }

    @SubscribeMessage('call_response')
    async handleCallResponse(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { targetUserId: string; accepted: boolean },
    ) {
        const responderId = client.data.userId;
        const targetSocketId = this.websocketsService.getSocketId(payload.targetUserId);

        if (targetSocketId) {
            this.server.to(targetSocketId).emit('call_response_received', {
                responderId: responderId,
                accepted: payload.accepted,
            });
        }
    }

    @SubscribeMessage('webrtc_offer')
    async handleWebrtcOffer(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { targetUserId: string; sdp: any },
    ) {
        const senderId = client.data.userId;
        const targetSocketId = this.websocketsService.getSocketId(payload.targetUserId);

        if (targetSocketId) {
            this.server.to(targetSocketId).emit('webrtc_offer_received', {
                senderId: senderId,
                sdp: payload.sdp,
            });
        }
    }

    @SubscribeMessage('webrtc_answer')
    async handleWebrtcAnswer(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { targetUserId: string; sdp: any },
    ) {
        const senderId = client.data.userId;
        const targetSocketId = this.websocketsService.getSocketId(payload.targetUserId);

        if (targetSocketId) {
            this.server.to(targetSocketId).emit('webrtc_answer_received', {
                senderId: senderId,
                sdp: payload.sdp,
            });
        }
    }

    @SubscribeMessage('webrtc_ice_candidate')
    async handleIceCandidate(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { targetUserId: string; candidate: any },
    ) {
        const senderId = client.data.userId;
        const targetSocketId = this.websocketsService.getSocketId(payload.targetUserId);

        if (targetSocketId) {
            this.server.to(targetSocketId).emit('webrtc_ice_candidate_received', {
                senderId: senderId,
                candidate: payload.candidate,
            });
        }
    }

    @SubscribeMessage('end_call')
    async handleEndCall(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { targetUserId: string },
    ) {
        const senderId = client.data.userId;
        const targetSocketId = this.websocketsService.getSocketId(payload.targetUserId);

        if (targetSocketId) {
            this.server.to(targetSocketId).emit('call_ended', {
                senderId: senderId,
            });
            console.log(`[Call/WebRTC] ${senderId} đã kết thúc cuộc gọi với ${payload.targetUserId}`);
        }
    }
}