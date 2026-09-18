using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Connections.Application.Common;

namespace Resonance.Connections.Application.Intents.DeleteIntent;

public class DeleteIntentHandler : IRequestHandler<DeleteIntentCommand>
{
    private readonly IApplicationDbContext _context;

    public DeleteIntentHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(DeleteIntentCommand request, CancellationToken cancellationToken)
    {
        var intent = await _context.VisitIntents
            .SingleOrDefaultAsync(i => i.Id == request.IntentId && i.UserId == request.CallerUserId, cancellationToken);

        if (intent is null) return;

        _context.VisitIntents.Remove(intent);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
