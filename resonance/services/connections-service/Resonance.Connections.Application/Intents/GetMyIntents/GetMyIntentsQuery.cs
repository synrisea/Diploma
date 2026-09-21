using MediatR;
using Resonance.Connections.Application.Intents.GetIntents;

namespace Resonance.Connections.Application.Intents.GetMyIntents;

public record GetMyIntentsQuery(Guid UserId) : IRequest<List<VisitIntentDto>>;
