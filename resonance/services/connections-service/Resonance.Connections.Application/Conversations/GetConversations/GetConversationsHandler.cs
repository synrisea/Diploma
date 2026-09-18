using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Connections.Application.Common;

namespace Resonance.Connections.Application.Conversations.GetConversations;

public class GetConversationsHandler : IRequestHandler<GetConversationsQuery, List<ConversationSummaryDto>>
{
    private readonly IApplicationDbContext _context;

    public GetConversationsHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ConversationSummaryDto>> Handle(GetConversationsQuery request, CancellationToken cancellationToken)
    {
        var conversations = await _context.Conversations
            .Where(c => c.UserAId == request.CallerId || c.UserBId == request.CallerId)
            .ToListAsync(cancellationToken);

        var conversationIds = conversations.Select(c => c.Id).ToList();

        var messagesNewestFirst = await _context.Messages
            .Where(m => conversationIds.Contains(m.ConversationId))
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync(cancellationToken);

        var lastMessageByConversation = messagesNewestFirst
            .GroupBy(m => m.ConversationId)
            .ToDictionary(g => g.Key, g => g.First());

        return conversations
            .Select(c =>
            {
                var last = lastMessageByConversation.GetValueOrDefault(c.Id);
                return new ConversationSummaryDto(c.Id, c.OtherParticipant(request.CallerId), last?.Body, last?.CreatedAt);
            })
            .OrderByDescending(d => d.LastMessageAt ?? DateTime.MinValue)
            .ToList();
    }
}
