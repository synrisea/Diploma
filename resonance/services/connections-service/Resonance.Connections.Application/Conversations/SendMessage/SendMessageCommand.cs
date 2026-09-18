using MediatR;
using Resonance.Connections.Application.Conversations.GetMessages;

namespace Resonance.Connections.Application.Conversations.SendMessage;

public record SendMessageCommand(Guid ConversationId, Guid SenderId, string Body) : IRequest<SendMessageOutcome>;

public enum SendMessageStatus { Sent, NotFound, Forbidden, Blocked }

public record SendMessageOutcome(SendMessageStatus Status, MessageDto? Message);
