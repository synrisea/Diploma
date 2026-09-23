using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Connections.Application.Common;
using Resonance.Connections.Application.Conversations.GetMessages;
using Resonance.Connections.Domain.Entities;

namespace Resonance.Connections.Application.Conversations.SendMessage;

public class SendMessageHandler : IRequestHandler<SendMessageCommand, SendMessageOutcome>
{
    private readonly IApplicationDbContext _context;
    private readonly IPushSender _pushSender;

    public SendMessageHandler(IApplicationDbContext context, IPushSender pushSender)
    {
        _context = context;
        _pushSender = pushSender;
    }

    public async Task<SendMessageOutcome> Handle(SendMessageCommand request, CancellationToken cancellationToken)
    {
        var conversation = await _context.Conversations
            .SingleOrDefaultAsync(c => c.Id == request.ConversationId, cancellationToken);

        if (conversation is null)
            return new SendMessageOutcome(SendMessageStatus.NotFound, null);

        if (!conversation.Includes(request.SenderId))
            return new SendMessageOutcome(SendMessageStatus.Forbidden, null);

        var otherUserId = conversation.OtherParticipant(request.SenderId);
        if (await BlockChecks.IsBlockedEitherWay(_context, request.SenderId, otherUserId, cancellationToken))
            return new SendMessageOutcome(SendMessageStatus.Blocked, null);

        var message = new Message(Guid.NewGuid(), request.ConversationId, request.SenderId, request.Body);
        _context.Messages.Add(message);
        await _context.SaveChangesAsync(cancellationToken);

        await MessagePushNotifier.NotifyRecipientAsync(
            _context, _pushSender, conversation.Id, request.SenderId, otherUserId, message.Body, cancellationToken);

        var dto = new MessageDto(message.Id, message.SenderId, message.Body, message.CreatedAt);
        return new SendMessageOutcome(SendMessageStatus.Sent, dto);
    }
}
