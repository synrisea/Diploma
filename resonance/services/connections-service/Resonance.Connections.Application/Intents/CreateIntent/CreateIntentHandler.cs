using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Connections.Application.Common;
using Resonance.Connections.Domain.Entities;

namespace Resonance.Connections.Application.Intents.CreateIntent;

public class CreateIntentHandler : IRequestHandler<CreateIntentCommand, Guid>
{
    private readonly IApplicationDbContext _context;

    public CreateIntentHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(CreateIntentCommand request, CancellationToken cancellationToken)
    {
        if (!TimeBuckets.IsValid(request.TimeBucket))
            throw new ArgumentException("Unknown time bucket.", nameof(request));

        var expiresAt = TimeBuckets.ComputeExpiresAt(request.TimeBucket, DateTime.UtcNow);

        var existing = await _context.VisitIntents
            .SingleOrDefaultAsync(i => i.UserId == request.UserId && i.PlaceId == request.PlaceId, cancellationToken);

        if (existing is not null)
        {
            existing.Update(request.TimeBucket, request.IntentTag, expiresAt);
            await _context.SaveChangesAsync(cancellationToken);
            return existing.Id;
        }

        var intent = new VisitIntent(Guid.NewGuid(), request.UserId, request.PlaceId, request.TimeBucket, request.IntentTag, expiresAt);
        _context.VisitIntents.Add(intent);
        await _context.SaveChangesAsync(cancellationToken);
        return intent.Id;
    }
}
