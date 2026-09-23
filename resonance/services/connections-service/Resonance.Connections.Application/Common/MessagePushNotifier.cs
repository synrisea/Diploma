using Microsoft.EntityFrameworkCore;

namespace Resonance.Connections.Application.Common;

public static class MessagePushNotifier
{
    private const int PreviewLength = 140;

    public static async Task NotifyRecipientAsync(
        IApplicationDbContext context,
        IPushSender pushSender,
        Guid conversationId,
        Guid senderId,
        Guid recipientId,
        string body,
        CancellationToken cancellationToken)
    {
        if (recipientId == senderId) return;

        var tokens = await context.DeviceTokens
            .Where(t => t.UserId == recipientId)
            .Select(t => t.Token)
            .ToListAsync(cancellationToken);

        if (tokens.Count == 0) return;

        var preview = body.Length > PreviewLength ? body[..PreviewLength] + "…" : body;
        var data = new Dictionary<string, string>
        {
            ["conversationId"] = conversationId.ToString(),
            ["with"] = senderId.ToString(),
        };

        await pushSender.SendAsync(tokens, new PushMessage("New message", preview, data), cancellationToken);
    }
}
