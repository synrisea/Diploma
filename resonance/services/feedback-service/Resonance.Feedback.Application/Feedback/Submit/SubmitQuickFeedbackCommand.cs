using MediatR;

namespace Resonance.Feedback.Application.Feedback.Submit;

public record SubmitQuickFeedbackCommand(Guid PlaceId, Guid UserId, string Comment): IRequest<Guid>;
