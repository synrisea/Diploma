using MediatR;

namespace Resonance.Connections.Application.Intents.GetIntents;

public record GetIntentsForPlaceQuery(Guid PlaceId, Guid CallerId) : IRequest<List<VisitIntentDto>>;
