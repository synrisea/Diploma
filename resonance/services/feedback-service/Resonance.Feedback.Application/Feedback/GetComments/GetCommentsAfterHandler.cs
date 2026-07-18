using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Feedback.Application.Common;

namespace Resonance.Feedback.Application.Feedback.GetComments;

public class GetCommentsAfterHandler : IRequestHandler<GetCommentsAfterQuery, List<CommentDto>>
{
    private readonly IApplicationDbContext _context;

    public GetCommentsAfterHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<CommentDto>> Handle(GetCommentsAfterQuery request, CancellationToken cancellationToken)
    {
        var query = _context.QuickFeedbacks.AsQueryable();

        if (request.After is not null)
            query = query.Where(f => f.CreatedAt > request.After);

        return await query
            .OrderBy(f => f.CreatedAt)
            .Take(request.Limit)
            .Select(f => new CommentDto(f.Id, f.PlaceId, f.Comment, f.CreatedAt))
            .ToListAsync(cancellationToken);
    }
}