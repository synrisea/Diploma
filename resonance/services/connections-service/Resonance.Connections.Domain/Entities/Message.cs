namespace Resonance.Connections.Domain.Entities;

public class Message
{
    public Guid Id { get; private set; }
    public Guid ConversationId { get; private set; }
    public Guid SenderId { get; private set; }
    public string Body { get; private set; } = null!;
    public DateTime CreatedAt { get; private set; }

    private Message() {}

    public Message(Guid id, Guid conversationId, Guid senderId, string body)
    {
        if (conversationId == Guid.Empty)
            throw new ArgumentException("ConversationId is required.", nameof(conversationId));
        if (senderId == Guid.Empty)
            throw new ArgumentException("SenderId is required.", nameof(senderId));
        if (string.IsNullOrWhiteSpace(body))
            throw new ArgumentException("Body is required.", nameof(body));

        Id = id;
        ConversationId = conversationId;
        SenderId = senderId;
        Body = body.Trim();
        CreatedAt = DateTime.UtcNow;
    }
}
