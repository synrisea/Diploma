namespace Resonance.Connections.Domain.Entities;

public enum FriendRequestStatus
{
    Pending,
    Accepted,
    Declined,
}

public class FriendRequest
{
    public Guid Id { get; private set; }
    public Guid RequesterId { get; private set; }
    public Guid RecipientId { get; private set; }
    public FriendRequestStatus Status { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? RespondedAt { get; private set; }

    private FriendRequest() {}

    public FriendRequest(Guid id, Guid requesterId, Guid recipientId)
    {
        if (requesterId == Guid.Empty || recipientId == Guid.Empty)
            throw new ArgumentException("Both users are required.");
        if (requesterId == recipientId)
            throw new ArgumentException("Cannot send a friend request to yourself.");

        Id = id;
        RequesterId = requesterId;
        RecipientId = recipientId;
        Status = FriendRequestStatus.Pending;
        CreatedAt = DateTime.UtcNow;
    }

    public bool Involves(Guid userId) => userId == RequesterId || userId == RecipientId;

    public Guid OtherParticipant(Guid userId) => userId == RequesterId ? RecipientId : RequesterId;

    public void Accept()
    {
        Status = FriendRequestStatus.Accepted;
        RespondedAt = DateTime.UtcNow;
    }

    public void Decline()
    {
        Status = FriendRequestStatus.Declined;
        RespondedAt = DateTime.UtcNow;
    }
}
