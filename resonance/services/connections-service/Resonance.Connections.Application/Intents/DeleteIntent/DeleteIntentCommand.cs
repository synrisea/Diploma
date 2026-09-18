using MediatR;

namespace Resonance.Connections.Application.Intents.DeleteIntent;

public record DeleteIntentCommand(Guid IntentId, Guid CallerUserId) : IRequest;
