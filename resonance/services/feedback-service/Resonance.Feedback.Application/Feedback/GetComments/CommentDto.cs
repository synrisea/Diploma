namespace Resonance.Feedback.Application.Feedback.GetComments;

public record CommentDto(Guid Id, Guid PlaceId, string Comment, DateTime CreatedAt);