namespace Resonance.Feedback.Domain.Entities;

public class QuickFeedbackPhoto
{
    public Guid Id { get; private set; }
    public Guid QuickFeedbackId { get; private set; }
    public string Url { get; private set; } = null!;
    public int SortOrder { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private QuickFeedbackPhoto() {}

    public QuickFeedbackPhoto(Guid id, Guid quickFeedbackId, string url, int sortOrder)
    {
        if (quickFeedbackId == Guid.Empty)
            throw new ArgumentException("QuickFeedbackId is required.", nameof(quickFeedbackId));
        if (string.IsNullOrWhiteSpace(url))
            throw new ArgumentException("Url is required.", nameof(url));

        Id = id;
        QuickFeedbackId = quickFeedbackId;
        Url = url;
        SortOrder = sortOrder;
        CreatedAt = DateTime.UtcNow;
    }
}
