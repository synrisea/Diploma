using MediatR;

namespace Resonance.Connections.Application.Conversations.MarkRead;

public record MarkConversationReadCommand(Guid ConversationId, Guid UserId) : IRequest;
