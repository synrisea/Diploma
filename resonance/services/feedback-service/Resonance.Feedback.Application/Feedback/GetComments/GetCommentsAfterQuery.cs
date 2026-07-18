using MediatR;

namespace Resonance.Feedback.Application.Feedback.GetComments;

public record GetCommentsAfterQuery(DateTime? After, int Limit) : IRequest<List<CommentDto>>;
