using MediatR;
using Resonance.Feedback.Application.Common;
using Resonance.Feedback.Domain.Entities;

namespace Resonance.Feedback.Application.Feedback.Submit;

public class SubmitQuickFeedbackHandler : IRequestHandler<SubmitQuickFeedbackCommand, Guid>
{
    private readonly IApplicationDbContext _context;

    public SubmitQuickFeedbackHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(SubmitQuickFeedbackCommand request, CancellationToken cancellationToken)
    {
        var feedback = new QuickFeedback(Guid.NewGuid(), request.PlaceId, request.UserId, request.Comment);

        _context.QuickFeedbacks.Add(feedback);
        await _context.SaveChangesAsync(cancellationToken);

        return feedback.Id;        
    }
}