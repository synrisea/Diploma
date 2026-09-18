using MediatR;

namespace Resonance.Connections.Application.Conversations.GetConversations;

public record GetConversationsQuery(Guid CallerId) : IRequest<List<ConversationSummaryDto>>;
