using MediatR;

namespace Resonance.Connections.Application.Conversations.CreateConversation;

public record CreateConversationCommand(Guid CallerId, Guid RecipientId, string InitialMessage, Guid? VisitIntentId) : IRequest<Guid>;
