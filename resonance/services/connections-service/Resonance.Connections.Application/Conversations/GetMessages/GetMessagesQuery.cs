using MediatR;

namespace Resonance.Connections.Application.Conversations.GetMessages;

public record GetMessagesQuery(Guid ConversationId, Guid CallerId) : IRequest<List<MessageDto>?>;
