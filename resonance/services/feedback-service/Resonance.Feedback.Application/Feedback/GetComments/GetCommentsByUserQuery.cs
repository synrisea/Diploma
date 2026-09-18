using MediatR;

namespace Resonance.Feedback.Application.Feedback.GetComments;

public record GetCommentsByUserQuery(Guid UserId, int Limit) : IRequest<List<CommentDto>>;
