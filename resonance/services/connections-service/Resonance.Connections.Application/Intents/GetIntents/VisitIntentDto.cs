namespace Resonance.Connections.Application.Intents.GetIntents;

public record VisitIntentDto(Guid Id, Guid UserId, Guid PlaceId, DateOnly VisitDate, string? IntentTag, DateTime CreatedAt, DateTime ExpiresAt);
