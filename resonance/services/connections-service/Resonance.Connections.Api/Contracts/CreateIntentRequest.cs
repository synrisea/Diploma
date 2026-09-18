namespace Resonance.Connections.Api.Contracts;

public record CreateIntentRequest(Guid PlaceId, string TimeBucket, string? IntentTag);
