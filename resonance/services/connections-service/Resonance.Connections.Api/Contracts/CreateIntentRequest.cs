namespace Resonance.Connections.Api.Contracts;

public record CreateIntentRequest(Guid PlaceId, DateOnly VisitDate, string? IntentTag);
