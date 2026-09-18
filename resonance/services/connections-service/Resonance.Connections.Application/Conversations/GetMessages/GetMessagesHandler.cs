using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Connections.Application.Common;

namespace Resonance.Connections.Application.Conversations.GetMessages;

public class GetMessagesHandler : IRequestHandler<GetMessagesQuery, List<MessageDto>?>
{
    private readonly IApplicationDbContext _context;

    public GetMessagesHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<MessageDto>?> Handle(GetMessagesQuery request, CancellationToken cancellationToken)
    {
        var conversation = await _context.Conversations
            .SingleOrDefaultAsync(c => c.Id == request.ConversationId, cancellationToken);

        if (conversation is null || !conversation.Includes(request.CallerId)) return null;

        return await _context.Messages
            .Where(m => m.ConversationId == request.ConversationId)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new MessageDto(m.Id, m.SenderId, m.Body, m.CreatedAt))
            .ToListAsync(cancellationToken);
    }
}
