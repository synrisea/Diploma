using MediatR;

namespace Resonance.Feedback.Application.Feedback.GetComments;

public record GetCommentsForPlaceQuery(Guid PlaceId, int Limit) : IRequest<List<CommentDto>>;