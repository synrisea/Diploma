using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Connections.Application.Common;

namespace Resonance.Connections.Application.Conversations.MarkRead;

public class MarkConversationReadHandler : IRequestHandler<MarkConversationReadCommand>
{
    private readonly IApplicationDbContext _context;

    public MarkConversationReadHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(MarkConversationReadCommand request, CancellationToken cancellationToken)
    {
        var conversation = await _context.Conversations
            .SingleOrDefaultAsync(c => c.Id == request.ConversationId, cancellationToken);

        if (conversation is null || !conversation.Includes(request.UserId)) return;

        conversation.MarkRead(request.UserId, DateTime.UtcNow);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
