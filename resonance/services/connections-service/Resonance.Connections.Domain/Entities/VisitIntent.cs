namespace Resonance.Connections.Domain.Entities;

public class VisitIntent
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public Guid PlaceId { get; private set; }
    public DateOnly VisitDate { get; private set; }
    public string? IntentTag { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime ExpiresAt { get; private set; }

    private VisitIntent() {}

    public VisitIntent(Guid id, Guid userId, Guid placeId, DateOnly visitDate, string? intentTag, DateTime expiresAt)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("UserId is required.", nameof(userId));
        if (placeId == Guid.Empty)
            throw new ArgumentException("PlaceId is required.", nameof(placeId));

        Id = id;
        UserId = userId;
        PlaceId = placeId;
        VisitDate = visitDate;
        IntentTag = string.IsNullOrWhiteSpace(intentTag) ? null : intentTag.Trim();
        CreatedAt = DateTime.UtcNow;
        ExpiresAt = expiresAt;
    }

    public void Update(DateOnly visitDate, string? intentTag, DateTime expiresAt)
    {
        VisitDate = visitDate;
        IntentTag = string.IsNullOrWhiteSpace(intentTag) ? null : intentTag.Trim();
        ExpiresAt = expiresAt;
    }
}
