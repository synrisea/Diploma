using MediatR;

namespace Resonance.Connections.Application.Intents.CreateIntent;

public record CreateIntentCommand(Guid UserId, Guid PlaceId, string TimeBucket, string? IntentTag) : IRequest<Guid>;
