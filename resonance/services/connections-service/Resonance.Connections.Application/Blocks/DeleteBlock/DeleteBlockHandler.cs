using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Connections.Application.Common;

namespace Resonance.Connections.Application.Blocks.DeleteBlock;

public class DeleteBlockHandler : IRequestHandler<DeleteBlockCommand>
{
    private readonly IApplicationDbContext _context;

    public DeleteBlockHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(DeleteBlockCommand request, CancellationToken cancellationToken)
    {
        var block = await _context.Blocks.SingleOrDefaultAsync(
            b => b.BlockerUserId == request.BlockerUserId && b.BlockedUserId == request.BlockedUserId,
            cancellationToken);

        if (block is null) return;

        _context.Blocks.Remove(block);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
