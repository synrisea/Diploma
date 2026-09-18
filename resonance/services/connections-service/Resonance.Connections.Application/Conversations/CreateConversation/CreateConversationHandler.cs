using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Connections.Application.Common;
using Resonance.Connections.Domain.Entities;

namespace Resonance.Connections.Application.Conversations.CreateConversation;

public class CreateConversationHandler : IRequestHandler<CreateConversationCommand, Guid>
{
    private readonly IApplicationDbContext _context;

    public CreateConversationHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(CreateConversationCommand request, CancellationToken cancellationToken)
    {
        if (request.CallerId == request.RecipientId)
            throw new ArgumentException("Cannot start a conversation with yourself.");

        if (await BlockChecks.IsBlockedEitherWay(_context, request.CallerId, request.RecipientId, cancellationToken))
            throw new InvalidOperationException("Messaging isn't available between these two accounts.");

        var userAId = request.CallerId < request.RecipientId ? request.CallerId : request.RecipientId;
        var userBId = request.CallerId < request.RecipientId ? request.RecipientId : request.CallerId;

        var conversation = await _context.Conversations
            .SingleOrDefaultAsync(c => c.UserAId == userAId && c.UserBId == userBId, cancellationToken);

        if (conversation is null)
        {
            conversation = new Conversation(Guid.NewGuid(), request.CallerId, request.RecipientId, request.VisitIntentId);
            _context.Conversations.Add(conversation);
        }

        var message = new Message(Guid.NewGuid(), conversation.Id, request.CallerId, request.InitialMessage);
        _context.Messages.Add(message);

        await _context.SaveChangesAsync(cancellationToken);
        return conversation.Id;
    }
}
