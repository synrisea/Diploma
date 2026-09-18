using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Connections.Application.Common;
using Resonance.Connections.Domain.Entities;

namespace Resonance.Connections.Application.Blocks.CreateBlock;

public class CreateBlockHandler : IRequestHandler<CreateBlockCommand>
{
    private readonly IApplicationDbContext _context;

    public CreateBlockHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(CreateBlockCommand request, CancellationToken cancellationToken)
    {
        var alreadyBlocked = await _context.Blocks.AnyAsync(
            b => b.BlockerUserId == request.BlockerUserId && b.BlockedUserId == request.BlockedUserId,
            cancellationToken);

        if (alreadyBlocked) return;

        _context.Blocks.Add(new Block(Guid.NewGuid(), request.BlockerUserId, request.BlockedUserId));
        await _context.SaveChangesAsync(cancellationToken);
    }
}
