namespace Resonance.Feedback.Domain.Entities;

public enum NoiseLevel { Quiet, Medium, Loud }
public enum WifiQuality { Poor, Good, Excellent }

public class QuickFeedback
{
    public Guid Id { get; private set; }
    public Guid PlaceId { get; private set; }
    public Guid UserId { get; private set; }
    public string Comment { get; private set; } = null!;
    public DateTime CreatedAt{ get; private set; }

    private QuickFeedback() {}

    public QuickFeedback(Guid id, Guid placeId, Guid userId, string comment)
    {
         if (placeId == Guid.Empty)
            throw new ArgumentException("PlaceId is required.", nameof(placeId));
        if (userId == Guid.Empty)
            throw new ArgumentException("UserId is required.", nameof(userId));
        if (string.IsNullOrWhiteSpace(comment))
            throw new ArgumentException("Comment is required.", nameof(comment));

        Id = id;
        PlaceId = placeId;
        UserId = userId;
        Comment = comment.Trim();
        CreatedAt = DateTime.UtcNow;
    }
}