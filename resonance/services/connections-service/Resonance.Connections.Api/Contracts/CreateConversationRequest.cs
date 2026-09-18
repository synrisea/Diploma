namespace Resonance.Connections.Api.Contracts;

public record CreateConversationRequest(Guid RecipientUserId, string InitialMessage, Guid? VisitIntentId);
