namespace Resonance.Connections.Domain.Entities;

public class Conversation
{
    public Guid Id { get; private set; }
    public Guid UserAId { get; private set; }
    public Guid UserBId { get; private set; }
    public Guid? VisitIntentId { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private Conversation() {}

    public Conversation(Guid id, Guid userAId, Guid userBId, Guid? visitIntentId)
    {
        if (userAId == Guid.Empty || userBId == Guid.Empty)
            throw new ArgumentException("Both participants are required.");
        if (userAId == userBId)
            throw new ArgumentException("A conversation needs two different participants.");

        Id = id;
        UserAId = userAId < userBId ? userAId : userBId;
        UserBId = userAId < userBId ? userBId : userAId;
        VisitIntentId = visitIntentId;
        CreatedAt = DateTime.UtcNow;
    }

    public Guid OtherParticipant(Guid userId) => userId == UserAId ? UserBId : UserAId;

    public bool Includes(Guid userId) => userId == UserAId || userId == UserBId;
}
