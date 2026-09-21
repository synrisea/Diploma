using MediatR;

namespace Resonance.Connections.Application.Intents.CreateIntent;

public record CreateIntentCommand(Guid UserId, Guid PlaceId, DateOnly VisitDate, string? IntentTag) : IRequest<Guid>;
