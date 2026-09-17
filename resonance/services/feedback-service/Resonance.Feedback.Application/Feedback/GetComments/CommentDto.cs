namespace Resonance.Feedback.Application.Feedback.GetComments;

public record CommentDto(Guid Id, Guid PlaceId, Guid UserId, string Comment, DateTime CreatedAt, IReadOnlyList<string> PhotoUrls);