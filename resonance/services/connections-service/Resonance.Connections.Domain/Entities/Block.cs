namespace Resonance.Connections.Domain.Entities;

public class Block
{
    public Guid Id { get; private set; }
    public Guid BlockerUserId { get; private set; }
    public Guid BlockedUserId { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private Block() {}

    public Block(Guid id, Guid blockerUserId, Guid blockedUserId)
    {
        if (blockerUserId == Guid.Empty || blockedUserId == Guid.Empty)
            throw new ArgumentException("Both users are required.");
        if (blockerUserId == blockedUserId)
            throw new ArgumentException("Cannot block yourself.");

        Id = id;
        BlockerUserId = blockerUserId;
        BlockedUserId = blockedUserId;
        CreatedAt = DateTime.UtcNow;
    }
}
