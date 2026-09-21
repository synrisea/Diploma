using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Feedback.Application.Common;

namespace Resonance.Feedback.Application.Admin;

public record AdminCommentDto(
    Guid Id, Guid PlaceId, Guid UserId, string Comment, DateTime CreatedAt, bool IsHidden, IReadOnlyList<string> PhotoUrls);

public record SearchCommentsQuery(string? Text, Guid? PlaceId, Guid? UserId, bool IncludeHidden) : IRequest<List<AdminCommentDto>>;

public record SetCommentHiddenCommand(Guid CommentId, bool Hidden) : IRequest<bool>;

public class SearchCommentsHandler : IRequestHandler<SearchCommentsQuery, List<AdminCommentDto>>
{
    private const int Limit = 100;
    private readonly IApplicationDbContext _context;

    public SearchCommentsHandler(IApplicationDbContext context) => _context = context;

    public async Task<List<AdminCommentDto>> Handle(SearchCommentsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.QuickFeedbacks.AsQueryable();

        if (!request.IncludeHidden)
            query = query.Where(f => !f.IsHidden);
        if (request.PlaceId is not null)
            query = query.Where(f => f.PlaceId == request.PlaceId);
        if (request.UserId is not null)
            query = query.Where(f => f.UserId == request.UserId);
        if (!string.IsNullOrWhiteSpace(request.Text))
        {
            var text = request.Text.Trim().ToLower();
            query = query.Where(f => f.Comment.ToLower().Contains(text));
        }

        var comments = await query
            .OrderByDescending(f => f.CreatedAt)
            .Take(Limit)
            .ToListAsync(cancellationToken);

        var ids = comments.Select(c => c.Id).ToList();
        var photos = await _context.QuickFeedbackPhotos
            .Where(p => ids.Contains(p.QuickFeedbackId))
            .ToListAsync(cancellationToken);

        return comments
            .Select(c => new AdminCommentDto(
                c.Id, c.PlaceId, c.UserId, c.Comment, c.CreatedAt, c.IsHidden,
                photos.Where(p => p.QuickFeedbackId == c.Id).Select(p => p.Url).ToList()))
            .ToList();
    }
}

public class SetCommentHiddenHandler : IRequestHandler<SetCommentHiddenCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public SetCommentHiddenHandler(IApplicationDbContext context) => _context = context;

    public async Task<bool> Handle(SetCommentHiddenCommand request, CancellationToken cancellationToken)
    {
        var comment = await _context.QuickFeedbacks
            .SingleOrDefaultAsync(f => f.Id == request.CommentId, cancellationToken);

        if (comment is null) return false;

        if (request.Hidden) comment.Hide();
        else comment.Restore();

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
