using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Feedback.Application.Common;

namespace Resonance.Feedback.Application.Feedback.GetComments;

public class GetCommentsForPlaceHandler : IRequestHandler<GetCommentsForPlaceQuery, List<CommentDto>>
{
    private readonly IApplicationDbContext _context;

    public GetCommentsForPlaceHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<CommentDto>> Handle(GetCommentsForPlaceQuery request, CancellationToken cancellationToken)
    {
        return await _context.QuickFeedbacks
            .Where(f => f.PlaceId == request.PlaceId)
            .OrderByDescending(f => f.CreatedAt)
            .Take(request.Limit)
            .Select(f => new CommentDto(f.Id, f.PlaceId, f.Comment, f.CreatedAt))
            .ToListAsync(cancellationToken);
    }
}