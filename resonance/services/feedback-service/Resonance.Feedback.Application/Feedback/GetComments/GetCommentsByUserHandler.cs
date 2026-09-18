using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Feedback.Application.Common;

namespace Resonance.Feedback.Application.Feedback.GetComments;

public class GetCommentsByUserHandler : IRequestHandler<GetCommentsByUserQuery, List<CommentDto>>
{
    private readonly IApplicationDbContext _context;

    public GetCommentsByUserHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<CommentDto>> Handle(GetCommentsByUserQuery request, CancellationToken cancellationToken)
    {
        var feedbacks = await _context.QuickFeedbacks
            .Where(f => f.UserId == request.UserId)
            .OrderByDescending(f => f.CreatedAt)
            .Take(request.Limit)
            .ToListAsync(cancellationToken);

        var feedbackIds = feedbacks.Select(f => f.Id).ToList();
        var photosByFeedbackId = await _context.QuickFeedbackPhotos
            .Where(p => feedbackIds.Contains(p.QuickFeedbackId))
            .OrderBy(p => p.SortOrder)
            .GroupBy(p => p.QuickFeedbackId)
            .ToDictionaryAsync(g => g.Key, g => (IReadOnlyList<string>)g.Select(p => p.Url).ToList(), cancellationToken);

        return feedbacks
            .Select(f => new CommentDto(
                f.Id, f.PlaceId, f.UserId, f.Comment, f.CreatedAt,
                photosByFeedbackId.GetValueOrDefault(f.Id, Array.Empty<string>())))
            .ToList();
    }
}
