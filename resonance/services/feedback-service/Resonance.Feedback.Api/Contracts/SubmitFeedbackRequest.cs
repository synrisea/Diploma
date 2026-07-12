namespace Resonance.Feedback.Api.Contracts;

public record SubmitFeedbackRequest(Guid PlaceId, string Comment);
